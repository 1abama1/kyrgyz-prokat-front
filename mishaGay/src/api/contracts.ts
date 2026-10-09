import { businessDateTime } from '../utils/businessDateTime';
import { API_BASE_URL } from "../utils/constants";
import { getToken } from "../utils/auth";
import type { ToolInstance } from "../types/tool.types";
import type { RentalDocument } from "../types/RentalDocument";
import { apiCall } from "./client";
import { db } from "../db/db";
import { syncManager } from "../db/syncManager";
import { networkStore } from "../store/networkStore";

export interface CreateContractPayload {
  clientId: number;
  toolId?: number; // Kept for backward compatibility
  toolIds?: number[];
  contractNumber?: string; // Опционально, если бэкенд генерирует автоматически
  offlineId?: string;
}

export interface UpdateContractPayload {
  amount?: number;
  comment?: string;
}

export interface BackendError {
  message?: string;
  status?: number;
  code?: string;
  timestamp?: string;
  [key: string]: unknown;
}

const buildAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const raiseError = async (response: Response): Promise<never> => {
  const raw = await response.text();

  if (raw) {
    try {
      const data = JSON.parse(raw);
      const error: BackendError = {
        ...data,
        status: data?.status ?? response.status
      };
      return Promise.reject(error);
    } catch {
      const fallbackError: BackendError = {
        message: raw,
        status: response.status
      };
      throw fallbackError;
    }
  }

  const emptyError: BackendError = {
    message: `Ошибка ${response.status}`,
    status: response.status
  };
  throw emptyError;
};

const extractFilename = (response: Response, fallback = "contract.xlsx") => {
  const contentDisposition = response.headers.get("content-disposition");
  if (!contentDisposition) return fallback;

  const utf8Match = /filename\*=UTF-8''(.+)$/.exec(contentDisposition);
  const asciiMatch = /filename="?([^\";]+)"?/.exec(contentDisposition);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallback;
};

/**
 * Получить документы клиента
 * GET /api/admin/clients/{clientId}/documents
 */
export async function getClientDocuments(clientId: number): Promise<RentalDocument[]> {
const requestDb = db;
  if (networkStore.isOffline) {
    const allContracts = await requestDb.contracts.toArray();
    const client = await requestDb.clients.get(Number(clientId));
    const clientDocs = Array.isArray(client?.documents) ? client.documents : [];
    const clientDocIds = new Set(clientDocs.map((d: any) => d.id).filter(Boolean));

    let matchedContracts = allContracts.filter(doc => 
      (doc.clientId && Number(doc.clientId) === Number(clientId)) ||
      (doc.id && clientDocIds.has(doc.id)) ||
      (allContracts.length > 0 && (!doc.clientId || doc.clientId === 0) && Number(clientId) === 1)
    );

    if (matchedContracts.length === 0 && clientDocs.length > 0) {
      matchedContracts = clientDocs.map((d: any) => ({
        offlineId: crypto.randomUUID(),
        id: d.id,
        clientId: Number(clientId),
        contractNumber: d.contractNumber,
        startDateTime: d.startDateTime,
        amount: d.amount,
        status: d.status,
        toolId: d.toolId,
        toolName: d.toolName,
        returnDate: d.returnDate,
        comment: d.comment,
        syncStatus: 'synced',
        updatedAt: Date.now()
      }));
    }

    return Promise.all(matchedContracts.map(async (doc) => {
      let toolName = doc.toolName;
      if (!toolName && doc.toolId) {
        const tool = await requestDb.tools.get(Number(doc.toolId));
        if (tool) toolName = tool.name || tool.inventoryNumber;
      }
      return {
        id: doc.id || 0,
        contractNumber: doc.contractNumber || "",
        startDateTime: doc.startDateTime,
        dailyPrice: doc.amount || 0,
        amount: doc.amount || 0,
        createdAt: doc.startDateTime,
        clientId: Number(clientId),
        clientName: doc.clientName || client?.fullName || "",
        toolId: doc.toolId || 0,
        toolName: toolName || "",
        returnDate: doc.returnDate,
        status: doc.status as any,
        comment: doc.comment
      } as RentalDocument;
    }));
  }

  const response = await fetch(
    `${API_BASE_URL}/api/admin/clients/${clientId}/documents`,
    { headers: { ...buildAuthHeaders() } }
  );

  if (!response.ok) {
    await raiseError(response);
  }

  const docs = await response.json();
  if (Array.isArray(docs)) {
    for (const doc of docs) {
      if (!doc.id) continue;
      const existing = await requestDb.contracts.where('id').equals(doc.id).first();
      if (existing?.syncStatus === 'pending') continue;
      await requestDb.contracts.put({
        ...existing,
        offlineId: existing?.offlineId || doc.offlineId || crypto.randomUUID(),
        id: doc.id,
        clientId: Number(clientId),
        clientName: doc.clientName || existing?.clientName,
        toolId: doc.toolId || existing?.toolId,
        toolName: doc.toolName || existing?.toolName,
        contractNumber: doc.contractNumber,
        startDateTime: doc.startDateTime || doc.createdAt,
        amount: doc.amount || doc.dailyPrice,
        status: doc.status as any,
        returnDate: doc.returnDate,
        syncStatus: 'synced',
        updatedAt: Date.now()
      });
    }
  }

  return docs;
}

