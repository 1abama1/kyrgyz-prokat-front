import Dexie, { Table } from 'dexie';
import type { Client } from '../types/client.types';
import type { Tool, ToolCategory, ToolTemplate } from '../types/tool.types';

// ─────────────────────────────────────────────────────────────────────────────
// Сущности
// ─────────────────────────────────────────────────────────────────────────────

export interface LocalContract {
    offlineId: string;  // PRIMARY KEY — генерируется на клиенте (crypto.randomUUID())
    id?: number;        // Backend ID — индексированное поле, заполняется после синхронизации
    clientId: number;
    clientName?: string;
    toolId: number;
    toolName?: string;
    contractNumber?: string;
    startDateTime: string;
    amount?: number;
    comment?: string;
    status: 'ACTIVE' | 'CLOSED' | 'TERMINATED';
    returnDate?: string;
    syncStatus: 'synced' | 'pending';
    updatedAt: number;
}

export interface SyncAction {
    id?: number;
    type: 'CREATE_CONTRACT' | 'UPDATE_CONTRACT' | 'CLOSE_CONTRACT';
    payload: any;
    offlineId: string;
    createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Новые типы для расширенной очереди синхронизации (v9)
// ─────────────────────────────────────────────────────────────────────────────

export type SyncQueueOperation = 'create' | 'update' | 'delete' | 'close';
export type SyncQueueStatus = 'pending' | 'processing' | 'failed' | 'done';

/**
 * Расширенный элемент очереди синхронизации с поддержкой retry + backoff.
 * Используется рядом с legacy SyncAction для новых операций.
 */
export interface SyncQueueItemV2 {
    id: string;                   // UUID (строковый ключ)
    operation: SyncQueueOperation;
    entityTable: string;          // Имя таблицы Dexie (contracts, clients, etc.)
    entityId: string;             // offlineId записи
    payload: unknown;             // Тело запроса к API
    endpoint: string;             // REST endpoint
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    createdAt: number;            // Для FIFO-сортировки
    retryCount: number;
    nextRetryAt: number;
    status: SyncQueueStatus;
    error?: string;
}

/**
 * Метаданные последней синхронизации по таблицам (watermark).
 */
export interface SyncMeta {
    id: string;           // Имя таблицы (первичный ключ)
    lastPulledAt: number; // Unix ms последнего успешного pull
}

/**
 * Локальная запись бронирования (зеркало BookingDto для Dexie).
 */
export interface LocalBooking {
    id: string;
    clientName: string;
    clientPhone?: string;
    templateId: string;
    templateName?: string;
    toolInstanceId: number;
    toolInstanceNumber?: number;
    startDateTime: string;
    endDateTime: string;
    status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
    comment?: string;
    createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// База данных
// ─────────────────────────────────────────────────────────────────────────────

export class AppDatabase extends Dexie {
    contracts!: Table<LocalContract, string>;
    syncQueue!: Table<SyncAction, number>;
    clients!: Table<Client, number>;
    tools!: Table<Tool, number>;
    categories!: Table<ToolCategory, string>;
    templates!: Table<ToolTemplate, string>;
    bookings!: Table<LocalBooking, string>;

    // Новые таблицы (v9)
    syncQueueV2!: Table<SyncQueueItemV2, string>;
    syncMeta!: Table<SyncMeta, string>;

    constructor() {
        super('RentalDocsDB');

        // ── v3–v8: Существующая цепочка (не удалять!) ────────────────────────
        this.version(3).stores({
            contracts: '++id, offlineId, clientId, toolId, status, syncStatus, updatedAt',
            syncQueue: '++id, type, offlineId, createdAt',
            clients: 'id, fullName, whatsappPhone, updatedAt',
            tools: 'id, name, inventoryNumber, status, updatedAt',
            categories: 'id, name',
            templates: 'id, name, categoryId'
        });

        this.version(4).stores({
            contracts: '++id, offlineId, clientId, toolId, status, syncStatus, updatedAt',
            syncQueue: '++id, type, offlineId, createdAt',
            clients: 'id, fullName, whatsappPhone, updatedAt',
            tools: 'id, name, inventoryNumber, status, updatedAt',
            categories: 'id, name',
            templates: 'id, name, categoryId'
        });

        this.version(5).stores({
            contracts: '++id, offlineId, clientId, toolId, status, syncStatus, updatedAt',
            syncQueue: '++id, type, offlineId, createdAt',
            clients: 'id, fullName, whatsappPhone, updatedAt',
            tools: 'id, name, inventoryNumber, status, updatedAt',
            categories: 'id, name',
            templates: 'id, name, categoryId'
        }).upgrade(async (tx) => {
            await tx.table('contracts').clear();
            await tx.table('syncQueue').clear();
            await tx.table('clients').clear();
            await tx.table('tools').clear();
            await tx.table('categories').clear();
            await tx.table('templates').clear();
            localStorage.removeItem('lastSyncTimestamp');
        });

        this.version(6).stores({
            contracts: null,
            syncQueue: '++id, type, offlineId, createdAt',
            clients: 'id, fullName, whatsappPhone, updatedAt',
            tools: 'id, name, inventoryNumber, status, updatedAt',
            categories: 'id, name',
            templates: 'id, name, categoryId'
        }).upgrade((tx) => {
            tx.table('syncQueue').clear();
            localStorage.removeItem('lastSyncTimestamp');
        });

        this.version(7).stores({
            contracts: 'offlineId, id, clientId, toolId, status, syncStatus, updatedAt',
            syncQueue: '++id, type, offlineId, createdAt',
            clients: 'id, fullName, whatsappPhone, updatedAt',
            tools: 'id, name, inventoryNumber, status, updatedAt',
            categories: 'id, name',
            templates: 'id, name, categoryId'
        });

        this.version(8).stores({
            contracts: 'offlineId, id, clientId, toolId, status, syncStatus, updatedAt',
            syncQueue: '++id, type, offlineId, createdAt',
            clients: 'id, fullName, whatsappPhone, updatedAt',
            tools: 'id, name, inventoryNumber, status, templateId, categoryId, updatedAt',
            categories: 'id, name',
            templates: 'id, name, categoryId',
            bookings: 'id, clientName, clientPhone, templateId, toolInstanceId, status, startDateTime, endDateTime'
        });

        // ── v9: Добавляем таблицы для Offline-First v2 ──────────────────────
        // syncQueueV2 — расширенная очередь с retry/backoff/status
        // syncMeta    — watermark-ы последней синхронизации по таблицам
        this.version(9).stores({
            contracts: 'offlineId, id, clientId, toolId, status, syncStatus, updatedAt',
            syncQueue: '++id, type, offlineId, createdAt',
            clients: 'id, fullName, whatsappPhone, updatedAt',
            tools: 'id, name, inventoryNumber, status, templateId, categoryId, updatedAt',
            categories: 'id, name',
            templates: 'id, name, categoryId',
            bookings: 'id, clientName, clientPhone, templateId, toolInstanceId, status, startDateTime, endDateTime',
            syncQueueV2: 'id, entityTable, entityId, status, createdAt, nextRetryAt',
            syncMeta: 'id'
        });
    }
}

export const db = new AppDatabase();
