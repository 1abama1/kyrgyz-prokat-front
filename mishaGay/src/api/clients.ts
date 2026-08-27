import { apiCall } from "./client";
import type { Client, CreateClientDto, ClientCard } from "../types/client.types";
import { API_BASE_URL } from "../utils/constants";
import { getToken } from "../utils/auth";
import type { BackendError } from "./contracts";
import { networkStore } from "../store/networkStore";
import { db } from "../db/db";

const buildAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const raiseClientError = async (response: Response): Promise<never> => {
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
      const fallback: BackendError = {
        message: raw,
        status: response.status
      };
      throw fallback;
    }
  }

  const emptyError: BackendError = {
    message: `Ошибка ${response.status}`,
    status: response.status
  };
  throw emptyError;
};

export async function getClientCard(clientId: number): Promise<ClientCard> {
  if (!clientId || isNaN(clientId) || clientId <= 0) {
    throw new Error("Invalid client id: id must be a positive number");
  }

  if (networkStore.isOffline) {
    const client = await db.clients.get(Number(clientId));
    if (!client) throw new Error("Клиент не найден в офлайн-режиме");
    const allContracts = await db.contracts.toArray();
    const activeContracts = allContracts.filter(c => 
      ((c.clientId && Number(c.clientId) === Number(clientId)) || (Array.isArray(client.documents) && client.documents.some((d: any) => d.id === c.id))) &&
      c.status === 'ACTIVE'
    );
    return {
      ...client,
      activeContracts: activeContracts.map(c => ({
        id: c.id || 0,
        contractNumber: c.contractNumber || ""
      })),
      activeContractId: activeContracts[0]?.id ?? null,
      activeContractNumber: activeContracts[0]?.contractNumber ?? null
    } as any;
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/clients/${clientId}/card`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  if (!response.ok) {
    await raiseClientError(response);
  }

  return await response.json();
}

/**
 * Получить активные договоры клиента
 * GET /api/admin/clients/{clientId}/contracts/active
 */
export async function getActiveContracts(clientId: number): Promise<any[]> {
  if (!clientId || isNaN(clientId) || clientId <= 0) {
    throw new Error("Invalid client id: id must be a positive number");
  }

  if (networkStore.isOffline) {
    const allContracts = await db.contracts.toArray();
    return allContracts.filter(c => 
      (c.clientId && Number(c.clientId) === Number(clientId)) &&
      c.status === 'ACTIVE'
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/admin/clients/${clientId}/contracts/active`,
    { headers: buildAuthHeaders() as HeadersInit }
  );

  if (!response.ok) {
    await raiseClientError(response);
  }

  return await response.json();
}

export const clientsAPI = {
  getAll: async (): Promise<Client[]> => {
    if (networkStore.isOffline) {
      return await db.clients.toArray();
    }

    try {
      const res = await apiCall<any>("/api/admin/clients?page=0&size=1000");
      const list: Client[] = res.content !== undefined ? res.content : res;
      if (Array.isArray(list)) {
        await db.clients.clear();
        if (list.length > 0) {
          await db.clients.bulkPut(list).catch(err => console.warn("Failed to cache clients to Dexie", err));
        }
      }
      return list;
    } catch (err: any) {
      console.warn("Failed to fetch clients, falling back to offline", err);
      networkStore.setManualOffline(true);
      return await db.clients.toArray();
    }
  },
  getCard: (id: number): Promise<ClientCard> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    return getClientCard(id);
  },
  getById: async (id: number): Promise<Client> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    if (networkStore.isOffline) {
      const local = await db.clients.get(id);
      if (local) return local;
      throw new Error("Клиент не найден локально в офлайн-режиме");
    }
    const client = await apiCall<Client>(`/api/admin/clients/${id}`);
    if (client) {
      db.clients.put(client).catch(() => {});
    }
    return client;
  },
  getActiveContracts: (clientId: number): Promise<any[]> => {
    if (!clientId || isNaN(clientId) || clientId <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    return getActiveContracts(clientId);
  },
  create: (clientData: CreateClientDto): Promise<Client> => {
    return apiCall<Client>("/api/admin/clients/create", {
      method: "POST",
      body: clientData
    });
  },
  uploadImages: (clientId: number, files: File[]): Promise<void> => {
    if (!clientId || isNaN(clientId) || clientId <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    return apiCall<void>(`/api/admin/clients/${clientId}/images`, {
      method: "POST",
      body: formData,
      isMultipart: true
    });
  },
  getClientById: (id: number): Promise<Client> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    return apiCall<Client>(`/api/admin/clients/${id}`);
  },
  update: (id: number, clientData: CreateClientDto): Promise<Client> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    return apiCall<Client>(`/api/admin/clients/${id}`, {
      method: "PUT",
      body: clientData
    });
  },
  updatePublic: (id: number, clientData: any): Promise<any> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    return apiCall<any>(`/api/clients/${id}`, {
      method: "PUT",
      body: clientData
    });
  }
};