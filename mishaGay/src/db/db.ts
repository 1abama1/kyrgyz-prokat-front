import Dexie, { Table } from 'dexie';

export interface LocalContract {
    id?: number; // Backend ID, if exists
    offlineId: string; // Required for all, generated on frontend if new
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

export class AppDatabase extends Dexie {
    contracts!: Table<LocalContract>;
    syncQueue!: Table<SyncAction>;

    constructor() {
        super('RentalDocsDB');
        this.version(1).stores({
            contracts: '++id, offlineId, clientId, toolId, syncStatus, updatedAt',
            syncQueue: '++id, type, offlineId, createdAt'
        });
    }
}

export const db = new AppDatabase();
