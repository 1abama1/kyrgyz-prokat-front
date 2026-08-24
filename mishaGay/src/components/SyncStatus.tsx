import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { networkStore } from '../store/networkStore';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { syncManager } from '../db/syncManager';

export const SyncStatus: React.FC = () => {
    // ── Сетевой статус (ручной + браузерный) ──────────────────────────────────
    const isOffline      = useSyncExternalStore(networkStore.subscribe, () => networkStore.isOffline);
    const isManualOffline = useSyncExternalStore(networkStore.subscribe, () => networkStore.isManualOffline);
    const isBrowserOffline = useSyncExternalStore(networkStore.subscribe, () => networkStore.isBrowserOffline);

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
            const ts = syncState.lastSyncAt
                ?? (localStorage.getItem('lastSyncTimestamp')
                    ? parseInt(localStorage.getItem('lastSyncTimestamp')!, 10)
                    : null);

            if (ts) {
                const date = new Date(ts);
                setLastSync(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
        };

        updateLastSync();
        const interval = setInterval(updateLastSync, 5_000);
        return () => clearInterval(interval);
    }, [syncState.lastSyncAt]);

    // ── Промпт "Сеть восстановлена" ───────────────────────────────────────────
    const [showOnlinePrompt, setShowOnlinePrompt] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            if (networkStore.isManualOffline) setShowOnlinePrompt(true);
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    // ── Вычисляемые состояния ─────────────────────────────────────────────────
    const isSyncing = syncState.isSyncing || (totalPending > 0 && !isOffline);
    const hasFailed = v2FailedCount > 0;

    const toggleOfflineMode = () => {
        if (isBrowserOffline) return;
        networkStore.setManualOffline(!isManualOffline);
        setShowOnlinePrompt(false);
    };

    const handleSyncNow = (e: React.MouseEvent) => {
        e.stopPropagation();
        void syncManager.syncNow();
    };

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
            {/* Промпт восстановления сети */}
            {showOnlinePrompt && (
                <div style={{
                    position: 'fixed', bottom: '90px', right: '20px',
                    padding: '16px', borderRadius: '8px',
                    backgroundColor: '#fff', border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    zIndex: 10000, width: '300px'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Сеть восстановлена</h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>
                        Подключение появилось. Перейти в онлайн-режим?
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowOnlinePrompt(false)}
                            style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Позже
                        </button>
                        <button
                            onClick={() => { networkStore.setManualOffline(false); setShowOnlinePrompt(false); }}
                            style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Перейти в онлайн
                        </button>
                    </div>
                </div>
            )}

            {/* Основной индикатор */}
            <div
                onClick={toggleOfflineMode}
                title={isBrowserOffline ? 'Нет подключения к сети' : 'Нажмите, чтобы переключить режим'}
                style={{
                    position: 'fixed', bottom: '20px', right: '20px',
                    padding: '10px 15px', borderRadius: '8px',
                    backgroundColor: bgColor, color: 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '4px',
                    fontSize: '14px', fontWeight: 'bold',
                    cursor: isBrowserOffline ? 'not-allowed' : 'pointer',
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
                            ? (isBrowserOffline ? 'Нет сети' : 'Офлайн режим')
                            : hasFailed
                                ? `Ошибки (${v2FailedCount})`
                                : isSyncing
                                    ? `Синхронизация... (${totalPending})`
                                    : 'В сети'}
                    </span>

                    {/* Кнопка ручного sync (только online и не в процессе) */}
                    {!isOffline && !isSyncing && (
                        <button
                            onClick={handleSyncNow}
                            title="Синхронизировать сейчас"
                            style={{
                                marginLeft: 'auto', background: 'rgba(255,255,255,0.25)',
                                border: 'none', borderRadius: '4px', color: 'white',
                                cursor: 'pointer', padding: '2px 6px', fontSize: '13px',
                                lineHeight: 1,
                            }}
                        >
                            ↻
                        </button>
                    )}
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
