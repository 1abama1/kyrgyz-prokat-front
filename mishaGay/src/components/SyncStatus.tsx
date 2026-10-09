import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncManager } from '../db/syncManager';
import { db } from '../db/db';
import { networkStore } from '../store/networkStore';
import { useSyncStatus } from '../hooks/useSyncStatus';
import '../styles/syncStatus.css';

/* ─── Векторные иконки ─── */
const WifiOffIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);


const RefreshIcon: React.FC<{ size?: number; spinning?: boolean }> = ({ size = 14, spinning = false }) => (
  <svg
    className={spinning ? "sync-spinning" : ""}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const AlertIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const MinimizeIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const SyncStatus: React.FC = () => {
  // ── Сетевой статус ────────────────────────────────────────────────────────
  const isOffline = useSyncExternalStore(networkStore.subscribe, () => networkStore.isOffline);
  const isBrowserOffline = networkStore.isBrowserOffline;

  // ── Реактивный статус синхронизации ───────────────────────────────────────
  const syncState = useSyncStatus();

  // ── Очереди Dexie ─────────────────────────────────────────────────────────
  const legacyPendingCount = useLiveQuery(() => db.syncQueue.filter(q => q.status !== 'failed').count(), []) ?? 0;
  const v2PendingCount = useLiveQuery(
    () => db.syncQueueV2.where('status').anyOf(['pending', 'processing']).count(),
    []
  ) ?? 0;
  const v2FailedCount = useLiveQuery(
    () => db.syncQueueV2.where('status').equals('failed').count(),
    []
  ) ?? 0;
  const legacyFailedCount = useLiveQuery(() => db.syncQueue.filter(q => q.status === 'failed').count(), []) ?? 0;

  const failedCount = legacyFailedCount + v2FailedCount;
  const totalPending = legacyPendingCount + v2PendingCount;

  // ── Состояния загрузки и интерфейса ───────────────────────────────────────
  const [isChecking, setIsChecking] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const updateLastSync = () => {
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

  const isSyncing = syncState.isSyncing;
  const hasFailed = failedCount > 0;

  // Вычисляем режим карточки
  const statusMode: 'offline' | 'failed' | 'syncing' | 'online' = isOffline
    ? 'offline'
    : hasFailed
      ? 'failed'
      : isSyncing
        ? 'syncing'
        : 'online';

  // Обработчики действий
  const handleCheckConnection = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isChecking || isBrowserOffline) return;

    setIsChecking(true);
    try {
      networkStore.setManualOffline(false);
      await syncManager.syncNow();
    } catch (err) {
      console.error('Ошибка проверки соединения:', err);
    } finally {
      setTimeout(() => {
        setIsChecking(false);
      }, 700);
    }
  };

  const handleRetryFailed = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isRetrying || isOffline || isSyncing) return;

    setIsRetrying(true);
    try {
      await syncManager.retryFailed();
    } catch (err) {
      console.error('Ошибка повторной отправки:', err);
    } finally {
      setTimeout(() => {
        setIsRetrying(false);
      }, 700);
    }
  };

  const handleManualSync = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSyncing || isOffline) return;
    try {
      await syncManager.syncNow();
    } catch (err) {
      console.error('Ошибка ручной синхронизации:', err);
    }
  };

  // В онлайн-режиме отображаем компактную аккуратную пилюлю по умолчанию,
  // либо если пользователь сам свернул карточку
  const showCompactPill = isMinimized || (statusMode === 'online');

  return (
    <div className="sync-status-root">
      {showCompactPill ? (
        /* ─── Компактная пилюля ─── */
        <div
          className={`sync-pill ${statusMode}`}
          onClick={() => {
            if (statusMode === 'online') {
              void handleManualSync();
            } else {
              setIsMinimized(false);
            }
          }}
          title={
            statusMode === 'offline'
              ? 'Офлайн режим (нажмите, чтобы развернуть)'
              : statusMode === 'failed'
                ? `Ошибок синхронизации: ${failedCount} (нажмите, чтобы развернуть)`
                : statusMode === 'syncing'
                  ? 'Выполняется синхронизация...'
                  : 'Система в сети (нажмите для синхронизации)'
          }
        >
          {/* Индикаторная точка со свечением */}
          <div className="sync-dot-wrapper">
            <span className={`sync-dot ${statusMode}`} />
            <span className={`sync-dot-ring ${statusMode !== 'online' ? 'pulse' : ''}`} />
          </div>

          {/* Текст статуса */}
          <span>
            {statusMode === 'offline' && 'Офлайн'}
            {statusMode === 'failed' && `Ошибки (${failedCount})`}
            {statusMode === 'syncing' && (totalPending > 0 ? `Синхронизация (${totalPending})` : 'Синхронизация...')}
            {statusMode === 'online' && 'В сети'}
          </span>

          {/* Время последней синхронизации для online */}
          {statusMode === 'online' && lastSync && (
            <span className="sync-pill-time">• {lastSync}</span>
          )}

          {/* Бейдж очереди при офлайне */}
          {statusMode === 'offline' && totalPending > 0 && (
            <span className="sync-pill-badge">{totalPending} в очереди</span>
          )}

          {/* Кнопка синхронизации на hover для онлайн */}
          {statusMode === 'online' && (
            <RefreshIcon size={12} spinning={isSyncing} />
          )}
        </div>
      ) : (
        /* ─── Развернутая премиальная карточка ─── */
        <div className={`sync-card ${statusMode}`}>
          {/* Шапка карточки */}
          <div className="sync-card-header">
            <div className="sync-header-left">
              <div className={`sync-icon-box ${statusMode}`}>
                {statusMode === 'offline' && <WifiOffIcon size={17} />}
                {statusMode === 'syncing' && <RefreshIcon size={17} spinning />}
                {statusMode === 'failed' && <AlertIcon size={17} />}
              </div>

              <div className="sync-header-text">
                <div className="sync-title-row">
                  <span className="sync-title">
                    {statusMode === 'offline' && 'Офлайн-режим'}
                    {statusMode === 'failed' && 'Ошибка синхронизации'}
                    {statusMode === 'syncing' && 'Синхронизация...'}
                  </span>
                  {totalPending > 0 && (
                    <span className="sync-status-tag danger">
                      {totalPending} в очереди
                    </span>
                  )}
                </div>
                <span className="sync-desc">
                  {statusMode === 'offline'
                    ? isBrowserOffline
                      ? 'Нет подключения к интернету'
                      : 'Сервер недоступен, данные сохраняются локально'
                    : statusMode === 'failed'
                      ? 'Не удалось отправить некоторые записи'
                      : 'Отправка данных на сервер...'}
                </span>
              </div>
            </div>

            {/* Кнопка свернуть */}
            <button
              type="button"
              className="sync-minimize-btn"
              onClick={() => setIsMinimized(true)}
              title="Свернуть индикатор"
            >
              <MinimizeIcon size={14} />
            </button>
          </div>

          {/* Тело карточки */}
          <div className="sync-card-body">
            {/* Ошибка последней операции */}
            {syncState.lastError && (
              <div className="sync-error-banner" title={syncState.lastError}>
                ⚠ {syncState.lastError}
              </div>
            )}

            <div className="sync-meta-info">
              {lastSync ? (
                <span>Посл. синхронизация: {lastSync}</span>
              ) : (
                <span>Локальная база активна</span>
              )}
              {totalPending > 0 && (
                <span>Ожидает отправки: {totalPending}</span>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="sync-card-actions">
            {statusMode === 'offline' && (
              <button
                type="button"
                className="sync-btn-action offline"
                disabled={isBrowserOffline || isChecking}
                onClick={handleCheckConnection}
                title={isBrowserOffline ? 'Проверьте сетевое подключение' : 'Проверить доступность сервера'}
              >
                <RefreshIcon size={13} spinning={isChecking} />
                <span>{isChecking ? 'Проверка соединения...' : 'Проверить соединение'}</span>
              </button>
            )}

            {statusMode === 'failed' && (
              <button
                type="button"
                className="sync-btn-action failed"
                disabled={isOffline || isSyncing || isRetrying}
                onClick={handleRetryFailed}
              >
                <RefreshIcon size={13} spinning={isRetrying} />
                <span>{isRetrying ? 'Повторяем отправку...' : 'Повторить отправку'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
