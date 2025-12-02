// Access token
export const getAccessToken = (): string | null => {
  return localStorage.getItem("accessToken");
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem("accessToken", token);
};

// Refresh token
export const getRefreshToken = (): string | null => {
  return localStorage.getItem("refresh_token");
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem("refresh_token", token);
};

// Оба токена
export const setTokens = (access: string, refresh: string): void => {
  setAccessToken(access);
  setRefreshToken(refresh);
};

export const clearTokens = (): void => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refresh_token");
};

// Проверка авторизации
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

// Обратная совместимость (deprecated)
export const getToken = (): string | null => {
  return getAccessToken();
};

export const setToken = (token: string): void => {
  setAccessToken(token);
};

export const removeToken = (): void => {
  clearTokens();
};

