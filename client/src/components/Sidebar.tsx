import { Link } from 'react-router';
import { useMemoryStats } from '../hooks/useMemoryStats';

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="text-xs font-semibold bg-neutral-800 text-neutral-200 rounded-full px-2 py-0.5 min-w-[24px] text-center">
        {value}
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      <div className="h-4 bg-neutral-800 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-neutral-800 rounded animate-pulse w-1/2" />
      <div className="h-4 bg-neutral-800 rounded animate-pulse w-2/3" />
    </div>
  );
}

export default function Sidebar() {
  const { stats, loading, error } = useMemoryStats();

  return (
    <aside className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="px-4 pt-5 pb-3 border-b border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-200 tracking-wide uppercase">
          Memory Stats
        </h2>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <p className="px-4 py-4 text-xs text-neutral-500">Could not load stats</p>
      ) : stats ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <div className="text-center">
            <p className="text-3xl font-bold text-neutral-100">{stats.total}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Total Memories</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              By Type
            </p>
            <StatRow label="Semantic" value={stats.byKind.semantic} />
            <StatRow label="Bubble" value={stats.byKind.bubble} />
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              By Source
            </p>
            <StatRow label="Text" value={stats.bySource.text} />
            <StatRow label="Link" value={stats.bySource.link} />
            <StatRow label="Document" value={stats.bySource.document} />
          </div>
        </div>
      ) : null}

      <div className="px-4 py-4 border-t border-neutral-800 space-y-2 mt-auto">
        <Link
          to="/"
          className="block w-full text-center text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg py-2 transition-colors"
        >
          + Add Memory
        </Link>
        <Link
          to="/manage-memories"
          className="block w-full text-center text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors py-1"
        >
          Manage Memories
        </Link>
      </div>
    </aside>
  );
}
