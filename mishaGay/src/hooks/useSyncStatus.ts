import { useSyncExternalStore } from 'react';
import { syncManager, type SyncManagerState } from '../db/syncManager';

const subscribeToSyncManager = (callback: () => void) => {
    // useSyncExternalStore expects a callback with no arguments
    return syncManager.subscribe(callback as any);
};

/**
 * Реактивный хук для подписки на состояние синхронизации.
 * Использует useSyncExternalStore для корректной работы в StrictMode и Concurrent Mode.
 */
export function useSyncStatus(): SyncManagerState {
    return useSyncExternalStore(
        subscribeToSyncManager,
        () => syncManager.getState(),
    );
}
