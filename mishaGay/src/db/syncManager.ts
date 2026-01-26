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
                        await db.contracts
                            .where('offlineId')
                            .equals(mapping.offlineId)
                            .modify({
                                id: mapping.backendId,
                                contractNumber: mapping.contractNumber,
                                syncStatus: 'synced'
                            });
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

                console.log('[SyncManager] Sync completed successfully.');
            } else {
                console.error('[SyncManager] Sync failed with status:', response.status);
            }
        } catch (error) {
            console.error('[SyncManager] Sync error:', error);
        } finally {
            this.isSyncing = false;
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
