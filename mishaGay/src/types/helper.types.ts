/**
 * DTO ответов от /api/v1/tools/*  (Helper-эндпоинты бэка)
 * Бэкенд: HelperController → GET /api/v1/tools/whatsapp
 *                            GET /api/v1/tools/check-pin
 *
 * DTO ответов от portal.sot.kg
 * Внешний API: GET https://portal.sot.kg/api/v1/get_debtor/{pin}/
 */

// ─── WhatsApp ────────────────────────────────────────────────────────────────

/** Ответ на запрос WhatsApp-ссылки */
export interface WhatsAppResponse {
  /** Нормализованный номер: 996XXXXXXXXX */
  phone: string;
  /** Готовая ссылка: https://wa.me/996XXXXXXXXX */
  url: string;
}

// ─── Наш бэк (PinCheck) ──────────────────────────────────────────────────────

/** Ответ на валидацию ПИН-кода (наш бэкенд) */
export interface PinCheckResponse {
  /** true — ПИН валиден (ровно 14 цифр) */
  valid: boolean;
  /** Нормализованный ПИН или null при ошибке */
  pin: string | null;
  /** URL для открытия (portal.sot.kg) или null при ошибке */
  targetUrl: string | null;
  /** Человекочитаемое сообщение */
  message: string;
}

// ─── portal.sot.kg (DebtorInfo) ──────────────────────────────────────────────

export interface SotKgAttachment {
  file: string;
  created_at: string;
}

export interface SotKgExecutiveDoc {
  id: number;
  content: string;
  attachment: SotKgAttachment;
}

export interface SotKgCaseStatus {
  name: string;
}

export interface SotKgCourt {
  name: string;
}

export interface SotKgClaimCategory {
  name: string;
}

export interface SotKgClaimant {
  name: string;
}

export interface SotKgExecutor {
  full_name: string;
  phone_number: string;
  email: string;
}

export interface SotKgCase {
  case_number: string;
  sum: number;
  percent_of_the_sum: number;
  payment_code: string | null;
  is_paid: boolean;
  fee_is_paid: boolean;
  created_at: string;

  case_status: SotKgCaseStatus;
  court: SotKgCourt;
  claim_category: SotKgClaimCategory;
  claimants: SotKgClaimant[];
  executor: SotKgExecutor;
  executive_doc: SotKgExecutiveDoc[];
  erpncases: unknown[];
  projects: unknown[];
}

/** Полный ответ от portal.sot.kg при найденном должнике */
export interface SotKgDebtorInfo {
  fullname: string;
  pin: string;
  case: SotKgCase[];
}
