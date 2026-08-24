import { useSyncExternalStore } from 'react';
import { syncManager, type SyncManagerState } from '../db/syncManager';

/**
 * Реактивный хук для подписки на состояние синхронизации.
 * Использует useSyncExternalStore для корректной работы в StrictMode и Concurrent Mode.
 */
export function useSyncStatus(): SyncManagerState {
    return useSyncExternalStore(
        // subscribe — вызывается React при монтировании/размонтировании
        (callback) => syncManager.subscribe(callback),
        // getSnapshot — возвращает текущее значение
        () => syncManager.getState(),
    );
}
