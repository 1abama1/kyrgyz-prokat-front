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
      throw error;
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
  if (networkStore.isOffline) {
    const allContracts = await db.contracts.toArray();
    const client = await db.clients.get(Number(clientId));
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
        comment: d.comment
      }));
    }

    return Promise.all(matchedContracts.map(async (doc) => {
      let toolName = doc.toolName;
      if (!toolName && doc.toolId) {
        const tool = await db.tools.get(Number(doc.toolId));
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
      const existing = await db.contracts.where('id').equals(doc.id).first();
      await db.contracts.put({
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
export async function createContract(
  payload: CreateContractPayload
): Promise<any> {
  const offlineId = crypto.randomUUID();
  const now = Date.now();

  const toolId = payload.toolIds && payload.toolIds.length > 0 ? payload.toolIds[0] : payload.toolId!;
  const toolIds = payload.toolIds || (payload.toolId ? [payload.toolId] : []);

  let clientName: string | undefined = undefined;
  if (payload.clientId) {
    const client = await db.clients.get(Number(payload.clientId));
    clientName = client?.fullName;
  }

  let toolName: string | undefined = undefined;
  if (toolId) {
    const tool = await db.tools.get(Number(toolId));
    toolName = tool?.name || (tool?.inventoryNumber ? `#${tool.inventoryNumber}` : undefined);
  }

  const normalizedPayload = {
    ...payload,
    toolId,
    toolIds,
  };

  // Save to local DB and enqueue atomically
  await db.transaction('rw', db.contracts, db.syncQueue, async () => {
    await db.contracts.add({
      offlineId,
      clientId: payload.clientId,
      clientName,
      toolId,
      toolName,
      contractNumber: payload.contractNumber,
      startDateTime: new Date().toISOString(),
      status: 'ACTIVE',
      syncStatus: 'pending',
      updatedAt: now
    });

    await db.syncQueue.add({
      type: 'CREATE_CONTRACT',
      payload: normalizedPayload,
      offlineId,
      createdAt: now
    });
  });

  if (!networkStore.isOffline) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/contracts/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders()
        },
        body: JSON.stringify({ ...payload, offlineId })
      });

      if (response.ok) {
        const data = await response.json();
        
        await db.transaction('rw', db.contracts, db.syncQueue, async () => {
          // FIX #2: offlineId — первичный ключ, поэтому используем update() вместо
          // небезопасного delete() + add() (данные терялись при обрыве между операциями).
          await db.contracts.update(offlineId, {
            id: data.id,
            contractNumber: data.contractNumber,
            syncStatus: 'synced'
          });
          await db.syncQueue.where('offlineId').equals(offlineId).filter(q => q.type === 'CREATE_CONTRACT').delete();
        });
        
        return data;
      } else {
        await raiseError(response);
      }
    } catch (e: any) {
      if (e && e.status) {
        // This is a server error, not an offline network error
        throw e;
      }
      console.warn("Offline: failed to create contract on server, enqueued.", e);
    }
  } else {
    syncManager.sync();
  }

  // Return temporary object
  return { id: undefined, offlineId, ...payload };
}

/**
 * 3) Обновить договор
 *    PUT /api/admin/contracts/{contractId}
 */
export async function updateContract(
  contractId: number | undefined,
  payload: UpdateContractPayload,
  offlineId?: string
): Promise<any> {
  // FIX #4: Первичный ключ — offlineId, поэтому .get(contractId) вернёт undefined.
  // Ищем по индексированному полю 'id' (backendId).
  const finalOfflineId = offlineId || (contractId ? (await db.contracts.where('id').equals(contractId).first())?.offlineId : undefined);
  
  await db.transaction('rw', db.contracts, db.syncQueue, async () => {
    if (finalOfflineId) {
      await db.contracts.where('offlineId').equals(finalOfflineId).modify({
        comment: payload.comment,
        syncStatus: 'pending',
        updatedAt: Date.now()
      });
      
      await db.syncQueue.add({
        type: 'UPDATE_CONTRACT',
        payload: { ...payload, id: contractId },
        offlineId: finalOfflineId,
        createdAt: Date.now()
      });
    } else if (contractId) {
      await db.contracts.where('id').equals(contractId).modify({
        comment: payload.comment,
        syncStatus: 'pending',
        updatedAt: Date.now()
      });
    }
  });

  if (!networkStore.isOffline && contractId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        await db.transaction('rw', db.contracts, db.syncQueue, async () => {
          if (finalOfflineId) {
            await db.contracts.where('offlineId').equals(finalOfflineId).modify({ syncStatus: 'synced' });
            await db.syncQueue.where('offlineId').equals(finalOfflineId).filter(q => q.type === 'UPDATE_CONTRACT').delete();
          } else {
            await db.contracts.where('id').equals(contractId).modify({ syncStatus: 'synced' });
          }
        });
        return data;
      } else {
        await raiseError(response);
      }
    } catch (e: any) {
      if (e && e.status) {
        throw e;
      }
      console.warn("Offline: failed to update contract on server, enqueued.", e);
    }
  } else {
    syncManager.sync();
  }

  return { id: contractId, offlineId: finalOfflineId, ...payload };
}

