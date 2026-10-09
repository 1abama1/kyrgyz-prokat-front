import { db, type SyncAction, type SyncQueueItemV2, type LocalContract } from './db';
import { api } from '../api/axios';
import { networkStore } from '../store/networkStore';
import { tokenSubject, databaseName, currentOwner } from './account';
import { businessDateTime } from '../utils/businessDateTime';

export interface SyncManagerState {
  isOnline: boolean; isSyncing: boolean; pendingCount: number; failedCount: number;
  lastSyncAt: number | null; lastError: string | null;
}
type Row = Record<string, any>;
interface PullResponse {
  fullSyncRequired?: boolean; fullSnapshot?: boolean; serverTimestamp: string;
  clients: Row[]; tools: Row[]; categories: Row[]; templates: Row[];
  contracts: Row[]; deletedClientIds?: number[]; deletedToolIds?: number[];
  deletedCategoryIds?: string[]; deletedTemplateIds?: string[]; deletedContractIds?: number[];
}
const errorStatus = (error: unknown): number | undefined => (error as { response?: { status?: number } })?.response?.status;
const message = (error: unknown): string => (error as { response?: { data?: { message?: string } } })?.response?.data?.message
  ?? (error instanceof Error ? error.message : 'Ошибка синхронизации');
const retryAt = (count: number) => Date.now() + Math.min(300_000, 1000 * 2 ** Math.min(count, 9));

class SyncManager {
  private running: Promise<void> | null = null;
  private paused = false;
  private controller = new AbortController();
  private listeners = new Set<(state: SyncManagerState) => void>();
  private state: SyncManagerState = { isOnline: !networkStore.isOffline, isSyncing: false,
    pendingCount: 0, failedCount: 0, lastSyncAt: null, lastError: null };

