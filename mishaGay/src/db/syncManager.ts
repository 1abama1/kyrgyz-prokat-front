import { db } from './db';
import { api } from '../api/axios';
import { networkStore } from '../store/networkStore';
import type { SyncQueueItemV2, SyncQueueStatus } from './db';

// ─────────────────────────────────────────────────────────────────────────────
// Конфигурация
// ─────────────────────────────────────────────────────────────────────────────

const RETRY_CONFIG = {
    BASE_DELAY_MS: 1_000,
    MAX_DELAY_MS: 5 * 60 * 1_000,  // 5 минут
    MAX_RETRIES: 5,
    SYNC_INTERVAL_MS: 60_000,       // pull каждые 60 сек
} as const;

function calcNextRetryAt(retryCount: number): number {
    const delay = Math.min(
        RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, retryCount),
        RETRY_CONFIG.MAX_DELAY_MS,
    );
    // Jitter ±15% — предотвращает thundering herd
    const jitter = delay * 0.15 * (Math.random() * 2 - 1);
    return Date.now() + delay + jitter;
}

function isRetryableHttpStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

// ─────────────────────────────────────────────────────────────────────────────
// Публичный статус синхронизации (для хуков / SyncStatus компонента)
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncManagerState {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
    lastSyncAt: number | null;
    lastError: string | null;
}

type StateListener = (state: SyncManagerState) => void;

// ─────────────────────────────────────────────────────────────────────────────
// SyncManager
// ─────────────────────────────────────────────────────────────────────────────

class SyncManager {
    private isSyncing = false;
    private pullTimer: ReturnType<typeof setInterval> | null = null;

    private state: SyncManagerState = {
        isOnline: !networkStore.isOffline,
        isSyncing: false,
        pendingCount: 0,
        failedCount: 0,
        lastSyncAt: null,
        lastError: null,
    };
    private listeners = new Set<StateListener>();

    constructor() {
        // ── Подписки на сетевые события ─────────────────────────────────────
        window.addEventListener('online', this.handleNetworkChange);
        window.addEventListener('offline', this.handleNetworkChange);

        // ── Подписка на ручной toggle offline-режима ─────────────────────────
        networkStore.subscribe(() => {
            this.updateState({ isOnline: !networkStore.isOffline });
            if (!networkStore.isOffline) {
                void this.sync();
            }
        });

        // ── Первоначальный запуск ─────────────────────────────────────────────
        void this.sync();
        this.startPullInterval();
    }

    // ── Публичный API ─────────────────────────────────────────────────────────

    /** Форсированный запуск синхронизации (кнопка "Синк" в UI) */
    async syncNow(): Promise<void> {
        return this.sync();
    }

    /** Подписка на изменения состояния. Возвращает функцию отписки. */
    subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getState(): SyncManagerState {
        return this.state;
    }

    // ── Legacy enqueue (обратная совместимость) ───────────────────────────────

    async enqueueCreation(payload: any, offlineId: string): Promise<void> {
        await db.syncQueue.add({
            type: 'CREATE_CONTRACT',
            payload,
            offlineId,
            createdAt: Date.now()
        });
        void this.sync();
    }

    async enqueueUpdate(id: number | undefined, offlineId: string, payload: any): Promise<void> {
        await db.syncQueue.add({
            type: 'UPDATE_CONTRACT',
            payload: { ...payload, id },
            offlineId,
            createdAt: Date.now()
        });
        void this.sync();
    }

    async enqueueClosure(id: number | undefined, offlineId: string, payload: any): Promise<void> {
        await db.syncQueue.add({
            type: 'CLOSE_CONTRACT',
            payload: { ...payload, id },
            offlineId,
            createdAt: Date.now()
        });
        void this.sync();
    }

    // ── V2 enqueue с retry-поддержкой ────────────────────────────────────────

    /**
     * Добавить операцию в расширенную очередь syncQueueV2.
     * Вызывать ВНУТРИ транзакции Dexie вместе с основной мутацией сущности.
     */
    async enqueueV2(
        item: Omit<SyncQueueItemV2, 'id' | 'createdAt' | 'retryCount' | 'nextRetryAt' | 'status'>
    ): Promise<string> {
        const id = crypto.randomUUID();
        const queueItem: SyncQueueItemV2 = {
            ...item,
            id,
            createdAt: Date.now(),
            retryCount: 0,
            nextRetryAt: Date.now(),
            status: 'pending',
        };
        await db.syncQueueV2.add(queueItem);
        void this.sync();
        return id;
    }

