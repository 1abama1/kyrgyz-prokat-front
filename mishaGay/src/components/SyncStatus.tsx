import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { networkStore } from '../store/networkStore';
import { useSyncStatus } from '../hooks/useSyncStatus';


export const SyncStatus: React.FC = () => {
    // ── Сетевой статус (ручной + браузерный) ──────────────────────────────────
    const isOffline      = useSyncExternalStore(networkStore.subscribe, () => networkStore.isOffline);

    // ── Реактивный статус синхронизации из SyncManager ───────────────────────
    const syncState = useSyncStatus();

    // ── Счётчики очередей (live из Dexie) ─────────────────────────────────────
    const legacyPendingCount = useLiveQuery(() => db.syncQueue.count(), []) ?? 0;
    const v2PendingCount     = useLiveQuery(
        () => db.syncQueueV2.where('status').anyOf(['pending', 'processing']).count(),
        []
    ) ?? 0;
    const v2FailedCount = useLiveQuery(
        () => db.syncQueueV2.where('status').equals('failed').count(),
        []
    ) ?? 0;

    const totalPending = legacyPendingCount + v2PendingCount;

    // ── Время последней синхронизации ─────────────────────────────────────────
    const [lastSync, setLastSync] = useState<string | null>(null);

    useEffect(() => {
        const updateLastSync = () => {
            // Сначала пробуем из нового состояния, затем fallback на localStorage
            let ts = syncState.lastSyncAt;
            if (!ts) {
                const stored = localStorage.getItem('lastSyncTimestamp');
                if (stored) {
                    ts = /^\d+$/.test(stored) ? parseInt(stored, 10) : new Date(stored).getTime();
                }
            }

            if (ts) {
                const date = new Date(ts);
                setLastSync(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
        };

        updateLastSync();
        const interval = setInterval(updateLastSync, 5_000);
        return () => clearInterval(interval);
    }, [syncState.lastSyncAt]);

    // ── Вычисляемые состояния ─────────────────────────────────────────────────
    const isSyncing = syncState.isSyncing || (totalPending > 0 && !isOffline);
    const hasFailed = v2FailedCount > 0;

    // ── Цвет индикатора ───────────────────────────────────────────────────────
    const bgColor = isOffline
        ? '#ef4444'
        : hasFailed
            ? '#f97316'
            : isSyncing
                ? '#f59e0b'
                : '#10b981';

    return (
        <>
            {/* Основной индикатор */}
            <div
                title={isOffline ? 'Нет подключения к сети' : 'Система в сети'}
                style={{
                    position: 'fixed', bottom: '20px', right: '20px',
                    padding: '10px 15px', borderRadius: '8px',
                    backgroundColor: bgColor, color: 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '4px',
                    fontSize: '14px', fontWeight: 'bold',
                    transition: 'background-color 0.2s ease',
                    minWidth: '140px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Анимированная точка */}
                    <div style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        backgroundColor: 'white',
                        animation: isSyncing ? 'sync-pulse 1.5s infinite' : 'none',
                        flexShrink: 0,
                    }} />
                    <span>
                        {isOffline
                            ? 'Офлайн режим'
                            : hasFailed
                                ? `Ошибки (${v2FailedCount})`
                                : isSyncing
                                    ? `Синхронизация... (${totalPending})`
                                    : 'В сети'}
                    </span>
                </div>

                {/* Время последней синхронизации */}
                {lastSync && !isOffline && !isSyncing && (
                    <span style={{ fontSize: '11px', opacity: 0.9, marginLeft: '20px' }}>
                        Синхр: {lastSync}
                    </span>
                )}

                {/* Ошибка последней операции */}
                {syncState.lastError && !isOffline && (
                    <span style={{ fontSize: '11px', opacity: 0.85, marginLeft: '20px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ⚠ {syncState.lastError}
                    </span>
                )}

                <style>{`
                    @keyframes sync-pulse {
                        0%   { transform: scale(0.95); opacity: 0.7; }
                        50%  { transform: scale(1.1);  opacity: 1;   }
                        100% { transform: scale(0.95); opacity: 0.7; }
                    }
                `}</style>
            </div>
        </>
    );
};
