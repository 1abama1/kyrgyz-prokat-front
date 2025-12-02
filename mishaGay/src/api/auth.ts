import { apiCall } from "./client";
import { api } from "./axios";
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshRequest, 
  RefreshResponse 
} from "../types/api.types";
import { 
  setTokens, 
  clearTokens, 
  getRefreshToken, 
  isAuthenticated as checkAuth 
} from "../utils/auth";
import { API_BASE_URL } from "../utils/constants";

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
    } else {
      throw new Error("Токены не получены от сервера");
    }
    
    return response;
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
  
  logout: (): void => {
    clearTokens();
    window.location.href = "/login";
  },

  isAuthenticated: (): boolean => {
    return checkAuth();
  }
};

