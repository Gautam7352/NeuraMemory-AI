import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface HealthStatus {
  status: 'ok' | 'degraded';
  checks: {
    postgres: { ok: boolean };
    qdrant: { ok: boolean };
    crawl4ai: { ok: boolean };
  };
}

const SystemStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get<HealthStatus>('/api/v1/health');
        setHealth(res.data);
      } catch {
        setHealth({
          status: 'degraded',
          checks: {
            postgres: { ok: false },
            qdrant: { ok: false },
            crawl4ai: { ok: false },
          },
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'ok';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/40 border border-white/5 hover:border-white/10 transition-all backdrop-blur-sm group"
      >
        <div className={`relative flex h-2 w-2`}>
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isHealthy ? 'bg-cyan-400' : 'bg-red-400'} opacity-75`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${isHealthy ? 'bg-cyan-500' : 'bg-red-500'}`}
          ></span>
        </div>
        <span className="text-[10px] font-bold tracking-tighter uppercase text-neutral-400 group-hover:text-white transition-colors">
          System {health?.status || 'checking...'}
        </span>
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-48 p-3 rounded-2xl bg-neutral-900/90 border border-white/10 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 px-1">
            Infrastructure
          </h3>
          <div className="space-y-2">
            <StatusItem
              label="PostgreSQL"
              ok={health?.checks.postgres.ok ?? false}
            />
            <StatusItem
              label="Vector DB"
              ok={health?.checks.qdrant.ok ?? false}
            />
            <StatusItem
              label="Web Scraper"
              ok={health?.checks.crawl4ai.ok ?? false}
            />
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[9px] text-neutral-600 text-center uppercase tracking-tighter">
              Real-time monitoring active
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusItem = ({ label, ok }: { label: string; ok: boolean }) => (
  <div className="flex items-center justify-between px-1">
    <span className="text-[11px] text-neutral-400 font-medium">{label}</span>
    <div
      className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'bg-red-500'}`}
    />
  </div>
);

export default SystemStatus;
