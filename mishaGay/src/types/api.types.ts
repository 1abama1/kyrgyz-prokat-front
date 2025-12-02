export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Ожидаемый формат ответа от POST /api/auth/login
 * Backend возвращает: { accessToken: "...", refreshToken: "..." }
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId?: number;
  email?: string;
}

/**
 * Формат запроса для GET /api/auth/refresh?refreshToken=xxxxx
 * 
 * Backend ожидает refreshToken в QUERY PARAM, не в body
 * Этот интерфейс используется для документации
 */
export interface RefreshRequest {
  refreshToken: string;
}

/**
 * Ожидаемый формат ответа от GET /api/auth/refresh?refreshToken=xxxxx
 * Backend возвращает НОВЫЕ токены: { accessToken: "...", refreshToken: "..." }
 * ВАЖНО: refreshToken тоже обновляется при каждом refresh!
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