    // ── Основной цикл ─────────────────────────────────────────────────────────

    async sync(): Promise<void> {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;
        this.updateState({ isSyncing: true, lastError: null });

        try {
            await this.pushLegacyQueue();
            await this.pushV2Queue();
            await this.pull();

            await this.refreshCounts();
            this.updateState({ lastSyncAt: Date.now() });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('[SyncManager] Sync cycle error:', msg);
            this.updateState({ lastError: msg });
        } finally {
            this.isSyncing = false;
            this.updateState({ isSyncing: false });
        }
    }

    // ── Legacy push ───────────────────────────────────────────────────────────

    private async pushLegacyQueue(): Promise<void> {
        let queue = await db.syncQueue.toArray();

        // 🔍 Проверяем локальные договоры, которые еще не имеют ID на сервере
        const pendingContracts = await db.contracts.filter(c => c.syncStatus === 'pending' || !c.id).toArray();
        for (const c of pendingContracts) {
            const alreadyInQueue = queue.some(q => q.offlineId === c.offlineId);
            if (!alreadyInQueue && c.offlineId) {
                const item = {
                    type: 'CREATE_CONTRACT' as const,
                    payload: {
                        clientId: c.clientId,
                        toolId: c.toolId,
                        toolIds: c.toolId ? [c.toolId] : [],
                        contractNumber: c.contractNumber
                    },
                    offlineId: c.offlineId,
                    createdAt: c.updatedAt || Date.now()
                };
                const id = await db.syncQueue.add(item);
                queue.push({ ...item, id });
            }
        }

        if (queue.length === 0) return;

        console.log(`[SyncManager] Legacy push: ${queue.length} items`);

        const creations = queue.filter(a => a.type === 'CREATE_CONTRACT').map(a => {
            const payload = a.payload || {};
            const toolId = payload.toolId || (payload.toolIds && payload.toolIds.length > 0 ? payload.toolIds[0] : undefined);
            const toolIds = payload.toolIds || (payload.toolId ? [payload.toolId] : undefined);
            return {
                ...payload,
                toolId,
                toolIds,
                offlineId: a.offlineId
            };
        });
        const updates   = queue.filter(a => a.type === 'UPDATE_CONTRACT').map(a => ({ ...a.payload, offlineId: a.offlineId }));
        const closures  = queue.filter(a => a.type === 'CLOSE_CONTRACT').map(a => ({ ...a.payload, offlineId: a.offlineId }));

        try {
            const response = await api.post('/api/v1/sync/contracts', { creations, updates, closures });
            const result = response.data;

            if (result.idMappings) {
                await db.transaction('rw', db.contracts, async () => {
                    for (const mapping of result.idMappings) {
                        await db.contracts.update(mapping.offlineId, {
                            id: mapping.backendId,
                            contractNumber: mapping.contractNumber,
                            syncStatus: 'synced'
                        });
                    }
                });
            }

            const others = queue.filter(a => a.type !== 'CREATE_CONTRACT');
            for (const action of others) {
                await db.contracts
                    .where('offlineId').equals(action.offlineId)
                    .modify({ syncStatus: 'synced' });
            }

            const idsToRemove = queue.map(q => q.id).filter((id): id is number => id !== undefined);
            await db.syncQueue.bulkDelete(idsToRemove);

            console.log('[SyncManager] Legacy push completed.');
        } catch (error: any) {
            console.error('[SyncManager] Legacy bulk push failed:', error);
            const status = error.response?.status;

            if (status >= 400 && status < 500) {
                // Fallback: поэлементно, чтобы изолировать невалидные записи
                await this.pushLegacyItemByItem(queue);
            }
            // 5xx / сеть — просто ждём следующего цикла
        }
    }