/**
 * 1) Получить список доступных физических инструментов по шаблону (модели)
 *    GET /api/admin/contracts/available?templateId=...
 *    Возвращает только AVAILABLE экземпляры конкретной модели
 */
export async function getAvailableTools(templateId: string): Promise<ToolInstance[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/contracts/available?templateId=${templateId}`,
    { headers: { ...buildAuthHeaders() } }
  );

  if (!response.ok) {
    await raiseError(response);
  }

  return await response.json();
}

/**
 * 2) Создать договор в БД
 *    POST /api/admin/contracts/create
 *    → возвращает RentalDocument (JSON)
 */
export async function createContract(payload: CreateContractPayload): Promise<any> {
const requestDb = db;
  const store = requestDb;
  const offlineId = payload.offlineId || crypto.randomUUID();
  const toolIds = payload.toolIds?.length ? payload.toolIds : payload.toolId ? [payload.toolId] : [];
  if (!toolIds.length) throw new Error('Выберите инструмент');
  const startDateTime = businessDateTime();
  const client = await store.clients.get(Number(payload.clientId));
  const tool = await store.tools.get(toolIds[0]);
  await store.transaction('rw', store.contracts, store.syncQueue, async () => {
    await store.contracts.add({ offlineId, clientId: payload.clientId, clientName: client?.fullName,
      toolId: toolIds[0], toolIds, toolName: tool?.name, contractNumber: payload.contractNumber,
      startDateTime, status: 'ACTIVE', syncStatus: 'pending', updatedAt: Date.now() });
    await store.syncQueue.add({ type: 'CREATE_CONTRACT', offlineId,
      payload: { ...payload, toolIds, startDateTime }, operationId: crypto.randomUUID(), status: 'pending', createdAt: Date.now() });
  });
  await syncManager.sync();
  return await store.contracts.get(offlineId);
}

export async function updateContract(contractId: number | undefined, payload: UpdateContractPayload, offlineId?: string): Promise<any> {
  return queueContractChange('UPDATE_CONTRACT', contractId, payload, offlineId);
}

async function queueContractChange(type: 'UPDATE_CONTRACT' | 'CLOSE_CONTRACT', id: number | undefined, payload: any, offlineId?: string): Promise<any> {
const requestDb = db;
  const store = requestDb;
  let existing = offlineId ? await store.contracts.get(offlineId) : id ? await store.contracts.where('id').equals(id).first() : undefined;
  if (!existing && id && !networkStore.isOffline) {
    const remote: any = await apiCall({ url: '/api/admin/contracts/' + id });
    existing = { ...remote, offlineId: remote.offlineId || 'server:' + id, serverUpdatedAt: remote.updatedAt, syncStatus: 'synced', updatedAt: Date.now() };
    await store.contracts.put(existing!);
  }
  if (!existing) throw new Error('Договор отсутствует в локальной базе. Сначала выполните синхронизацию.');
  const key = existing.offlineId;
  await store.transaction('rw', store.contracts, store.syncQueue, async () => {
    await store.contracts.update(key, { ...('comment' in payload ? { comment: payload.comment } : {}),
      ...(type === 'CLOSE_CONTRACT' ? { status: 'CLOSED' as const, returnDate: payload.actualReturnDate } : {}),
      syncStatus: 'pending', updatedAt: Date.now() });
    await store.syncQueue.add({ type, offlineId: key, payload: { ...payload, id: existing!.id, expectedUpdatedAt: existing!.serverUpdatedAt },
      operationId: crypto.randomUUID(), status: 'pending', createdAt: Date.now() });
  });
  await syncManager.sync();
  return await store.contracts.get(key);
}

export async function downloadExcelContract(
  payload: CreateContractPayload
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/contracts/excel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await raiseError(response);
  }

  const blob = await response.blob();
  const filename = extractFilename(response, "contract.xlsx");

  return { blob, filename };
}

/**
 * Скачать уже существующий Excel-договор по ID
 * GET /api/admin/contracts/{id}/excel
 */
export async function downloadExistingExcelContract(
  contractId: number,
  fallbackFilename = "contract.xlsx"
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/contracts/${contractId}/excel`, {
    method: "GET",
    headers: { ...buildAuthHeaders() }
  });

  if (!response.ok) {
    await raiseError(response);
  }

  const blob = await response.blob();
  const filename = extractFilename(response, fallbackFilename);

  return { blob, filename };
}

