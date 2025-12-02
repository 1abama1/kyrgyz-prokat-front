import { ApiError } from '../types/api.types';
import { api } from './axios';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Расширяем тип для поддержки skipAuth
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
  }
}

interface ApiCallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean; // Для запросов без авторизации (например, login)
  isMultipart?: boolean;
}

/**
 * Обёртка над axios для обратной совместимости
 * Теперь использует axios instance с автоматическим refresh токена
 */
export async function apiCall<T>(
  endpoint: string, 
  options: ApiCallOptions = {}
): Promise<T> {
  try {
    const config: {
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      headers?: Record<string, string>;
      data?: unknown;
    } = {
      method: options.method || "GET",
    };

    // Настройка заголовков
    if (options.headers) {
      config.headers = { ...options.headers };
    }

    // Для multipart запросов (FormData)
    const isFormDataBody =
      typeof FormData !== "undefined" && options.body instanceof FormData;
    const isMultipart = options.isMultipart || isFormDataBody;

    if (!isMultipart && !config.headers?.["Content-Type"]) {
      config.headers = config.headers || {};
      config.headers["Content-Type"] = "application/json";
    }

    // Если skipAuth, передаём флаг в axios config
    // (interceptor проверит этот флаг и не добавит Authorization)

    // Тело запроса
    if (options.body) {
      config.data = options.body;
    }

    const response = await api.request<T>({
      url: endpoint,
      ...config,
      skipAuth: options.skipAuth, // Передаём флаг в axios config
    } as InternalAxiosRequestConfig);

    // Axios автоматически парсит JSON, возвращаем data
    return response.data as T;
  } catch (error) {
    // Обработка ошибок axios
    if (error instanceof AxiosError) {
      const axiosError = error as AxiosError<{ message?: string; error?: string; code?: string }>;
      
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.response?.data?.code ||
        axiosError.message ||
        `Ошибка: ${axiosError.response?.status || 'Unknown'}`;

      const apiError: ApiError = {
        message: errorMessage,
        status: axiosError.response?.status || 500,
      };

      throw apiError;
    }

    console.error("API Error:", error);
    throw error;
  }
}

