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

/**
 * Обновляет access token через refresh token
 * Backend принимает refresh token через QUERY PARAM: GET /api/auth/refresh?refreshToken=xxxxx
 * 
 * ⚠️ ВНИМАНИЕ: Эта функция теперь используется только для ручного refresh.
 * Автоматический refresh токена происходит через axios interceptor в api/axios.ts
 * 
 * @returns true если успешно, false если refresh токен невалиден
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    // Используем прямой axios вызов (не через наш instance, чтобы избежать цикла)
    const response = await api.get<RefreshResponse>("/api/auth/refresh", {
      params: { refreshToken },
      skipAuth: true, // Не добавляем Authorization заголовок
    });

    // ВАЖНО! Backend возвращает НОВЫЙ refreshToken при каждом refresh
    // Нужно сохранять ОБА токена, иначе следующий refresh будет использовать старый (revoked) токен
    setTokens(response.data.accessToken, response.data.refreshToken);
    return true;
  } catch (error) {
    console.error("Refresh token error:", error);
    return false;
  }
}

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // Всегда сначала пытаемся войти через сервер (даже если ранее был оффлайн)
    try {
      // Login запрос без авторизации
      const response = await apiCall<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: credentials,
        skipAuth: true
      });

      // Backend возвращает accessToken и refreshToken
      const accessToken = response.accessToken;
      const refreshToken = response.refreshToken;

      if (accessToken && refreshToken) {
        setTokens(accessToken, refreshToken);
        localStorage.setItem("last_user", JSON.stringify({ email: credentials.email }));
        networkStore.setManualOffline(false); // При удачном логине переключаем в онлайн
      } else {
        throw new Error("Токены не получены от сервера");
      }

      return response;
    } catch (error: any) {
      // Если сервер недоступен (нет сети, сбой соединения), входим в оффлайн-режиме
      const isNetworkErr =
        !navigator.onLine ||
        error?.code === "ERR_NETWORK" ||
        error?.code === "ECONNREFUSED" ||
        error?.message?.includes("Network Error") ||
        error?.message?.includes("INTERNET_DISCONNECTED") ||
        error?.message?.includes("fetch") ||
        (error?.response?.status && error.response.status >= 500);

      if (isNetworkErr) {
        console.warn("Backend unavailable on login, falling back to offline session:", error);
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

    // Используем axios instance с skipAuth, чтобы не добавлять Authorization заголовок
    const response = await api.get<RefreshResponse>("/api/auth/refresh", {
      params: { refreshToken },
      skipAuth: true, // Не добавляем Authorization заголовок
    });

    // ВАЖНО! Backend возвращает НОВЫЙ refreshToken при каждом refresh
    // Нужно сохранять ОБА токена, иначе следующий refresh будет использовать старый (revoked) токен
    setTokens(response.data.accessToken, response.data.refreshToken);

    return response.data;
  },

  logout: async (): Promise<void> => {
    clearTokens();
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

