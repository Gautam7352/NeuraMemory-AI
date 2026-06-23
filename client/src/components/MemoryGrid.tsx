import React from 'react';
import MemoryCard from './MemoryCard';
import type { Memory } from '../lib/memoryFilters';

interface MemoryGridProps {
  memories: Memory[];
  loading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
  onUpdateMemory: (id: string, text: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  onRetry: () => void;
}

const MemoryGrid: React.FC<MemoryGridProps> = ({
  memories,
  loading,
  error,
  hasActiveFilters,
  onUpdateMemory,
  onDeleteMemory,
  onRetry,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm font-medium">
          Synchronizing memories...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 border border-red-500/20 bg-red-500/5 rounded-2xl">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="text-center">
          <p className="text-red-400 font-medium mb-1">Retrieval Failed</p>
          <p className="text-gray-500 text-xs">{error}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg px-6 py-2 transition-all active:scale-95"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-neutral-900/40 rounded-3xl border border-dashed border-neutral-800">
        <div className="text-4xl mb-4 opacity-50">📥</div>
        <p className="text-gray-400 font-medium">
          {hasActiveFilters
            ? 'No matches found in your vault'
            : 'Your memory vault is empty'}
        </p>
        <p className="text-gray-500 text-xs mt-2 text-center max-w-xs px-4">
          {hasActiveFilters
            ? 'Try adjusting your filters or search keywords to find what you are looking for.'
            : 'Start by adding a new text note, link, or document from the dashboard.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {memories.map((memory) => (
        <MemoryCard
          key={memory.id}
          memory={memory}
          onUpdate={onUpdateMemory}
          onDelete={onDeleteMemory}
        />
      ))}
    </div>
  );
};

export default MemoryGrid;
