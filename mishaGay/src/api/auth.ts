import bcrypt from "bcryptjs";
import { apiCall } from "./client";
import { api } from "./axios";
import { networkStore } from "../store/networkStore";
import {
  LoginRequest,
  LoginResponse,
  RefreshResponse
} from "../types/api.types";
import {
  setTokens,
  clearTokens,
  getRefreshToken,
  isAuthenticated as checkAuth
} from "../utils/auth";
import { isNetworkError } from "../utils/networkError";

// ── Ключи хранилища ──────────────────────────────────────────────────────────

const OFFLINE_CREDENTIALS_KEY = "offline_pw_hash";

/**
 * Сохраняет bcrypt-хэш пароля при успешном онлайн-логине.
 * sessionStorage — очищается при закрытии приложения, минимизирует окно риска XSS.
 */
function storeOfflineCredentials(password: string): void {
  const hash = bcrypt.hashSync(password, 10);
  sessionStorage.setItem(OFFLINE_CREDENTIALS_KEY, hash);
}

/**
 * Проверяет пароль против сохранённого bcrypt-хэша.
 * Возвращает true только если хэш существует и пароль верен.
 */
function verifyOfflineCredentials(password: string): boolean {
  const hash = sessionStorage.getItem(OFFLINE_CREDENTIALS_KEY);
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

// ── Refresh token ─────────────────────────────────────────────────────────────

/**
 * Обновляет access token через refresh token (ручной вызов).
 * Автоматический refresh происходит через axios interceptor в api/axios.ts.
 * @returns true если успешно, false если refresh токен невалиден
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    // POST body — токен не попадает в логи сервера
    const response = await api.post<RefreshResponse>("/api/auth/refresh", {
      refreshToken,
    }, {
      skipAuth: true,
    });

    setTokens(response.data.accessToken, response.data.refreshToken);
    return true;
  } catch (error) {
    console.error("Refresh token error:", error);
    return false;
  }
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // Всегда сначала пытаемся войти через сервер (даже если ранее был оффлайн)
    try {
      const response = await apiCall<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: credentials,
        skipAuth: true
      });

      const accessToken = response.accessToken;
      const refreshToken = response.refreshToken;

      if (accessToken && refreshToken) {
        setTokens(accessToken, refreshToken);
        localStorage.setItem("last_user", JSON.stringify({ email: credentials.email }));
        // ✅ Сохраняем хэш пароля для оффлайн-проверки (Вариант A)
        storeOfflineCredentials(credentials.password);
        networkStore.setManualOffline(false);
      } else {
        throw new Error("Токены не получены от сервера");
      }

      return response;
    } catch (error: any) {
      // Если сервер недоступен — пробуем оффлайн-логин с проверкой пароля
      if (isNetworkError(error)) {
        console.warn("Backend unavailable on login, attempting offline login:", error);

        // ✅ Проверяем пароль против bcrypt-хэша из предыдущего онлайн-логина
        if (!verifyOfflineCredentials(credentials.password)) {
          // Либо первый запуск без онлайн-сессии, либо неверный пароль
          const hasSavedHash = !!sessionStorage.getItem(OFFLINE_CREDENTIALS_KEY);
          if (hasSavedHash) {
            throw new Error("Неверный пароль. Оффлайн-доступ запрещён.");
          } else {
            throw new Error("Сервер недоступен, а предыдущая сессия не найдена. Войдите онлайн хотя бы один раз.");
          }
        }

        const offlineAccessToken = `offline_token_${Date.now()}`;
        const offlineRefreshToken = `offline_refresh_${Date.now()}`;
        setTokens(offlineAccessToken, offlineRefreshToken);
        localStorage.setItem("last_user", JSON.stringify({ email: credentials.email }));
        networkStore.setManualOffline(true);
        return {
          accessToken: offlineAccessToken,
          refreshToken: offlineRefreshToken,
        };
      }

      throw error;
    }
  },

  loginOffline: (): void => {
    const lastUserStr = localStorage.getItem("last_user");
    const email = lastUserStr ? JSON.parse(lastUserStr).email : "offline@user.local";
    const offlineAccessToken = `offline_token_${Date.now()}`;
    const offlineRefreshToken = `offline_refresh_${Date.now()}`;
    setTokens(offlineAccessToken, offlineRefreshToken);
    localStorage.setItem("last_user", JSON.stringify({ email }));
    networkStore.setManualOffline(true);
  },

  refresh: async (): Promise<RefreshResponse> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("Refresh token not found");
    }

    // POST body — токен не попадает в логи сервера
    const response = await api.post<RefreshResponse>("/api/auth/refresh", {
      refreshToken,
    }, {
      skipAuth: true,
    });

    setTokens(response.data.accessToken, response.data.refreshToken);

    return response.data;
  },

  logout: async (): Promise<void> => {
    clearTokens();
    sessionStorage.removeItem(OFFLINE_CREDENTIALS_KEY);
    // Clear reference tables on logout
    const { db } = await import("../db/db");
    await db.clients.clear();
    await db.tools.clear();
    await db.categories.clear();
    await db.templates.clear();
    await db.contracts.clear();
    await db.bookings.clear();
    localStorage.removeItem('lastSyncTimestamp');
    
    window.location.hash = "#/login";
  },

  isAuthenticated: (): boolean => {
    return checkAuth();
  }
};
