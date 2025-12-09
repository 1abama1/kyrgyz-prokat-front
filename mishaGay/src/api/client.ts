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
  data?: unknown; // Альтернативное название для body (для совместимости)
  headers?: Record<string, string>;
  skipAuth?: boolean; // Для запросов без авторизации (например, login)
  isMultipart?: boolean;
  url?: string; // Для нового формата с объектом
  params?: Record<string, string | number | boolean | undefined>; // Query параметры
}

/**
 * Обёртка над axios для обратной совместимости
 * Теперь использует axios instance с автоматическим refresh токена
 * 
 * Поддерживает два формата:
 * 1. Старый: apiCall<T>(endpoint, options)
 * 2. Новый: apiCall<T>({ url, method, data, ... })
 */
export async function apiCall<T>(
  endpointOrOptions: string | ApiCallOptions,
  options?: ApiCallOptions
): Promise<T> {
  try {
    // Определяем формат вызова
    let endpoint: string;
    let callOptions: ApiCallOptions;
    
    if (typeof endpointOrOptions === "string") {
      // Старый формат: apiCall<T>(endpoint, options)
      endpoint = endpointOrOptions;
      callOptions = options || {};
    } else {
      // Новый формат: apiCall<T>({ url, method, data, ... })
      callOptions = endpointOrOptions;
      endpoint = callOptions.url || "";
      if (!endpoint) {
        throw new Error("URL is required in apiCall options");
      }
    }

    const config: {
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      headers?: Record<string, string>;
      data?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
    } = {
      method: callOptions.method || "GET",
    };

    // Добавляем query параметры, если они есть
    if (callOptions.params) {
      config.params = callOptions.params;
    }

    // Настройка заголовков
    if (callOptions.headers) {
      config.headers = { ...callOptions.headers };
    }

    // Для multipart запросов (FormData)
    const body = callOptions.data || callOptions.body;
    const isFormDataBody =
      typeof FormData !== "undefined" && body instanceof FormData;
    const isMultipart = callOptions.isMultipart || isFormDataBody;

    if (!isMultipart && !config.headers?.["Content-Type"]) {
      config.headers = config.headers || {};
      config.headers["Content-Type"] = "application/json";
    }

    // Если skipAuth, передаём флаг в axios config
    // (interceptor проверит этот флаг и не добавит Authorization)

    // Тело запроса
    if (body) {
      config.data = body;
    }

    const response = await api.request<T>({
      url: endpoint,
      method: config.method,
      headers: config.headers,
      data: config.data,
      params: config.params,
      skipAuth: callOptions.skipAuth, // Передаём флаг в axios config
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

