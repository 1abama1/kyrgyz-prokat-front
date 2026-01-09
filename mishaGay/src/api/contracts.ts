import { API_BASE_URL } from "../utils/constants";
import { getToken } from "../utils/auth";
import type { ToolInstance } from "../types/tool.types";
import type { RentalDocument } from "../types/RentalDocument";
import { apiCall } from "./client";

export interface CreateContractPayload {
  clientId: number;
  toolId: number; // ID конкретного экземпляра инструмента (Tool), а не модели
  contractNumber?: string; // Опционально, если бэкенд генерирует автоматически
  startDateTime?: string; // Опционально, ISO 8601 формат (2025-12-07T10:30:00)
}

export interface UpdateContractPayload {
  expectedReturnDate?: string;
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
  const response = await fetch(
    `${API_BASE_URL}/api/admin/clients/${clientId}/documents`,
    { headers: { ...buildAuthHeaders() } }
  );

  if (!response.ok) {
    await raiseError(response);
  }

  return await response.json();
}

/**
 * 1) Получить список доступных физических инструментов по шаблону (модели)
 *    GET /api/admin/contracts/available?templateId=...
 *    Возвращает только AVAILABLE экземпляры конкретной модели
 */
export async function getAvailableTools(templateId: number): Promise<ToolInstance[]> {
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
  const response = await fetch(`${API_BASE_URL}/api/admin/contracts/create`, {
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

  return await response.json();
}

/**
 * 3) Обновить договор
 *    PUT /api/admin/contracts/{contractId}
 */
export async function updateContract(
  contractId: number,
  payload: UpdateContractPayload
): Promise<RentalDocument> {
  const response = await fetch(`${API_BASE_URL}/api/admin/contracts/${contractId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await raiseError(response);
  }

  return await response.json();
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
 * 5) Закрыть договор по id RentalDocument
 *    POST /api/admin/contracts/{contractId}/close
 */
export async function closeContract(contractId: number): Promise<unknown> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/contracts/${contractId}/close`,
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

  // там void, но на всякий случай читаем json, если появится
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * 6) Разорвать договор досрочно
 *    POST /api/admin/contracts/{contractId}/terminate
 */
export async function terminateContract(
  contractId: number,
  reason: string
): Promise<unknown> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/contracts/${contractId}/terminate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders()
      },
      body: JSON.stringify({ reason })
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
}

/**
 * Получить таблицу активных договоров
 * GET /api/contracts/active-table
 */
export async function getActiveTable(): Promise<ActiveContractRow[]> {
  return apiCall<ActiveContractRow[]>({
    url: "/api/contracts/active-table",
  });
}

export async function getById(contractId: number): Promise<any> {
  if (!contractId || isNaN(contractId) || contractId <= 0) {
    return Promise.reject(new Error("Invalid contract id: id must be a positive number"));
  }

  return apiCall({
    url: `/api/contracts/${contractId}`,
  });
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

export async function getHistoryTable(toolId?: number): Promise<any[]> {
  return apiCall<any[]>({
    url: `/api/contracts/history-table`,
    params: toolId ? { toolId } : undefined,
  });
}

export const contractsAPI = {
  getClientDocuments,
  getAvailableTools,
  createContract,
  update: updateContract,
  close: closeContract,
  terminate: terminateContract,
  restore: restoreContract,
  downloadExcel: downloadExcelContract,
  getActiveTable,
  getById,
  getHistoryByTool,
  getHistoryTable
};
