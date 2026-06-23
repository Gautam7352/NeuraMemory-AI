import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import {
  type Memory,
  buildQueryParams,
  filterMemories,
} from '../lib/memoryFilters';
import FilterBar from './FilterBar';
import MemoryGrid from './MemoryGrid';

const ManageMemories = () => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedKind, setSelectedKind] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalFetched, setTotalFetched] = useState(0);

  const fetchMemories = useCallback(async (kind: string, source: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQueryParams(kind, source);
      const res = await api.get<{ success: boolean; data: Memory[] }>(
        `/api/v1/memories${query}`,
      );
      const data = res.data.data ?? [];
      setMemories(data);
      setTotalFetched(data.length);
    } catch {
      setError('Failed to load memories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and re-fetch when kind/source filters change
  useEffect(() => {
    fetchMemories(selectedKind, selectedSource);
  }, [fetchMemories, selectedKind, selectedSource]);

  // Derived: apply client-side text search
  const visibleMemories = filterMemories(memories, searchQuery);

  const handleClear = () => {
    setSelectedKind('');
    setSelectedSource('');
    setSearchQuery('');
  };

  const handleUpdateMemory = async (id: string, text: string) => {
    try {
      await api.patch(`/api/v1/memories/${id}`, { text });
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text } : m)),
      );
    } catch {
      alert('Failed to update memory. Please try again.');
      throw new Error('Update failed');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    const confirmed = window.confirm(
      'Delete this memory? This cannot be undone.',
    );
    if (!confirmed) return;
    try {
      await api.delete(`/api/v1/memories/${id}`);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert('Failed to delete memory. Please try again.');
      throw new Error('Delete failed');
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      'Delete ALL memories? This cannot be undone.',
    );
    if (!confirmed) return;
    try {
      await api.delete('/api/v1/memories');
      setMemories([]);
    } catch {
      alert('Failed to delete all memories. Please try again.');
    }
  };

  const hasActiveFilters =
    selectedKind !== '' || selectedSource !== '' || searchQuery !== '';

  return (
    <main className="flex flex-col items-center w-full bg-black p-3 sm:p-4 md:p-8 flex-1 overflow-y-auto">
      <div className="w-full max-w-7xl min-h-[70vh] bg-neutral-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-800 p-4 sm:p-6 md:p-10 flex flex-col gap-6 mx-auto">
        {/* Header */}
        <div className="w-full rounded-2xl border border-gray-700 bg-linear-to-r from-neutral-900 via-neutral-900 to-slate-900/60 p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 w-fit text-sm font-medium text-slate-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg px-3 py-1.5 transition-colors duration-150"
            >
              <svg
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-300 mb-2">
                  Memory Workspace
                </p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                  Manage Memories
                </h1>
                <p className="text-gray-300 text-sm md:text-base mt-2 max-w-2xl">
                  Organize your saved notes, revisit important context, and
                  clean up entries you no longer need.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => navigate('/')}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg px-4 py-2 h-fit transition shadow cursor-pointer"
                >
                  + New Memory
                </button>
                {memories.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold rounded-lg px-4 py-2 h-fit transition shadow cursor-pointer"
                  >
                    Delete All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar section */}
        <div className="w-full rounded-2xl border border-gray-700 bg-neutral-900/60 px-4 py-4 md:px-6">
          <FilterBar
            selectedKind={selectedKind}
            selectedSource={selectedSource}
            searchQuery={searchQuery}
            disabled={loading}
            onKindChange={setSelectedKind}
            onSourceChange={setSelectedSource}
            onSearchChange={setSearchQuery}
            onClear={handleClear}
          />
        </div>

        {/* Memory list */}
        <div className="w-full rounded-2xl border border-gray-700 bg-[#232b36] p-4 md:p-6 min-h-[400px]">
          {/* Memory count */}
          {!loading && !error && totalFetched > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              {hasActiveFilters
                ? `Showing ${visibleMemories.length} of ${totalFetched} memories`
                : `${totalFetched} memories`}
            </p>
          )}

          <MemoryGrid
            memories={visibleMemories}
            loading={loading}
            error={error}
            hasActiveFilters={hasActiveFilters}
            onUpdateMemory={handleUpdateMemory}
            onDeleteMemory={handleDeleteMemory}
            onRetry={() => fetchMemories(selectedKind, selectedSource)}
          />
        </div>
      </div>
    </main>
  );
};

export default ManageMemories;
