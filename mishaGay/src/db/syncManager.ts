import { db } from './db';
import { API_BASE_URL } from '../utils/constants';
import { getToken } from '../utils/auth';

class SyncManager {
    private isSyncing = false;

    constructor() {
        // Listen for online status
        window.addEventListener('online', () => this.sync());
        // Start initial sync
        this.sync();
        // Periodically try to sync every 1 minute
        setInterval(() => this.sync(), 60000);
    }

    async sync() {
        if (this.isSyncing || !navigator.onLine) return;

        const queue = await db.syncQueue.toArray();
        if (queue.length === 0) return;

        this.isSyncing = true;
        console.log(`[SyncManager] Starting sync of ${queue.length} items...`);

        try {
            const creations = queue.filter(a => a.type === 'CREATE_CONTRACT').map(a => ({ ...a.payload, offlineId: a.offlineId }));
            const updates = queue.filter(a => a.type === 'UPDATE_CONTRACT').map(a => ({ ...a.payload, offlineId: a.offlineId }));
            const closures = queue.filter(a => a.type === 'CLOSE_CONTRACT').map(a => ({ ...a.payload, offlineId: a.offlineId }));

            const response = await fetch(`${API_BASE_URL}/api/v1/sync/contracts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ creations, updates, closures })
            });

            if (response.ok) {
                const result = await response.json();

                // Handle ID mapping
                if (result.idMappings) {
                    for (const mapping of result.idMappings) {
                        const oldRecord = await db.contracts.where('offlineId').equals(mapping.offlineId).first();
                        if (oldRecord) {
                            await db.contracts.delete(oldRecord.id!);
                            await db.contracts.add({
                                ...oldRecord,
                                id: mapping.backendId,
                                contractNumber: mapping.contractNumber,
                                syncStatus: 'synced'
                            });
                        }
                    }
                }

                // Handle updates and closures (mark as synced)
                const others = queue.filter(a => a.type !== 'CREATE_CONTRACT');
                for (const action of others) {
                    await db.contracts
                        .where('offlineId')
                        .equals(action.offlineId)
                        .modify({ syncStatus: 'synced' });
                }

                // Clear the queue for these items
                const idsToRemove = queue.map(q => q.id!);
                await db.syncQueue.bulkDelete(idsToRemove);

                console.log('[SyncManager] Push completed successfully.');
            } else {
                console.error('[SyncManager] Push failed with status:', response.status);
                // If it's a 4xx client error (like 409 Conflict), the queue contains invalid data
                // Clear the queue to prevent infinite looping on bad data
                if (response.status >= 400 && response.status < 500) {
                    console.warn('[SyncManager] Unrecoverable error during push. Clearing queue to prevent loop.');
                    const idsToRemove = queue.map(q => q.id!);
                    await db.syncQueue.bulkDelete(idsToRemove);
                }
            }
        } catch (error) {
            console.error('[SyncManager] Push error:', error);
        }

        // Фаза 2: Pull (скачивание изменений с сервера)
        await this.pull();

        this.isSyncing = false;
    }

    async pull() {
        if (!navigator.onLine) return;
        console.log('[SyncManager] Starting pull sync...');

        try {
            const lastSyncStr = localStorage.getItem('lastSyncTimestamp');
            const since = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;

            const response = await fetch(`${API_BASE_URL}/api/v1/sync/pull?since=${since}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.clients && data.clients.length > 0) {
                    await db.clients.bulkPut(data.clients);
                }
                if (data.tools && data.tools.length > 0) {
                    await db.tools.bulkPut(data.tools);
                }
                if (data.categories && data.categories.length > 0) {
                    await db.categories.bulkPut(data.categories);
                }
                if (data.templates && data.templates.length > 0) {
                    await db.templates.bulkPut(data.templates);
                }
                if (data.documents && data.documents.length > 0) {
                    // Map documents to LocalContract format if needed, but since it's just DTOs,
                    // we'll store them as-is or merge them. For now, we'll store them directly
                    // since our LocalContract matches closely, but we should make sure offlineId is handled.
                    for (const doc of data.documents) {
                        const existing = await db.contracts.get(doc.id);
                        await db.contracts.put({
                            ...existing,
                            ...doc,
                            offlineId: existing?.offlineId || doc.offlineId || crypto.randomUUID(), // Ensure offlineId exists
                            syncStatus: 'synced'
                        });
                    }
                }

                if (data.lastSyncTimestamp) {
                    localStorage.setItem('lastSyncTimestamp', data.lastSyncTimestamp.toString());
                }
                console.log('[SyncManager] Pull completed successfully.');
            }
        } catch (error) {
            console.error('[SyncManager] Pull error:', error);
        }
    }

    async enqueueCreation(payload: any, offlineId: string) {
        await db.syncQueue.add({
            type: 'CREATE_CONTRACT',
            payload,
            offlineId,
            createdAt: Date.now()
        });
        this.sync();
    }

    async enqueueUpdate(id: number | undefined, offlineId: string, payload: any) {
        await db.syncQueue.add({
            type: 'UPDATE_CONTRACT',
            payload: { ...payload, id },
            offlineId,
            createdAt: Date.now()
        });
        this.sync();
    }

    async enqueueClosure(id: number | undefined, offlineId: string, payload: any) {
        await db.syncQueue.add({
            type: 'CLOSE_CONTRACT',
            payload: { ...payload, id },
            offlineId,
            createdAt: Date.now()
        });
        this.sync();
    }
}

export const syncManager = new SyncManager();
