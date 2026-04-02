import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import {
  type Memory,
  buildQueryParams,
  filterMemories,
} from '../lib/memoryFilters';
import FilterBar from './FilterBar';

const ManageMemories = () => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

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

  const handleEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditText(memory.text);
  };

  const handleSave = async (id: string) => {
    try {
      await api.patch(`/api/v1/memories/${id}`, { text: editText });
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text: editText } : m)),
      );
      setEditingId(null);
      setEditText('');
    } catch {
      alert('Failed to update memory. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Delete this memory? This cannot be undone.',
    );
    if (!confirmed) return;
    try {
      await api.delete(`/api/v1/memories/${id}`);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert('Failed to delete memory. Please try again.');
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
        <div className="w-full rounded-2xl border border-gray-700 bg-[#232b36] p-4 md:p-6">
          {/* Memory count */}
          {!loading && !error && totalFetched > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              {hasActiveFilters
                ? `Showing ${visibleMemories.length} of ${totalFetched} memories`
                : `${totalFetched} memories`}
            </p>
          )}

          {loading && (
            <p className="text-gray-400 text-sm text-center py-8">
              Loading memories...
            </p>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-red-400 text-sm text-center">{error}</p>
              <button
                type="button"
                onClick={() => fetchMemories(selectedKind, selectedSource)}
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg px-4 py-2 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && memories.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              {hasActiveFilters
                ? 'No memories found for the selected filters.'
                : 'No memories found.'}
            </p>
          )}
          {!loading &&
            !error &&
            memories.length > 0 &&
            visibleMemories.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No memories match your search.
              </p>
            )}
          {!loading && !error && visibleMemories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleMemories.map((memory) => (
                <div
                  key={memory.id}
                  className="rounded-2xl border border-gray-600 bg-neutral-900/80 p-5 shadow-md flex flex-col min-h-[190px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-cyan-400">
                      {memory.kind}
                    </span>
                    {memory.source && (
                      <span className="text-[10px] uppercase tracking-widest text-gray-500">
                        · {memory.source}
                      </span>
                    )}
                  </div>

                  {editingId === memory.id ? (
                    /* Edit mode */
                    <div className="flex flex-col gap-2 flex-1">
                      <textarea
                        className="w-full bg-neutral-800 text-gray-200 text-sm rounded-md p-2 border border-gray-600 resize-none focus:outline-none focus:border-cyan-500"
                        rows={4}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
                          type="button"
                          onClick={() => handleSave(memory.id)}
                        >
                          Save
                        </button>
                        <button
                          className="bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
                          type="button"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="text-sm leading-6 text-gray-300 flex-1">
                        {memory.text}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-gray-600">
                          {new Date(memory.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex gap-2">
                          <button
                            className="bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
                            type="button"
                            aria-label="Edit"
                            onClick={() => handleEdit(memory)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
                            type="button"
                            onClick={() => handleDelete(memory.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default ManageMemories;
