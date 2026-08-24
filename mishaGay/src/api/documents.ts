import { apiCall } from "./client";
import { Document, CreateDocumentDto, DocumentDetail } from "../types/document.types";
import { networkStore } from "../store/networkStore";
import { db } from "../db/db";

export const documentsAPI = {
  getAll: async (): Promise<Document[]> => {
    if (!networkStore.isOffline) {
      try {
        const docs = await apiCall<Document[]>("/api/admin/documents");
        if (Array.isArray(docs) && docs.length > 0) {
          for (const doc of docs) {
            if (!doc.id) continue;
            const existing = await db.contracts.where('id').equals(doc.id).first();
            await db.contracts.put({
              ...existing,
              offlineId: existing?.offlineId || (doc as any).offlineId || crypto.randomUUID(),
              id: doc.id,
              contractNumber: doc.contractNumber,
              clientId: doc.clientId,
              clientName: doc.clientName,
              toolId: doc.toolId,
              toolName: doc.toolName,
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
      } catch (e) {
        console.warn("Failed to fetch documents from server, falling back to local DB", e);
      }
    }
    const localDocs = await db.contracts.toArray();
    return Promise.all(localDocs.map(async (doc) => {
      let clientName = "";
      if (doc.clientId) {
        const client = await db.clients.get(doc.clientId);
        if (client) clientName = client.fullName;
      }

      let toolName = "";
      if (doc.toolId) {
        const tool = await db.tools.get(doc.toolId);
        if (tool) toolName = tool.name || tool.inventoryNumber;
      }

      return {
        id: doc.id || 0,
        contractNumber: doc.contractNumber || "",
        startDateTime: doc.startDateTime,
        dailyPrice: doc.amount || 0, // Fallback mapping
        amount: doc.amount || 0,
        createdAt: doc.startDateTime,
        clientId: doc.clientId,
        clientName,
        toolId: doc.toolId || 0,
        toolName,
        returnDate: doc.returnDate,
        terminatedAt: (doc as any).terminatedAt,
        terminationReason: (doc as any).terminationReason,
        status: doc.status as "ACTIVE" | "CLOSED" | "TERMINATED",
        comment: doc.comment
      } as Document;
    }));
  },
  
  getById: async (id: number | string): Promise<DocumentDetail> => {
    if (!id) {
      return Promise.reject(new Error("Invalid document id"));
    }

    const numericId = typeof id === "number" ? id : (!isNaN(Number(id)) && Number(id) > 0 ? Number(id) : null);

    if (numericId && numericId > 0 && !networkStore.isOffline) {
      try {
        const doc = await apiCall<DocumentDetail>(`/api/admin/documents/${numericId}`);
        if (doc) {
          // Update local cache
          const existing = await db.contracts.where('id').equals(doc.id).first();
          await db.contracts.put({
            ...existing,
            offlineId: existing?.offlineId || (doc as any).offlineId || crypto.randomUUID(),
            id: doc.id,
            contractNumber: doc.contractNumber,
            clientId: doc.clientId,
            clientName: doc.clientName || doc.client?.fullName,
            toolId: doc.toolId,
            toolName: doc.toolName || doc.tool?.name || (doc.tools && doc.tools[0]?.name),
            startDateTime: doc.startDateTime || doc.createdAt,
            amount: doc.amount,
            status: doc.status as any,
            returnDate: doc.returnDate,
            syncStatus: 'synced',
            updatedAt: Date.now()
          });
          if (doc.client) {
            await db.clients.put(doc.client).catch(() => {});
          }
        }
        return doc;
      } catch (e: any) {
        console.warn(`Failed to fetch document #${id} from server, falling back to IndexedDB:`, e);
      }
    }

    // Offline / Network Fallback from IndexedDB (by numeric id or offlineId)
    let contract: any = undefined;
    if (numericId && numericId > 0) {
      contract = await db.contracts.where('id').equals(numericId).first();
    }
    if (!contract) {
      contract = await db.contracts.where('offlineId').equals(String(id)).first();
    }

    if (!contract) {
      throw new Error(`Документ #${id} не найден в локальной базе данных`);
    }

    let client: any = undefined;
    if (contract.clientId) {
      client = await db.clients.get(Number(contract.clientId));
    }

    let tool: any = null;
    let tools: any[] = [];
    if (contract.toolId) {
      tool = await db.tools.get(Number(contract.toolId));
      if (tool) {
        tools = [tool];
      }
    }

    return {
      id: contract.id || 0,
      offlineId: contract.offlineId,
      contractNumber: contract.contractNumber || (contract.offlineId ? `ОФФЛАЙН-${contract.offlineId.slice(0, 6)}` : `№${id}`),
      clientId: contract.clientId,
      clientName: contract.clientName || client?.fullName || "—",
      toolId: contract.toolId || null,
      toolName: contract.toolName || tool?.name || "—",
      amount: contract.amount || 0,
      price: contract.amount || 0,
      startDateTime: contract.startDateTime,
      createdAt: contract.startDateTime || new Date().toISOString(),
      status: contract.status as DocumentStatus,
      returnDate: contract.returnDate,
      comment: contract.comment,
      client,
      tool,
      toolInstance: tool,
      tools
    } as DocumentDetail;
  },
  
  create: (documentData: CreateDocumentDto): Promise<Document> => {
    return apiCall<Document>("/api/admin/documents/create", {
      method: "POST",
      body: documentData
    });
  },
  
  close: (id: number): Promise<void> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid document id: id must be a positive number"));
    }
    return apiCall<void>(`/api/admin/documents/${id}/close`, {
      method: "POST"
    });
  }
};