  constructor() {
    networkStore.subscribe(() => {
      this.updateState({ isOnline: !networkStore.isOffline });
      if (!networkStore.isOffline) void this.sync();
    });
    window.addEventListener('online', () => void this.sync());
    setInterval(() => void this.sync(), 60_000);
  }
  subscribe(listener: (state: SyncManagerState) => void): () => void {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  }
  getState(): SyncManagerState { return this.state; }
  async stop(): Promise<void> {
    this.paused = true; this.controller.abort();
    await this.running;
    this.updateState({ isSyncing: false, lastSyncAt: null, lastError: null, pendingCount: 0, failedCount: 0 });
  }
  resume(): void { this.controller = new AbortController(); this.paused = false; void this.sync(); }
  syncNow(): Promise<void> { return this.sync(); }
  sync(): Promise<void> {
    if (this.running) return this.running;
    if (databaseName(currentOwner()) !== db.name || this.paused || networkStore.isOffline || !tokenSubject(localStorage.getItem('accessToken'))) return Promise.resolve();
    this.running = this.run().finally(() => { this.running = null; });
    return this.running;
  }
  private async run(): Promise<void> {
    this.updateState({ isSyncing: true, lastError: null });
    try {
      const work = async () => {
        if (this.paused) return;
        await this.pushClients();
        await this.pushContracts();
        if (!this.paused) await this.pull();
      };
      if (navigator.locks) await navigator.locks.request(`sync:${db.name}`, { signal: this.controller.signal }, work);
      else await work();
      if (!this.paused) this.updateState({ lastSyncAt: Date.now() });
    } catch (error) {
      if (!this.paused) this.updateState({ lastError: message(error) });
    } finally {
      if (!this.paused) {
        const legacy = await db.syncQueue.toArray();
        const v2 = await db.syncQueueV2.toArray();
        this.updateState({ pendingCount: legacy.filter(x => x.status !== 'failed').length + v2.filter(x => x.status !== 'done' && x.status !== 'failed').length,
          failedCount: legacy.filter(x => x.status === 'failed').length + v2.filter(x => x.status === 'failed').length });
      }
      this.updateState({ isSyncing: false });
    }
  }
  async retryFailed(): Promise<void> {
    await db.transaction('rw', db.syncQueue, db.syncQueueV2, async () => {
      await db.syncQueue.toCollection().modify({ status: 'pending', nextRetryAt: 0 });
      await db.syncQueueV2.where('status').equals('failed').modify({ status: 'pending', nextRetryAt: 0 });
    });
    await this.sync();
  }
  async enqueueCreation(payload: Row, offlineId: string): Promise<void> { await this.enqueue('CREATE_CONTRACT', payload, offlineId); }
  async enqueueUpdate(id: number | undefined, offlineId: string, payload: Row): Promise<void> { await this.enqueue('UPDATE_CONTRACT', { ...payload, id }, offlineId); }
  async enqueueClosure(id: number | undefined, offlineId: string, payload: Row): Promise<void> { await this.enqueue('CLOSE_CONTRACT', { ...payload, id }, offlineId); }
  private async enqueue(type: SyncAction['type'], payload: Row, offlineId: string): Promise<void> {
    await db.syncQueue.add({ type, payload, offlineId, operationId: crypto.randomUUID(), status: 'pending', createdAt: Date.now() });
    setTimeout(() => void this.sync(), 0);
  }
  async enqueueV2(item: Omit<SyncQueueItemV2, 'id' | 'createdAt' | 'retryCount' | 'nextRetryAt' | 'status'>): Promise<string> {
    const id = crypto.randomUUID();
    await db.syncQueueV2.add({ ...item, id, createdAt: Date.now(), retryCount: 0, nextRetryAt: 0, status: 'pending' });
    setTimeout(() => void this.sync(), 0); return id;
  }
  private async pushClients(): Promise<void> {
    const items = await db.syncQueueV2.orderBy('createdAt').toArray();
    const blocked = new Set<string>();
    for (const item of items) {
      if (item.status === 'done') continue;
      if (this.paused) return;
      if (blocked.has(item.entityId)) continue;
      if (item.status === 'failed' || item.nextRetryAt > Date.now()) { blocked.add(item.entityId); continue; }
      if (item.entityTable !== 'clients') {
        await db.syncQueueV2.update(item.id, { status: 'failed', error: 'Неподдерживаемая старая операция: сохранена для ручного восстановления' });
        blocked.add(item.entityId); continue;
      }
      try {
        const response = await api.request<Row>({ url: item.endpoint, method: item.method,
          data: item.payload, headers: { 'Idempotency-Key': item.id }, signal: this.controller.signal });
        if (this.paused) return;
        await db.transaction('rw', [db.clients, db.contracts, db.syncQueue, db.syncQueueV2, db.syncMeta], async () => {
          const oldId = Number(item.entityId);
          const later = await db.syncQueueV2.filter(q => q.entityTable === 'clients' && q.entityId === item.entityId && q.id !== item.id).count();
          if (item.operation === 'create') {
            if (!Number.isSafeInteger(response.data.id)) throw new Error('Сервер не вернул ID клиента');
            const newId = response.data.id as number;
            const local = await db.clients.get(oldId);
            await db.clients.delete(oldId);
            await db.clients.put({ ...response.data, ...(later ? local : {}), id: newId } as any);
            await db.syncMeta.put({ id: `client:${oldId}`, backendId: newId, lastPulledAt: Date.now() });
            await db.contracts.where('clientId').equals(oldId).modify({ clientId: newId });
            await db.syncQueue.toCollection().modify(q => { if (q.payload?.clientId === oldId) q.payload.clientId = newId; });
            await db.syncQueueV2.toCollection().modify(q => {
              if (q.id !== item.id && q.entityTable === 'clients' && q.entityId === item.entityId) {
                q.entityId = String(newId); q.endpoint = `/api/admin/clients/${newId}`;
              }
            });
          } else if (item.operation === 'delete') await db.clients.delete(oldId);
          else if (!later) await db.clients.update(oldId, response.data);
          await db.syncQueueV2.delete(item.id);
        });
        if (item.operation === 'create') blocked.add(item.entityId);
      } catch (error) {
        blocked.add(item.entityId);
        if (this.paused) return;
        const status = errorStatus(error);
        if (status === 401 || status === 403) throw error;
        const permanent = status !== undefined && status >= 400 && status < 500 && status !== 429;
        await db.syncQueueV2.update(item.id, { status: permanent ? 'failed' : 'pending', error: message(error),
          retryCount: item.retryCount + 1, nextRetryAt: retryAt(item.retryCount + 1) });
        this.updateState({ lastError: message(error) });
      }
    }
  }
  private async pushContracts(): Promise<void> {
    const pendingClients = await db.syncQueueV2.toArray();
    const localClients = new Set(pendingClients.filter(q => q.entityTable === 'clients' && q.operation === 'create').map(q => Number(q.entityId)));
    const queue = await db.syncQueue.orderBy('createdAt').toArray();
    const blocked = new Set<string>();
    for (const queued of queue) {
      const action = await db.syncQueue.get(queued.id!);
      if (!action) continue;
      if (this.paused) return;
      if (blocked.has(action.offlineId)) continue;
      if (action.status === 'failed' || (action.nextRetryAt ?? 0) > Date.now() || localClients.has(action.payload?.clientId)) {
        blocked.add(action.offlineId); continue;
      }
      if (action.type === 'CREATE_CONTRACT' && !action.payload.startDateTime) {
        const local = await db.contracts.get(action.offlineId);
        if (local?.startDateTime) action.payload.startDateTime = businessDateTime(local.startDateTime);
      }
      if (action.payload.actualReturnDate) action.payload.actualReturnDate = businessDateTime(action.payload.actualReturnDate);
      const operationId = action.operationId ?? crypto.randomUUID();
      await db.syncQueue.update(action.id!, { operationId, payload: action.payload });
      const key = action.type === 'CREATE_CONTRACT' ? 'creations' : action.type === 'UPDATE_CONTRACT' ? 'updates' : 'closures';
      try {
        const { data } = await api.post('/api/v1/sync/contracts', { [key]: [{ ...action.payload, offlineId: action.offlineId }] },
          { headers: { 'Idempotency-Key': operationId }, signal: this.controller.signal });
        if (this.paused) return;
        const mapping = data.idMappings?.find((x: Row) => x.offlineId === action.offlineId || x.backendId === action.payload.id);
        if (action.type === 'CREATE_CONTRACT' && !mapping) throw new Error('Не получено подтверждение создания договора');
        await db.transaction('rw', db.contracts, db.syncQueue, async () => {
          await db.syncQueue.delete(action.id!);
          if (mapping?.updatedAt) {
            await db.syncQueue.where('offlineId').equals(action.offlineId).modify(q => {
              if (q.payload.expectedUpdatedAt === action.payload.expectedUpdatedAt)
                q.payload.expectedUpdatedAt = mapping.updatedAt;
            });
          }
          const remains = await db.syncQueue.where('offlineId').equals(action.offlineId).count();
          await db.contracts.update(action.offlineId, { ...(mapping ? { id: mapping.backendId, contractNumber: mapping.contractNumber, serverUpdatedAt: mapping.updatedAt } : {}),
            syncStatus: remains ? 'pending' : 'synced' });
        });
      } catch (error) {
        blocked.add(action.offlineId);
        if (this.paused) return;
        const status = errorStatus(error);
        if (status === 401 || status === 403) throw error;
        const permanent = status !== undefined && status >= 400 && status < 500 && status !== 429;
        const count = (action.retryCount ?? 0) + 1;
        await db.syncQueue.update(action.id!, { status: permanent ? 'failed' : 'pending', error: message(error), retryCount: count, nextRetryAt: retryAt(count) });
        this.updateState({ lastError: message(error) });
      }
    }
  }
  async pull(): Promise<void> {
    if (this.paused) return;
    let { data } = await api.get<PullResponse>('/api/v1/sync/pull', { params: { branchId: localStorage.getItem('branchId') || '1' }, signal: this.controller.signal });
    if (data.fullSyncRequired) {
      data = (await api.get<PullResponse>('/api/v1/sync/pull', { params: { branchId: localStorage.getItem('branchId') || '1' }, signal: this.controller.signal })).data;
      if (data.fullSyncRequired) throw new Error('Полная синхронизация недоступна');
    }
    if (this.paused) return;
    for (const field of ['clients', 'tools', 'categories', 'templates', 'contracts'] as const)
      if (!Array.isArray(data[field])) throw new Error(`Неверный формат синхронизации: ${field}`);
    await db.transaction('rw', db.tables, async () => {
      const legacy = await db.syncQueue.toArray();
      const v2 = await db.syncQueueV2.toArray();
      const pendingContracts = new Set([...legacy.map(q => q.offlineId), ...v2.filter(q => q.entityTable === 'contracts').map(q => q.entityId)]);
      const pendingClients = new Set(v2.filter(q => q.entityTable === 'clients').map(q => Number(q.entityId)));
      if (data.fullSnapshot) {
        // Quarantine legacy local-only catalogue entries before removing them from
        // the active catalogue. They must not remain selectable as server inventory.
        for (const name of ['tools', 'categories', 'templates'] as const) {
          const serverIds = new Set(data[name].map(row => String(row.id)));
          const table = db.table(name);
          const absent = await table.filter(row => !serverIds.has(String(row.id))).toArray();
          await db.table('recovery').bulkPut(absent.map(row => ({ key: `${name}:${row.id}`, table: name, data: row, savedAt: Date.now() })));
          await table.bulkDelete(absent.map(row => row.id));
        }
        const ids = new Set(data.contracts.map(c => c.id));
        await db.contracts.filter(c => !ids.has(c.id) && !pendingContracts.has(c.offlineId) && c.syncStatus !== 'pending').delete();
        const clients = new Set(data.clients.map(c => c.id));
        await db.clients.filter(c => !clients.has(c.id) && !pendingClients.has(c.id)).delete();
      }
      for (const id of data.deletedContractIds ?? []) {
        await db.contracts.where('id').equals(id).filter(c => !pendingContracts.has(c.offlineId) && c.syncStatus !== 'pending').delete();
      }
      for (const client of data.clients) if (!pendingClients.has(client.id)) await db.clients.put(client as any);
      await db.clients.bulkDelete((data.deletedClientIds ?? []).filter(id => !pendingClients.has(id)));
      await db.tools.bulkDelete(data.deletedToolIds ?? []);
      await db.categories.bulkDelete(data.deletedCategoryIds ?? []);
      await db.templates.bulkDelete(data.deletedTemplateIds ?? []);
      for (const tool of data.tools) {
        if (!tool.id || !tool.templateId) throw new Error('Инструмент без ID модели');
        const old = await db.tools.get(tool.id);
        await db.tools.put({ ...old, ...tool } as any);
      }
      await db.categories.bulkPut(data.categories as any);
      for (const template of data.templates) await db.templates.put({ ...await db.templates.get(template.id), ...template } as any);
      for (const doc of data.contracts) {
        const existing = await db.contracts.where('id').equals(doc.id).first();
        const offlineId = existing?.offlineId || doc.offlineId || `server:${doc.id}`;
        if (pendingContracts.has(offlineId) || existing?.syncStatus === 'pending') continue;
        await db.contracts.put({ ...existing, ...doc, offlineId, syncStatus: 'synced', serverUpdatedAt: doc.updatedAt,
          updatedAt: Date.now() } as LocalContract);
      }
      await db.syncMeta.put({ id: 'contracts', lastPulledAt: Date.now() });
    });
  }
  private updateState(patch: Partial<SyncManagerState>): void {
    this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener(this.state));
  }
}
export const syncManager = new SyncManager();