    private async pushLegacyItemByItem(queue: any[]): Promise<void> {
        for (const action of queue) {
            try {
                const payload = {
                    creations: action.type === 'CREATE_CONTRACT' ? [{
                        ...action.payload,
                        toolId: action.payload?.toolId || (action.payload?.toolIds && action.payload?.toolIds.length > 0 ? action.payload?.toolIds[0] : undefined),
                        toolIds: action.payload?.toolIds || (action.payload?.toolId ? [action.payload?.toolId] : undefined),
                        offlineId: action.offlineId
                    }] : [],
                    updates:   action.type === 'UPDATE_CONTRACT' ? [{ ...action.payload, offlineId: action.offlineId }] : [],
                    closures:  action.type === 'CLOSE_CONTRACT'  ? [{ ...action.payload, offlineId: action.offlineId }] : []
                };
                const res = await api.post('/api/v1/sync/contracts', payload);
                const resData = res.data;

                if (resData.idMappings?.length > 0) {
                    const mapping = resData.idMappings[0];
                    await db.transaction('rw', db.contracts, async () => {
                        await db.contracts.update(mapping.offlineId, {
                            id: mapping.backendId,
                            contractNumber: mapping.contractNumber,
                            syncStatus: 'synced'
                        });
                    });
                } else if (action.type !== 'CREATE_CONTRACT') {
                    await db.contracts.where('offlineId').equals(action.offlineId).modify({ syncStatus: 'synced' });
                }

                if (action.id !== undefined) {
                    await db.syncQueue.delete(action.id);
                }
            } catch (itemError: any) {
                console.error(`[SyncManager] Item ${action.id} push failed:`, itemError);
                const itemStatus = itemError.response?.status;
                // 4xx (кроме 429) — невалидные данные, удаляем из очереди чтобы не блокировать
                if (itemStatus >= 400 && itemStatus < 500 && itemStatus !== 429) {
                    console.warn(`[SyncManager] Dropping invalid item ${action.id} (HTTP ${itemStatus})`);
                    if (action.id !== undefined) await db.syncQueue.delete(action.id);
                }
                // 5xx / 429 / сеть — оставляем для следующего retry
            }
        }
    }

    // ── V2 push с exponential backoff ────────────────────────────────────────

    private async pushV2Queue(): Promise<void> {
        const now = Date.now();
        const items = await db.syncQueueV2
            .where('status').anyOf(['pending', 'processing'])
            .and(item => item.nextRetryAt <= now)
            .sortBy('createdAt');

        if (items.length === 0) return;
        console.log(`[SyncManager] V2 push: ${items.length} items`);

        for (const item of items) {
            await this.pushV2Item(item);
        }
    }

    private async pushV2Item(item: SyncQueueItemV2): Promise<void> {
        await db.syncQueueV2.update(item.id, { status: 'processing' as SyncQueueStatus });

        try {
            const response = await api.request({
                url: item.endpoint,
                method: item.method,
                data: item.operation !== 'delete' ? item.payload : undefined,
            });

            // Успех — обновляем сущность данными с сервера и удаляем из очереди
            await db.transaction('rw', [db.syncQueueV2, db.contracts], async () => {
                if (item.operation !== 'delete' && response.data) {
                    if (item.entityTable === 'contracts') {
                        await db.contracts.update(item.entityId as any, {
                            ...response.data,
                            syncStatus: 'synced',
                        });
                    }
                } else if (item.operation === 'delete') {
                    if (item.entityTable === 'contracts') {
                        await db.contracts.delete(item.entityId as any);
                    }
                }
                await db.syncQueueV2.update(item.id, { status: 'done' as SyncQueueStatus });
            });
        } catch (error: any) {
            const httpStatus = error.response?.status as number | undefined;

            if (httpStatus && !isRetryableHttpStatus(httpStatus)) {
                // 4xx (кроме 429) — постоянная ошибка, не ретраить
                await db.syncQueueV2.update(item.id, {
                    status: 'failed' as SyncQueueStatus,
                    error: `HTTP ${httpStatus} (non-retryable)`,
                });
                console.error(`[SyncManager] V2 item ${item.id} permanently failed: HTTP ${httpStatus}`);
                return;
            }

            // Retryable (5xx / 429 / сеть)
            const newRetryCount = item.retryCount + 1;
            if (newRetryCount >= RETRY_CONFIG.MAX_RETRIES) {
                await db.syncQueueV2.update(item.id, {
                    status: 'failed' as SyncQueueStatus,
                    error: `Max retries (${RETRY_CONFIG.MAX_RETRIES}) exceeded`,
                    retryCount: newRetryCount,
                });
                console.error(`[SyncManager] V2 item ${item.id} max retries exceeded.`);
                return;
            }

            await db.syncQueueV2.update(item.id, {
                status: 'pending' as SyncQueueStatus,
                retryCount: newRetryCount,
                nextRetryAt: calcNextRetryAt(newRetryCount),
                error: error.message ?? String(error),
            });
        }
    }

    // ── Pull ──────────────────────────────────────────────────────────────────

