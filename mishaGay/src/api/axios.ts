import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../utils/constants";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../utils/auth";
import { RefreshResponse } from "../types/api.types";

// Создаём axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Флаг для отслеживания процесса refresh
let isRefreshing = false;
// Очередь запросов, которые ждут refresh
type FailedQueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};
let failedQueue: FailedQueueItem[] = [];

// Обработка очереди после refresh
const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Расширяем тип конфига для поддержки skipAuth
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
  }
}

// ✅ REQUEST INTERCEPTOR: подставляем access token в каждый запрос
api.interceptors.request.use(
  (config) => {
    // Если skipAuth установлен, не добавляем Authorization заголовок
    if (config.skipAuth) {
      return config;
    }

    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Хелпер для сброса авторизации и перехода на логин
const redirectToLogin = () => {
  clearTokens();
  if (window.location.hash !== "#/login") {
    window.location.hash = "#/login";
  }
};

// ✅ RESPONSE INTERCEPTOR: обрабатываем 401/403 и автоматически refresh токена
api.interceptors.response.use(
  (response) => {
    // Успешный запрос означает, что сервер доступен
    import('../store/networkStore').then(({ networkStore }) => {
      if (networkStore.isManualOffline) {
        networkStore.setManualOffline(false);
        console.log("Server is back online, automatically switching to online mode.");
        import('../db/syncManager').then(({ syncManager }) => {
          syncManager.syncNow();
        });
      }
    });
    return response;
  },
  async (error: AxiosError) => {
    const isNetworkErr =
      !navigator.onLine ||
      error?.code === "ERR_NETWORK" ||
      error?.code === "ECONNREFUSED" ||
      error?.message?.includes("Network Error") ||
      error?.message?.includes("INTERNET_DISCONNECTED") ||
      error?.message?.includes("fetch") ||
      (error?.response?.status && error.response.status >= 500);

    if (isNetworkErr) {
      import('../store/networkStore').then(({ networkStore }) => {
        if (!networkStore.isManualOffline) {
          networkStore.setManualOffline(true);
          console.warn("Auto-switched to offline mode due to network error in Axios");
        }
      });
      // Если это просто фоновый пинг (например из syncManager), возвращаем ошибку,
      // но приложение уже будет в оффлайн-режиме, так что UI это отработает нормально.
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const isAuthError = status === 401 || status === 403;

    const requestUrl = originalRequest?.url || "";
    const fullUrl = originalRequest?.baseURL
      ? `${originalRequest.baseURL}${requestUrl}`
      : requestUrl;
    const isRefreshRequest =
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("auth/refresh") ||
      fullUrl.includes("/api/auth/refresh") ||
      fullUrl.includes("auth/refresh");

    // 1. Если сам запрос обновления токена вернул 401/403 (refresh token невалиден/просрочен)
    if (isAuthError && isRefreshRequest) {
      console.warn("Refresh token is invalid or expired (401/403). Redirecting to login.");
      redirectToLogin();
      return Promise.reject(error);
    }

    // 2. Если обычный запрос вернул 401 или 403 и мы ещё не пытались refresh
    if (
      isAuthError &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuth &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      // Если refresh уже идёт, добавляем запрос в очередь
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error("Refresh token not found");
        }

        // Backend принимает refresh token через QUERY PARAM: GET /api/auth/refresh?refreshToken=...
        const response = await axios.get<RefreshResponse>(`${API_BASE_URL}/api/auth/refresh`, {
          params: { refreshToken },
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // ✅ Сохраняем новые токены
        setTokens(accessToken, newRefreshToken);

        // Обновляем дефолтный заголовок
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

        // Обрабатываем очередь успешно
        processQueue(null, accessToken);

        // ✅ Повторяем исходный запрос
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err: any) {
        // Обрабатываем очередь с ошибкой
        processQueue(err, null);

        // ❗ Если это ошибка сети (сервер недоступен или оффлайн), НЕ разлогиниваем!
        const isRefreshNetworkErr =
          !navigator.onLine ||
          err?.code === "ERR_NETWORK" ||
          err?.code === "ECONNREFUSED" ||
          err?.message?.includes("Network Error") ||
          err?.message?.includes("INTERNET_DISCONNECTED") ||
          err?.message?.includes("fetch") ||
          (err?.response?.status && err.response.status >= 500);

        if (!isRefreshNetworkErr) {
          // Refresh token действительно просрочен/отклонен сервером → logout
          console.warn("Failed to refresh token, redirecting to login:", err);
          redirectToLogin();
        } else {
          // Если при рефреше упала сеть, также переводим в оффлайн
          import('../store/networkStore').then(({ networkStore }) => {
            if (!networkStore.isManualOffline) {
              networkStore.setManualOffline(true);
            }
          });
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
