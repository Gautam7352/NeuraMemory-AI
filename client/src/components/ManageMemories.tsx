import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

type Memory = {
  id: string;
  text: string;
  kind: string;
  createdAt: string;
};

const ManageMemories = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: Memory[] }>(
        '/api/v1/memories',
      );
      setMemories(res.data.data ?? []);
    } catch {
      setError('Failed to load memories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

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

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black p-3 sm:p-4 md:p-8">
      <div className="w-full max-w-7xl min-h-[70vh] bg-neutral-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-800 p-4 sm:p-6 md:p-10 flex flex-col gap-6 mx-auto">
        <div className="w-full rounded-2xl border border-gray-700 bg-linear-to-r from-neutral-900 via-neutral-900 to-slate-900/60 p-4 sm:p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-300 mb-2">
                Memory Workspace
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                Manage Memories
              </h1>
              <p className="text-gray-300 text-sm md:text-base mt-2 max-w-2xl">
                Organize your saved notes, revisit important context, and clean
                up entries you no longer need.
              </p>
            </div>
            <button className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg px-4 py-2 h-fit transition shadow">
              + New Memory
            </button>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-gray-700 bg-[#232b36] p-4 md:p-6">
          {loading && (
            <p className="text-gray-400 text-sm text-center py-8">
              Loading memories...
            </p>
          )}
          {error && (
            <p className="text-red-400 text-sm text-center py-8">{error}</p>
          )}
          {!loading && !error && memories.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              No memories found.
            </p>
          )}
          {!loading && !error && memories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="rounded-2xl border border-gray-600 bg-neutral-900/80 p-5 shadow-md flex flex-col min-h-[190px]"
                >
                  <div className="flex items-start justify-end gap-2 mb-3 flex-wrap">
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
                      type="button"
                      onClick={() => handleDelete(memory.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-cyan-400 mb-1">
                    {memory.kind}
                  </div>
                  <div className="text-sm leading-6 text-gray-300 flex-1">
                    {memory.text}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-3">
                    {new Date(memory.createdAt).toLocaleDateString()}
                  </div>
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
