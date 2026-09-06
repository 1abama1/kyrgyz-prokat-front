/**
 * Единая утилита для определения сетевых ошибок.
 * Заменяет дублирующийся код в auth.ts, axios.ts и других местах.
 */
export function isNetworkError(error: unknown): boolean {
  if (!navigator.onLine) return true;
  if (error == null) return false;

  const err = error as Record<string, any>;

  // Axios error codes
  if (err?.code === "ERR_NETWORK") return true;
  if (err?.code === "ECONNREFUSED") return true;

  // Axios/fetch message patterns
  const message: string = err?.message ?? "";
  if (message.includes("Network Error")) return true;
  if (message.includes("INTERNET_DISCONNECTED")) return true;
  if (message.includes("fetch")) return true;

  // Server-side errors (5xx) — treated as network-unavailable for offline fallback
  const status: number | undefined = err?.response?.status;
  if (status !== undefined && status >= 500) return true;

  return false;
}
