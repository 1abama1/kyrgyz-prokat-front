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

// ✅ RESPONSE INTERCEPTOR: обрабатываем 403 и автоматически refresh токена
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // ✅ Если 403 и мы ещё не пытались refresh
    // Пропускаем refresh для самого refresh запроса (чтобы избежать бесконечного цикла)
    const requestUrl = originalRequest?.url || "";
    const fullUrl = originalRequest?.baseURL
      ? `${originalRequest.baseURL}${requestUrl}`
      : requestUrl;
    const isRefreshRequest =
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("auth/refresh") ||
      fullUrl.includes("/api/auth/refresh") ||
      fullUrl.includes("auth/refresh");

    if (
      error.response?.status === 403 &&
      originalRequest &&
      !originalRequest._retry &&
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

        // Backend принимает refresh token через QUERY PARAM
        // Используем прямой axios.get (не через api), чтобы избежать цикла
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
      } catch (err) {
        // Обрабатываем очередь с ошибкой
        processQueue(err, null);

        // ❗ Refresh token просрочен → logout
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
