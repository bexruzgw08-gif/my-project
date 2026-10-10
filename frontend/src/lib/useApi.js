import { useCallback, useEffect, useRef, useState } from 'react';
import { unwrap } from './api.js';

/**
 * Small data-fetching hook: useApi(() => api.get('/x'), [deps]).
 * Returns { data, error, loading, reload, setData }.
 */
export function useApi(request, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const reqRef = useRef(request);
  reqRef.current = request;
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await unwrap(reqRef.current());
      if (id === seq.current) setData(result);
    } catch (err) {
      if (id === seq.current) setError(err);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return { data, error, loading, reload: load, setData };
}
