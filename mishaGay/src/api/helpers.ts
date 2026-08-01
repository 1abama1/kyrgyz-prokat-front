/**
 * API-модуль для Helper-эндпоинтов
 *
 * Эндпоинты нашего бэкенда:
 *   GET /api/v1/tools/whatsapp?phone=...    → WhatsAppResponse | 400
 *   GET /api/v1/tools/check-pin?pin=...     → PinCheckResponse (200 или 400)
 *
 * Внешний API (прямой запрос, без авторизации):
 *   GET https://portal.sot.kg/api/v1/get_debtor/{pin}/  → SotKgDebtorInfo
 */

import axios from "axios";
import { apiCall } from "./client";
import type {
  WhatsAppResponse,
  PinCheckResponse,
  SotKgDebtorInfo,
} from "../types/helper.types";

/** Отдельный axios-инстанс для portal.sot.kg (без Authorization, без baseURL нашего бэка) */
const sotKgClient = axios.create({
  baseURL: "https://portal.sot.kg",
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

export const helperAPI = {
  /**
   * Генерирует WhatsApp-ссылку по номеру телефона.
   * Бэкенд нормализует любой KG-формат:  0700... / 700... / 996700...
   * @throws ApiError при невалидном формате (HTTP 400)
   */
  getWhatsAppUrl: (phone: string): Promise<WhatsAppResponse> =>
    apiCall<WhatsAppResponse>({
      url: "/api/v1/tools/whatsapp",
      params: { phone },
    }),

  /**
   * Валидирует ПИН через наш бэкенд (ровно 14 цифр).
   * Возвращает PinCheckResponse в любом случае — исключения только при сети.
   */
  checkPin: async (pin: string): Promise<PinCheckResponse> => {
    try {
      return await apiCall<PinCheckResponse>({
        url: "/api/v1/tools/check-pin",
        params: { pin },
      });
    } catch (err: any) {
      if (err && typeof err === "object" && err.status === 400) {
        return {
          valid: false,
          pin: null,
          targetUrl: null,
          message: err.message ?? "Некорректный ПИН",
        };
      }
      throw err;
    }
  },

  /**
   * Запрашивает данные о должнике напрямую с portal.sot.kg.
   *
   * GET https://portal.sot.kg/api/v1/get_debtor/{pin}/
   *
   * Возвращает null если должник не найден (404).
   * @throws Error при сетевых ошибках / 5xx
   */
  getDebtorInfo: async (pin: string): Promise<SotKgDebtorInfo | null> => {
    try {
      const response = await sotKgClient.get<SotKgDebtorInfo>(
        `/api/v1/get_debtor/${pin}/`
      );
      return response.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          return null; // Должник не найден — нормальная ситуация
        }
        const msg =
          (err.response?.data as any)?.detail ||
          (err.response?.data as any)?.message ||
          err.message ||
          "Ошибка запроса к portal.sot.kg";
        throw new Error(msg);
      }
      throw err;
    }
  },
};