    async pull(): Promise<void> {
        if (!navigator.onLine) return;
        console.log('[SyncManager] Starting pull...');

        try {
            const lastSyncStr = localStorage.getItem('lastSyncTimestamp');
            const since = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;

            const response = await api.get(`/api/v1/sync/pull?since=${since}`);
            const data = response.data;

            if (data.clients?.length)    await db.clients.bulkPut(data.clients);
            if (data.categories?.length) await db.categories.bulkPut(data.categories);
            if (data.templates?.length)  await db.templates.bulkPut(data.templates);

            if (data.tools?.length) {
                const normalizedTools = data.tools.map((t: any) => ({
                    ...t,
                    templateId: t.templateId || t.template?.id || t.toolTemplateId
                }));
                await db.tools.bulkPut(normalizedTools);
            }

            if (data.documents?.length) {
                await this.applyPulledContracts(data.documents);
            }

            if (data.lastSyncTimestamp) {
                localStorage.setItem('lastSyncTimestamp', String(data.lastSyncTimestamp));
            }

            // Обновляем watermark для syncMeta
            await db.syncMeta.put({ id: 'contracts', lastPulledAt: Date.now() });

            console.log('[SyncManager] Pull completed.');
        } catch (error) {
            console.error('[SyncManager] Pull error:', error);
        }
    }

    private async applyPulledContracts(documents: any[]): Promise<void> {
        // Получаем offlineId всех записей с ожидающими изменениями
        const pendingQueue = await db.syncQueue.toArray();
        const pendingOfflineIds = new Set(pendingQueue.map(item => item.offlineId));

        const pendingV2 = await db.syncQueueV2
            .where('status').anyOf(['pending', 'processing'])
            .and(item => item.entityTable === 'contracts')
            .toArray();
        const pendingV2EntityIds = new Set(pendingV2.map(item => item.entityId));

        for (const doc of documents) {
            const existing = await db.contracts.where('id').equals(doc.id).first();
            const offlineId = existing?.offlineId || doc.offlineId || crypto.randomUUID();

            // Пропускаем записи с ожидающими локальными изменениями (Local-Wins)
            if (pendingOfflineIds.has(offlineId) || pendingV2EntityIds.has(offlineId)) {
                console.log(`[SyncManager] Skipping pull for pending contract ${offlineId}`);
                continue;
            }

            let clientName = doc.clientName || existing?.clientName;
            if (!clientName && doc.clientId) {
                const client = await db.clients.get(doc.clientId);
                if (client) clientName = client.fullName;
            }

            let toolName = doc.toolName || existing?.toolName;
            if (!toolName && doc.toolId) {
                const tool = await db.tools.get(doc.toolId);
                if (tool) toolName = tool.name || tool.inventoryNumber;
            }

            // Last-Write-Wins по updatedAt
            if (existing && doc.updatedAt && existing.updatedAt > doc.updatedAt) {
                console.log(`[SyncManager] Local wins for contract ${offlineId}`);
                continue;
            }

            await db.contracts.put({
                ...existing,
                ...doc,
                clientName: clientName || (doc.clientId ? `Клиент #${doc.clientId}` : undefined),
                toolName:   toolName   || (doc.toolId   ? `Инструмент #${doc.toolId}` : undefined),
                offlineId,
                syncStatus: 'synced',
                updatedAt: doc.updatedAt || Date.now(),
            });
        }
    }

    // ── Утилиты ───────────────────────────────────────────────────────────────

    private async refreshCounts(): Promise<void> {
        const [pendingLegacy, pendingV2, failedV2] = await Promise.all([
            db.syncQueue.count(),
            db.syncQueueV2.where('status').anyOf(['pending', 'processing']).count(),
            db.syncQueueV2.where('status').equals('failed').count(),
        ]);
        this.updateState({
            pendingCount: pendingLegacy + pendingV2,
            failedCount: failedV2,
        });
    }

    private updateState(patch: Partial<SyncManagerState>): void {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach(l => l(this.state));
    }

    private handleNetworkChange = (): void => {
        const isOnline = !networkStore.isOffline;
        this.updateState({ isOnline });
        if (isOnline) {
            void this.sync();
        }
    };

    private startPullInterval(): void {
        if (this.pullTimer) clearInterval(this.pullTimer);
        this.pullTimer = setInterval(() => void this.sync(), RETRY_CONFIG.SYNC_INTERVAL_MS);
    }
}

export const syncManager = new SyncManager();