/**
 * 5) Закрыть договор по id RentalDocument
 *    POST /api/admin/contracts/{contractId}/close
 */
export async function closeContract(contractId: number | undefined,
  payload?: { paidAmount?: number; comment?: string; isBroken?: boolean; actualReturnDate?: string }, offlineId?: string): Promise<any> {
  return queueContractChange('CLOSE_CONTRACT', contractId, { ...payload,
    actualReturnDate: businessDateTime(payload?.actualReturnDate) }, offlineId);
}

export async function restoreContract(contractId: number): Promise<unknown> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/contracts/${contractId}/restore`,
    {
      method: "POST",
      headers: {
        ...buildAuthHeaders()
      }
    }
  );

  if (!response.ok) {
    await raiseError(response);
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export interface ActiveContractRow {
  index: number;
  contractId: number;
  clientId: number;
  clientName: string;
  toolName: string;
  startDate: string;
  balance: number;
  dailyPrice?: number;
  offlineId?: string;
}

/**
 * Получить таблицу активных договоров
 * GET /api/contracts/active-table
 */
export async function getActiveTable(): Promise<ActiveContractRow[]> {
const requestDb = db;
  if (!networkStore.isOffline) {
    try {
      const data = await apiCall<ActiveContractRow[]>({
        url: "/api/contracts/active-table",
      });

      // Update local cache asynchronously in background
      (async () => {
        try {
          const allContracts = await requestDb.contracts.toArray();
          const contractMap = new Map(allContracts.filter(c => c.id).map(c => [c.id!, c]));

          const toAdd: any[] = [];
          const updatePromises: Promise<any>[] = [];

          for (const row of data) {
            const contractId = row.contractId || (row as any).id;
            if (!contractId) continue;
            const existing = contractMap.get(contractId);
            if (existing?.syncStatus === 'pending') continue;
            if (existing) {
              updatePromises.push(
                requestDb.contracts.update(existing.offlineId, {
                  clientName: row.clientName || existing.clientName,
                  toolName: row.toolName || existing.toolName,
                  amount: row.balance,
                  startDateTime: row.startDate || existing.startDateTime
                })
              );
            } else {
              toAdd.push({
                id: contractId,
                offlineId: crypto.randomUUID(),
                clientId: row.clientId || 0,
                clientName: row.clientName,
                toolId: 0,
                toolName: row.toolName,
                contractNumber: undefined,
                startDateTime: row.startDate,
                amount: row.balance,
                status: 'ACTIVE',
                syncStatus: 'synced',
                updatedAt: Date.now()
              });
            }
          }

          if (toAdd.length > 0) {
            await requestDb.contracts.bulkAdd(toAdd);
          }
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
          }
        } catch (err) {
          console.warn("Background active contracts cache update error:", err);
        }
      })();

      // Get pending offline contracts that haven't synced to server yet
      const pendingDocs = await requestDb.contracts
        .where('status').equals('ACTIVE')
        .filter(c => c.syncStatus === 'pending' || !c.id)
        .toArray();

      const serverContractIds = new Set(data.map(r => r.contractId || (r as any).id));

      const pendingRows: ActiveContractRow[] = await Promise.all(
        pendingDocs
          .filter(doc => !doc.id || !serverContractIds.has(doc.id))
          .map(async (doc, idx) => {
            let clientName = doc.clientName;
            if (!clientName && doc.clientId) {
              const client = await requestDb.clients.get(Number(doc.clientId));
              if (client) clientName = client.fullName;
            }
            let toolName = doc.toolName;
            if (!toolName && doc.toolId) {
              const tool = await requestDb.tools.get(Number(doc.toolId));
              if (tool) toolName = tool.name || tool.inventoryNumber;
            }

            return {
              index: idx + 1,
              contractId: doc.id || 0,
              offlineId: doc.offlineId,
              contractNumber: doc.contractNumber,
              clientId: doc.clientId || 0,
              clientName: clientName || (doc.clientId ? `Клиент #${doc.clientId}` : "Клиент"),
              toolName: toolName || (doc.toolId ? `Инструмент #${doc.toolId}` : "Инструмент"),
              startDate: doc.startDateTime,
              balance: doc.amount || 0
            };
          })
      );

      // Trigger sync in background if there are pending items
      if (pendingRows.length > 0) {
        void syncManager.sync();
      }

      return [...pendingRows, ...data];
    } catch (e) {
      console.warn("Failed to fetch active table, falling back to local DB", e);
    }
  }

  // Fallback to local DB
  const localDocs = await requestDb.contracts.where('status').equals('ACTIVE').toArray();
  const allClients = await requestDb.clients.toArray();
  const allTools = await requestDb.tools.toArray();
  
  return await Promise.all(localDocs.map(async (doc, idx) => {
    let clientName = doc.clientName;
    let clientId = doc.clientId;

    if (!clientName || !clientId || clientId === 0) {
      const matchedClient = allClients.find(c => 
        (c.id && clientId && Number(c.id) === Number(clientId)) ||
        (Array.isArray(c.documents) && c.documents.some((d: any) => d.id === doc.id))
      ) || (allClients.length === 1 ? allClients[0] : undefined);

      if (matchedClient) {
        clientName = matchedClient.fullName;
        clientId = matchedClient.id;
        requestDb.contracts.update(doc.offlineId, { clientName, clientId }).catch(() => {});
      }
    } else if (clientId && !clientName) {
      const client = await requestDb.clients.get(Number(clientId));
      if (client) {
        clientName = client.fullName;
        requestDb.contracts.update(doc.offlineId, { clientName }).catch(() => {});
      }
    }
    
    let toolName = doc.toolName;
    let toolId = doc.toolId;
    if (!toolName && toolId) {
      const tool = await requestDb.tools.get(Number(toolId));
      if (tool) toolName = tool.name || tool.inventoryNumber;
    }

    return {
      index: idx + 1,
      contractId: doc.id || 0,
      offlineId: doc.offlineId,
      contractNumber: doc.contractNumber,
      clientId: clientId || 0,
      clientName: clientName || (clientId ? `Клиент #${clientId}` : (allClients[0]?.fullName || "Клиент")),
      toolName: toolName || (toolId ? `Инструмент #${toolId}` : (allTools[0]?.name || "Инструмент")),
      startDate: doc.startDateTime,
      balance: doc.amount || 0
    };
  })) as any;
}

