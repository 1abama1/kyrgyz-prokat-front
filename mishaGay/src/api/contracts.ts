import { API_BASE_URL } from "../utils/constants";
import { getToken } from "../utils/auth";
import type { Tool } from "../types/tool.types";
import type { RentalDocument } from "../types/RentalDocument";

export interface CreateContractPayload {
  clientId: number;
  toolId: number;
  expectedReturnDate: string; // YYYY-MM-DD
  totalAmount: number;
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
 * 1) Получить список доступных физических инструментов по шаблону
 *    GET /api/admin/contracts/available?templateId=...
 */
export async function getAvailableTools(templateId: number): Promise<Tool[]> {
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

export const contractsAPI = {
  getClientDocuments,
  getAvailableTools,
  createContract,
  update: updateContract,
  close: closeContract,
  terminate: terminateContract,
  downloadExcel: downloadExcelContract
};
