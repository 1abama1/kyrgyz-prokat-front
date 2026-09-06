import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useCallback } from "react";

type Fetcher<T> = () => Promise<T>;
type QueryFn<T> = () => Promise<T | undefined>;

/**
 * Хук для работы по схеме "Local-First":
 *  1. Мгновенно возвращает данные из Dexie (реактивно через useLiveQuery)
 *  2. Параллельно запускает HTTP-fetcher, который обновляет Dexie в фоне
 *  3. При изменении Dexie — компонент перерисовывается автоматически
 *
 * @param queryFn  — функция Dexie (аналог useLiveQuery)
 * @param fetchFn  — HTTP-запрос, который обновляет Dexie (не должен возвращать данные в компонент!)
 * @param deps     — зависимости для повторного запуска fetchFn (как useEffect)
 */
export function useLocalFirst<T>(
  queryFn: QueryFn<T>,
  fetchFn: Fetcher<unknown>,
  deps: unknown[] = []
): { data: T | undefined; loading: boolean; error: string | null; refresh: () => void } {
  const hasFetched = useRef(false);
  const errorRef = useRef<string | null>(null);
  const loadingRef = useRef(true);

  // Реактивные данные из IndexedDB — обновляются автоматически при любом put/bulkPut
  const data = useLiveQuery(queryFn, deps);

  const runFetch = useCallback(async () => {
    try {
      errorRef.current = null;
      await fetchFn();
    } catch (err: any) {
      console.warn("[useLocalFirst] Background fetch failed:", err?.message ?? err);
      errorRef.current = err?.message ?? "Ошибка загрузки данных";
    } finally {
      loadingRef.current = false;
      hasFetched.current = true;
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hasFetched.current = false;
    loadingRef.current = true;
    void runFetch();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading: !hasFetched.current && data === undefined,
    error: errorRef.current,
    refresh: runFetch,
  };
}
