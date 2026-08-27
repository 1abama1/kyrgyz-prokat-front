import { useCallback, useState } from 'react';
import { db } from '../db/db';
import { syncManager } from '../db/syncManager';
import type { LocalContract } from '../db/db';

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

export interface MutationState {
    isLoading: boolean;
    error: Error | null;
}

type ContractCreationData = Pick<
    LocalContract,
    'clientId' | 'toolId' | 'startDateTime' | 'status'
> & Partial<Omit<LocalContract, 'offlineId' | 'syncStatus' | 'updatedAt'>>;

// ─────────────────────────────────────────────────────────────────────────────
// useOfflineMutation — транзакционные мутации с автоматической постановкой в очередь
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Хук для мутаций договоров с Offline-First поддержкой.
 * Каждая операция: запись в Dexie + добавление в syncQueueV2 — в одной транзакции.
 */
export function useOfflineMutation() {
    const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

    const setLoading = (isLoading: boolean) =>
        setState(s => ({ ...s, isLoading }));

    const setError = (error: Error | null) =>
        setState(s => ({ ...s, error }));

    // ── CREATE ────────────────────────────────────────────────────────────────

    const createContract = useCallback(async (data: ContractCreationData): Promise<LocalContract> => {
        setLoading(true);
        setError(null);
        try {
            const offlineId = crypto.randomUUID();
            const now = Date.now();

            const entity: LocalContract = {
                ...data,
                offlineId,
                clientId: data.clientId,
                toolId: data.toolId,
                startDateTime: data.startDateTime,
                status: data.status ?? 'ACTIVE',
                syncStatus: 'pending',
                updatedAt: now,
            };

            // Атомарная транзакция: сущность + очередь
            await db.transaction('rw', [db.contracts, db.syncQueueV2], async () => {
                await db.contracts.add(entity);
                await syncManager.enqueueV2({
                    operation: 'create',
                    entityTable: 'contracts',
                    entityId: offlineId,
                    payload: entity,
                    endpoint: '/api/admin/contracts/create',
                    method: 'POST',
                });
            });

            return entity;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // ── UPDATE ────────────────────────────────────────────────────────────────

    const updateContract = useCallback(async (
        offlineId: string,
        patch: Partial<Omit<LocalContract, 'offlineId' | 'syncStatus' | 'updatedAt'>>
    ): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const existing = await db.contracts.get(offlineId);
            if (!existing) throw new Error(`Contract ${offlineId} not found`);

            const now = Date.now();
            const updated: Partial<LocalContract> = { ...patch, syncStatus: 'pending', updatedAt: now };

            await db.transaction('rw', [db.contracts, db.syncQueueV2], async () => {
                await db.contracts.update(offlineId, updated);
                await syncManager.enqueueV2({
                    operation: 'update',
                    entityTable: 'contracts',
                    entityId: offlineId,
                    payload: { ...existing, ...updated },
                    endpoint: existing.id
                        ? `/api/admin/contracts/${existing.id}`
                        : `/api/admin/contracts/offline/${offlineId}`,
                    method: 'PUT',
                });
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // ── CLOSE ─────────────────────────────────────────────────────────────────

    const closeContract = useCallback(async (
        offlineId: string,
        payload?: { paidAmount?: number; comment?: string; isBroken?: boolean; actualReturnDate?: string }
    ): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const existing = await db.contracts.get(offlineId);
            if (!existing) throw new Error(`Contract ${offlineId} not found`);

            const now = Date.now();

            await db.transaction('rw', [db.contracts, db.syncQueueV2], async () => {
                await db.contracts.update(offlineId, {
                    status: 'CLOSED',
                    syncStatus: 'pending',
                    updatedAt: now,
                    amount: payload?.paidAmount ?? existing.amount,
                    comment: payload?.comment ?? existing.comment,
                    returnDate: payload?.actualReturnDate ?? existing.returnDate,
                });
                await syncManager.enqueueV2({
                    operation: 'close',
                    entityTable: 'contracts',
                    entityId: offlineId,
                    payload: { ...payload, id: existing.id },
                    endpoint: existing.id
                        ? `/api/admin/contracts/${existing.id}/close`
                        : `/api/admin/contracts/offline/${offlineId}/close`,
                    method: 'POST',
                });
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        createContract,
        updateContract,
        closeContract,
        state,
    };
}
