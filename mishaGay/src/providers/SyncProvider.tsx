import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { syncManager, type SyncManagerState } from '../db/syncManager';
import { useSyncStatus } from '../hooks/useSyncStatus';

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface SyncContextValue {
    state: SyncManagerState;
    syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Оборачивает приложение и предоставляет доступ к состоянию синхронизации
 * через хук useSync(). Инициализируется один раз при монтировании.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
    const state = useSyncStatus();

    // syncManager инициализируется как синглтон при импорте модуля,
    // здесь нам нужно только убедиться, что он существует.
    useEffect(() => {
        // Форсируем первый sync при монтировании приложения
        void syncManager.syncNow();
    }, []);

    return (
        <SyncContext.Provider value={{ state, syncNow: () => syncManager.syncNow() }}>
            {children}
        </SyncContext.Provider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Доступ к состоянию синхронизации и принудительному запуску sync.
 * Должен использоваться внутри <SyncProvider>.
 */
export function useSync(): SyncContextValue {
    const ctx = useContext(SyncContext);
    if (!ctx) throw new Error('useSync must be used within <SyncProvider>');
    return ctx;
}
