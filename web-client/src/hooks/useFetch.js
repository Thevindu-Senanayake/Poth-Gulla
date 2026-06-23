import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../App';

// Generic async data hook. Re-runs when any dep changes or when the global refreshKey bumps.
export function useFetch(fn, deps = []) {
  const { refreshKey } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(fn)
      .then((res) => { if (alive) setData(res); })
      .catch((e) => { if (alive) setError(e?.response?.data?.message ?? e?.message ?? 'Request failed'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run, refreshKey]);

  return { data, loading, error, reload: run, setData };
}