/**
 * 4) Сгенерировать и скачать Excel-договор
 *    POST /api/admin/contracts/excel
 *    → возвращает xlsx как Blob
 *    ⚠️ Для Excel может потребоваться старый формат с датами
 */
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
export async function closeContract(
  contractId: number | undefined,
  payload?: { paidAmount?: number; comment?: string; isBroken?: boolean; actualReturnDate?: string },
  offlineId?: string
): Promise<any> {
  // FIX #4: Первичный ключ — offlineId, поэтому .get(contractId) вернёт undefined.
  // Ищем по индексированному полю 'id' (backendId).
  const finalOfflineId = offlineId || (contractId ? (await db.contracts.where('id').equals(contractId).first())?.offlineId : undefined);
  
  await db.transaction('rw', db.contracts, db.syncQueue, async () => {
    const updateData: any = { status: 'CLOSED', syncStatus: 'pending', updatedAt: Date.now() };
    if (payload?.paidAmount) updateData.amount = payload.paidAmount;
    if (payload?.comment) updateData.comment = payload.comment;

    if (finalOfflineId) {
      await db.contracts.where('offlineId').equals(finalOfflineId).modify(updateData);
      await db.syncQueue.add({
        type: 'CLOSE_CONTRACT',
        payload: { ...payload, id: contractId },
        offlineId: finalOfflineId,
        createdAt: Date.now()
      });
    } else if (contractId) {
      await db.contracts.where('id').equals(contractId).modify(updateData);
    }
  });

  if (!networkStore.isOffline && contractId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/contracts/${contractId}/close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders()
          },
          body: payload ? JSON.stringify(payload) : undefined
        }
      );

      if (response.ok) {
        await db.transaction('rw', db.contracts, db.syncQueue, async () => {
          if (finalOfflineId) {
            await db.contracts.where('offlineId').equals(finalOfflineId).modify({ syncStatus: 'synced' });
            await db.syncQueue.where('offlineId').equals(finalOfflineId).filter(q => q.type === 'CLOSE_CONTRACT').delete();
          } else {
            await db.contracts.where('id').equals(contractId).modify({ syncStatus: 'synced' });
          }
        });
        try { return await response.json(); } catch { return null; }
      } else {
        await raiseError(response);
      }
    } catch (e: any) {
      if (e && e.status) {
        throw e;
      }
      console.warn("Offline: failed to close contract on server, enqueued.", e);
    }
  } else {
    syncManager.sync();
  }

  return { status: 'closed', contractId, offlineId: finalOfflineId };
}



/**
 * 7) Восстановить закрытый договор
 *    POST /api/admin/contracts/{contractId}/restore
 */
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
  offlineId?: string;
}

/**
 * Получить таблицу активных договоров
 * GET /api/contracts/active-table
 */
export async function getActiveTable(): Promise<ActiveContractRow[]> {
  if (!networkStore.isOffline) {
    try {
      const data = await apiCall<ActiveContractRow[]>({
        url: "/api/contracts/active-table",
      });

      // Update local cache asynchronously in background
      (async () => {
        try {
          const allContracts = await db.contracts.toArray();
          const contractMap = new Map(allContracts.filter(c => c.id).map(c => [c.id!, c]));

          const toAdd: any[] = [];
          const updatePromises: Promise<any>[] = [];

          for (const row of data) {
            const contractId = row.contractId || (row as any).id;
            if (!contractId) continue;
            const existing = contractMap.get(contractId);
            if (existing) {
              updatePromises.push(
                db.contracts.update(existing.offlineId, {
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
            await db.contracts.bulkAdd(toAdd);
          }
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
          }
        } catch (err) {
          console.warn("Background active contracts cache update error:", err);
        }
      })();

      // Get pending offline contracts that haven't synced to server yet
      const pendingDocs = await db.contracts
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
              const client = await db.clients.get(Number(doc.clientId));
              if (client) clientName = client.fullName;
            }
            let toolName = doc.toolName;
            if (!toolName && doc.toolId) {
              const tool = await db.tools.get(Number(doc.toolId));
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
  const localDocs = await db.contracts.where('status').equals('ACTIVE').toArray();
  const allClients = await db.clients.toArray();
  const allTools = await db.tools.toArray();
  
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
        db.contracts.update(doc.offlineId, { clientName, clientId }).catch(() => {});
      }
    } else if (clientId && !clientName) {
      const client = await db.clients.get(Number(clientId));
      if (client) {
        clientName = client.fullName;
        db.contracts.update(doc.offlineId, { clientName }).catch(() => {});
      }
    }
    
    let toolName = doc.toolName;
    let toolId = doc.toolId;
    if (!toolName && toolId) {
      const tool = await db.tools.get(Number(toolId));
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

  const contract = await db.contracts.where('id').equals(Number(contractId)).first();
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
          const existing = await db.contracts.where('id').equals(row.id).first();
          if (existing) {
            await db.contracts.update(existing.offlineId, {
              clientName: row.clientName || existing.clientName,
              toolName: row.toolName || existing.toolName,
              contractNumber: row.contractNumber || existing.contractNumber,
              startDateTime: row.startDateTime || existing.startDateTime,
              returnDate: row.returnDate || existing.returnDate,
              status: row.status || existing.status,
              amount: row.amount !== undefined ? row.amount : existing.amount
            });
          } else {
            await db.contracts.add({
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
  let localDocs = await db.contracts.where('status').notEqual('ACTIVE').toArray();
  const allClients = await db.clients.toArray();
  const allTools = await db.tools.toArray();

  if (toolId) {
    localDocs = localDocs.filter(d => d.toolId === Number(toolId));
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
        db.contracts.update(doc.offlineId, { clientName, clientId }).catch(() => {});
      }
    } else if (clientId && !clientName) {
      const client = await db.clients.get(Number(clientId));
      if (client) {
        clientName = client.fullName;
        db.contracts.update(doc.offlineId, { clientName }).catch(() => {});
      }
    }
    
    let toolName = doc.toolName;
    let toolId = doc.toolId;
    if (!toolName && toolId) {
      const tool = await db.tools.get(Number(toolId));
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
