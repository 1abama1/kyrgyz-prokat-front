import { apiCall } from "./client";
import type { Client, CreateClientDto, ClientCard } from "../types/client.types";
import { API_BASE_URL } from "../utils/constants";
import { getToken } from "../utils/auth";
import type { BackendError } from "./contracts";

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
  
  const response = await fetch(
    `${API_BASE_URL}/api/admin/clients/${clientId}/contracts/active`,
    { headers: { ...buildAuthHeaders() } }
  );

  if (!response.ok) {
    await raiseClientError(response);
  }

  return await response.json();
}

export const clientsAPI = {
  getAll: (): Promise<Client[]> => {
    return apiCall<Client[]>("/api/admin/clients");
  },
  getCard: (id: number): Promise<ClientCard> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    return getClientCard(id);
  },
  getById: (id: number): Promise<Client> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid client id: id must be a positive number"));
    }
    return apiCall<Client>(`/api/admin/clients/${id}`);
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
  }
};