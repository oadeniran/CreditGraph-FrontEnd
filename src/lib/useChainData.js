"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Tiny SWR-lite. Wraps an async fetch with refresh, polling, and dependency
 * tracking. Use it instead of useEffect-+-useState-+-window.location.reload.
 *
 *   const { data, error, loading, refetch } = useChainData(
 *     () => api.getUserDashboard(address),
 *     [address],
 *     { pollMs: 0 }
 *   );
 */
export function useChainData(fetcher, deps = [], options = {}) {
  const { pollMs = 0, enabled = true } = options;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    if (!enabled || !pollMs) return;
    const id = setInterval(refetch, pollMs);
    return () => clearInterval(id);
  }, [enabled, pollMs, refetch]);

  return { data, error, loading, refetch };
}