export async function getById(contractId: number): Promise<any> {
const requestDb = db;
  if (!contractId || isNaN(contractId) || contractId <= 0) {
    return Promise.reject(new Error("Invalid contract id: id must be a positive number"));
  }

  if (!networkStore.isOffline) {
    try {
      return await apiCall({
        url: `/api/admin/contracts/${contractId}`,
      });
    } catch (e) {
      console.warn(`Failed to fetch contract #${contractId} from server, falling back to IndexedDB:`, e);
    }
  }

  const contract = await requestDb.contracts.where('id').equals(Number(contractId)).first();
  if (contract) return contract;
  throw new Error(`Договор #${contractId} не найден в локальной базе данных`);
}

export async function getHistoryByTool(toolId: number): Promise<any[]> {
  if (!toolId || isNaN(toolId) || toolId <= 0) {
    return Promise.reject(new Error("Invalid tool id: id must be a positive number"));
  }

  return apiCall<any[]>({
    url: `/api/contracts/history-table`,
    params: { toolId },
  });
}

export async function getHistoryTable(
  toolId?: number | string,
  from?: string,
  to?: string
): Promise<any[]> {
const requestDb = db;
  if (!networkStore.isOffline) {
    try {
      const params: any = {};
      if (toolId) params.toolId = toolId;
      if (from) params.from = from;
      if (to) params.to = to;
      
      const historyRows = await apiCall<any[]>({
        url: `/api/contracts/history-table`,
        params: Object.keys(params).length > 0 ? params : undefined,
      });

      if (Array.isArray(historyRows)) {
        for (const row of historyRows) {
          if (!row.id) continue;
          const existing = await requestDb.contracts.where('id').equals(row.id).first();
      if (existing?.syncStatus === 'pending') continue;
          if (existing) {
            await requestDb.contracts.update(existing.offlineId, {
              clientId: row.clientId || existing.clientId,
              clientName: row.clientName || existing.clientName,
              toolName: row.toolName || existing.toolName,
              contractNumber: row.contractNumber || existing.contractNumber,
              startDateTime: row.startDateTime || existing.startDateTime,
              returnDate: row.returnDate || existing.returnDate,
              status: row.status || existing.status,
              amount: row.amount !== undefined ? row.amount : existing.amount
            });
          } else {
            await requestDb.contracts.add({
              id: row.id,
              offlineId: crypto.randomUUID(),
              clientId: row.clientId || 0,
              clientName: row.clientName,
              toolId: row.toolId || 0,
              toolName: row.toolName,
              contractNumber: row.contractNumber,
              startDateTime: row.startDateTime,
              returnDate: row.returnDate,
              status: row.status || 'CLOSED',
              amount: row.amount || 0,
              syncStatus: 'synced',
              updatedAt: Date.now()
            });
          }
        }
      }

      return historyRows;
    } catch (e) {
      console.warn("Failed to fetch history table from server, falling back to local DB", e);
    }
  }

  // Fallback to local DB (History = CLOSED or TERMINATED, plus filtering by toolId and dates)
  let localDocs = await requestDb.contracts.where('status').notEqual('ACTIVE').toArray();
  const allClients = await requestDb.clients.toArray();
  const allTools = await requestDb.tools.toArray();

  if (toolId) {
    localDocs = localDocs.filter(d => (d.toolIds ?? [d.toolId]).includes(Number(toolId)));
  }

  if (from) {
    const fromTime = new Date(from).getTime();
    localDocs = localDocs.filter(d => d.startDateTime && new Date(d.startDateTime).getTime() >= fromTime);
  }

  if (to) {
    const toTime = new Date(to).getTime();
    localDocs = localDocs.filter(d => d.startDateTime && new Date(d.startDateTime).getTime() <= toTime);
  }

  return Promise.all(localDocs.map(async (doc, idx) => {
    let clientName = doc.clientName;
    let clientId = doc.clientId;

    if (!clientName || !clientId || clientId === 0) {
      const matchedClient = allClients.find(c => 
        (c.id && clientId && Number(c.id) === Number(clientId)) ||
        (Array.isArray(c.documents) && c.documents.some((d: any) => d.id === doc.id))
      ) || (allClients.length === 1 ? allClients[0] : undefined);

      if (matchedClient) {
        clientName = matchedClient.fullName;
        clientId = matchedClient.id;
        requestDb.contracts.update(doc.offlineId, { clientName, clientId }).catch(() => {});
      }
    } else if (clientId && !clientName) {
      const client = await requestDb.clients.get(Number(clientId));
      if (client) {
        clientName = client.fullName;
        requestDb.contracts.update(doc.offlineId, { clientName }).catch(() => {});
      }
    }
    
    let toolName = doc.toolName;
    let toolId = doc.toolId;
    if (!toolName && toolId) {
      const tool = await requestDb.tools.get(Number(toolId));
      if (tool) toolName = tool.name || tool.inventoryNumber;
    }

    return {
      index: idx + 1,
      contractId: doc.id || 0,
      offlineId: doc.offlineId,
      contractNumber: doc.contractNumber,
      clientId: clientId || 0,
      clientName: clientName || (clientId ? `Клиент #${clientId}` : (allClients[0]?.fullName || "Клиент")),
      toolName: toolName || (toolId ? `Инструмент #${toolId}` : (allTools[0]?.name || "Инструмент")),
      startDate: doc.startDateTime,
      endDate: doc.returnDate || (doc as any).terminatedAt || "-",
      status: doc.status === 'CLOSED' ? 'Закрыт' : (doc.status === 'TERMINATED' ? 'Расторгнут' : doc.status),
      balance: doc.amount || 0
    };
  }));
}

export const contractsAPI = {
  getClientDocuments,
  getAvailableTools,
  createContract,
  update: updateContract,
  close: closeContract,
  restore: restoreContract,
  downloadExcel: downloadExcelContract,
  downloadExistingExcel: downloadExistingExcelContract,
  getActiveTable,
  getById,
  getHistoryByTool,
  getHistoryTable
};
