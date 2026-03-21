import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { MemoryStats } from '../types';

export function useMemoryStats() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .get<{ success: boolean; data: MemoryStats }>('/api/v1/memories/stats')
      .then((res) => {
        if (!cancelled) {
          setStats(res.data.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}
