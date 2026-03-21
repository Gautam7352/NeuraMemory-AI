import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AxiosError } from 'axios';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';

type Memory = {
  id: string;
  text: string;
  kind: string;
  source?: 'text' | 'link' | 'document';
  sourceRef?: string;
  createdAt: string;
};

type KindFilter = '' | 'semantic' | 'bubble';
type SourceFilter = '' | 'text' | 'link' | 'document';

const SOURCE_BADGE_STYLES: Record<string, string> = {
  text: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  link: 'bg-blue-900/50 text-blue-300 border-blue-700',
  document: 'bg-violet-900/50 text-violet-300 border-violet-700',
};

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const styles = SOURCE_BADGE_STYLES[source] ?? 'bg-gray-800 text-gray-400 border-gray-600';
  return (
    <span
      data-testid="source-badge"
      className={`inline-flex items-center border rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
    >
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  );
}

function SourceRef({ source, sourceRef }: { source?: string; sourceRef?: string }) {
  if (!sourceRef) return null;
  if (source === 'link') {
    return (
      <a
        href={sourceRef}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-blue-400 hover:text-blue-300 truncate block max-w-full mt-1 underline underline-offset-2"
        title={sourceRef}
      >
        {sourceRef}
      </a>
    );
  }
  if (source === 'document') {
    return (
      <span className="text-[10px] text-violet-400 truncate block max-w-full mt-1" title={sourceRef}>
        {sourceRef}
      </span>
    );
  }
  return null;
}

function MemoryCard({
  memory,
  onDelete,
  onSaveEdit,
  expanded,
  onToggleExpand,
}: {
  memory: Memory;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string, newText: string) => Promise<void>;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(memory.text);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setOverflows(el.scrollHeight > el.clientHeight);
    }
  }, [memory.text]);

  const handleEdit = () => {
    setEditText(memory.text);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditText(memory.text);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveEdit(memory.id, editText);
      setEditing(false);
    } catch {
      // onSaveEdit re-throws on failure so we stay in edit mode
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-600 bg-neutral-900/80 p-5 shadow-md flex flex-col min-h-[190px]">
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={memory.source} />
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              className="bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
              type="button"
              onClick={handleEdit}
            >
              Edit
            </button>
          )}
          <button
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
            type="button"
            onClick={() => onDelete(memory.id)}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-widest text-cyan-400 mb-1">{memory.kind}</div>

      {editing ? (
        <div className="flex flex-col gap-2 flex-1">
          <textarea
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            rows={5}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md px-3 py-1 transition flex items-center gap-1"
            >
              {saving && (
                <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              Save
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleCancel}
              className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: expanded ? '1000px' : '4.5rem' }}
          >
            <div
              ref={textRef}
              className={`text-sm leading-6 text-gray-300 ${expanded ? '' : 'line-clamp-3'}`}
            >
              {memory.text}
            </div>
          </div>

          {overflows && (
            <button
              type="button"
              className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 self-start transition"
              onClick={() => onToggleExpand(memory.id)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}

          <SourceRef source={memory.source} sourceRef={memory.sourceRef} />

          <div className="text-[10px] text-gray-600 mt-3">
            {new Date(memory.createdAt).toLocaleDateString()}
          </div>
        </>
      )}
    </div>
  );
}

function pillClass(active: boolean) {
  return active
    ? 'bg-cyan-600 text-white'
    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700';
}

const ManageMemories = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter state
  const [kindFilter, setKindFilter] = useState<KindFilter>('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('');

  // Search state (14.1)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Delete modal state (14.3)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingSingle, setDeletingSingle] = useState(false);

  // Debounce search query (14.1)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildUrl = useCallback(
    (offset: string | null, kind: KindFilter, source: SourceFilter) => {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (offset) params.set('offset', offset);
      if (kind) params.set('kind', kind);
      if (source) params.set('source', source);
      return `/api/v1/memories?${params.toString()}`;
    },
    [],
  );

  const fetchMemories = useCallback(
    async (kind: KindFilter, source: SourceFilter) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{
          success: boolean;
          data: Memory[];
          nextOffset: string | null;
          hasMore: boolean;
        }>(buildUrl(null, kind, source));
        setMemories(res.data.data ?? []);
        setNextOffset(res.data.nextOffset ?? null);
        setHasMore(res.data.hasMore ?? false);
      } catch {
        setError('Failed to load memories. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [buildUrl],
  );

  // Search fetch (14.1)
  const fetchSearch = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: Memory[] }>(
        `/api/v1/memories/search?q=${encodeURIComponent(q)}`,
      );
      setMemories(res.data.data ?? []);
      setNextOffset(null);
      setHasMore(false);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // React to debounced query changes (14.1)
  useEffect(() => {
    if (debouncedQuery.trim()) {
      fetchSearch(debouncedQuery.trim());
    } else {
      fetchMemories(kindFilter, sourceFilter);
    }
  }, [debouncedQuery, fetchSearch, fetchMemories, kindFilter, sourceFilter]);

  const handleLoadMore = async () => {
    if (!nextOffset || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: Memory[];
        nextOffset: string | null;
        hasMore: boolean;
      }>(buildUrl(nextOffset, kindFilter, sourceFilter));
      setMemories((prev) => [...prev, ...(res.data.data ?? [])]);
      setNextOffset(res.data.nextOffset ?? null);
      setHasMore(res.data.hasMore ?? false);
    } catch {
      setError('Failed to load more memories. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleKindFilter = (value: KindFilter) => {
    setKindFilter(value);
    setNextOffset(null);
    setMemories([]);
  };

  const handleSourceFilter = (value: SourceFilter) => {
    setSourceFilter(value);
    setNextOffset(null);
    setMemories([]);
  };

  // Single delete via modal (14.3)
  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmSingleDelete = async () => {
    if (!deleteTargetId) return;
    setDeletingSingle(true);
    try {
      await api.delete(`/api/v1/memories/${deleteTargetId}`);
      setMemories((prev) => prev.filter((m) => m.id !== deleteTargetId));
      showToast('success', 'Memory deleted.');
    } catch (err) {
      const msg = err instanceof AxiosError ? (err.response?.data?.message ?? 'Failed to delete memory.') : 'Failed to delete memory.';
      showToast('error', msg);
    } finally {
      setDeletingSingle(false);
      setDeleteTargetId(null);
    }
  };

  // Delete all (14.3)
  const handleConfirmDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await api.delete('/api/v1/memories');
      setMemories([]);
      setNextOffset(null);
      setHasMore(false);
      showToast('success', 'All memories deleted.');
    } catch (err) {
      const msg = err instanceof AxiosError ? (err.response?.data?.message ?? 'Failed to delete all memories.') : 'Failed to delete all memories.';
      showToast('error', msg);
    } finally {
      setDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  // Inline edit save (14.2)
  const handleSaveEdit = async (id: string, newText: string) => {
    const original = memories.find((m) => m.id === id);
    if (!original) return;

    // Optimistic update
    setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, text: newText } : m)));

    try {
      await api.patch(`/api/v1/memories/${id}`, { text: newText });
    } catch (err) {
      // Revert on error
      setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, text: original.text } : m)));
      const msg = err instanceof AxiosError ? (err.response?.data?.message ?? 'Failed to update memory.') : 'Failed to update memory.';
      showToast('error', msg);
      throw err; // re-throw so MemoryCard knows to stay in edit mode
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isSearchMode = debouncedQuery.trim() !== '';

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black p-3 sm:p-4 md:p-8">
      <div className="w-full max-w-7xl min-h-[70vh] bg-neutral-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-800 p-4 sm:p-6 md:p-10 flex flex-col gap-6 mx-auto">
        {/* Header */}
        <div className="w-full rounded-2xl border border-gray-700 bg-linear-to-r from-neutral-900 via-neutral-900 to-slate-900/60 p-4 sm:p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-300 mb-2">Memory Workspace</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">Manage Memories</h1>
              <p className="text-gray-300 text-sm md:text-base mt-2 max-w-2xl">
                Organize your saved notes, revisit important context, and clean up entries you no longer need.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className="bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg px-4 py-2 h-fit transition shadow"
                onClick={() => setShowDeleteAllModal(true)}
              >
                Delete All
              </button>
              <button
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg px-4 py-2 h-fit transition shadow"
                onClick={() => navigate('/')}
              >
                + New Memory
              </button>
            </div>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-gray-700 bg-[#232b36] p-4 md:p-6">
          {/* Search input (14.1) */}
          <div className="relative mb-4">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search memories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          {/* Filter controls — hidden in search mode (14.1) */}
          {!isSearchMode && (
            <div className="flex flex-col sm:flex-row gap-4 mb-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500 uppercase tracking-wider mr-1">Kind</span>
                {(['', 'semantic', 'bubble'] as KindFilter[]).map((val) => (
                  <button
                    key={val === '' ? 'all-kind' : val}
                    type="button"
                    className={`text-xs font-semibold rounded-full px-3 py-1 transition ${pillClass(kindFilter === val)}`}
                    onClick={() => handleKindFilter(val)}
                  >
                    {val === '' ? 'All' : val.charAt(0).toUpperCase() + val.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500 uppercase tracking-wider mr-1">Source</span>
                {(['', 'text', 'link', 'document'] as SourceFilter[]).map((val) => (
                  <button
                    key={val === '' ? 'all-source' : val}
                    type="button"
                    className={`text-xs font-semibold rounded-full px-3 py-1 transition ${pillClass(sourceFilter === val)}`}
                    onClick={() => handleSourceFilter(val)}
                  >
                    {val === '' ? 'All' : val.charAt(0).toUpperCase() + val.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <p className="text-gray-400 text-sm text-center py-8">Loading memories...</p>
          )}
          {error && (
            <p className="text-red-400 text-sm text-center py-8">{error}</p>
          )}
          {!loading && !error && memories.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              {isSearchMode ? 'No results found.' : 'No memories found.'}
            </p>
          )}
          {!loading && !error && memories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onDelete={handleDelete}
                  onSaveEdit={handleSaveEdit}
                  expanded={expandedIds.has(memory.id)}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </div>
          )}

          {/* Load more — hidden in search mode (14.1) */}
          {!isSearchMode && hasMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-6 py-2 transition"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete All modal (14.3) */}
      <ConfirmModal
        open={showDeleteAllModal}
        title="Delete All Memories"
        description="This will permanently delete all your memories. This action cannot be undone."
        confirmLabel="Delete All"
        loading={deletingAll}
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setShowDeleteAllModal(false)}
      />

      {/* Single delete modal (14.3) */}
      <ConfirmModal
        open={deleteTargetId !== null}
        title="Delete Memory"
        description="Delete this memory? This cannot be undone."
        confirmLabel="Delete"
        loading={deletingSingle}
        onConfirm={handleConfirmSingleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </main>
  );
};

export default ManageMemories;
