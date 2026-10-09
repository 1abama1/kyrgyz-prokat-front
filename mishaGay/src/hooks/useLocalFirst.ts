import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useCallback, useState } from 'react';

export function useLocalFirst<T>(queryFn: () => Promise<T | undefined>, fetchFn: () => Promise<unknown>, deps: unknown[] = []) {
  const data = useLiveQuery(queryFn, deps);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(null);
    try { await fetchRef.current(); }
    catch (err) {
      if (request === generation.current) setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    return () => { ++generation.current; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading: loading && data === undefined, error, refresh };
}
