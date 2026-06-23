import React, { useState } from 'react';
import type { Memory } from '../lib/memoryFilters';

interface MemoryCardProps {
  memory: Memory;
  onUpdate: (id: string, newText: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(memory.text);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await onUpdate(memory.id, editText);
      setIsEditing(false);
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditText(memory.text);
    setIsEditing(false);
  };

  return (
    <div className="rounded-2xl border border-gray-600 bg-neutral-900/80 p-5 shadow-md flex flex-col min-h-[190px] transition-all hover:border-gray-500">
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

      {isEditing ? (
        <div className="flex flex-col gap-2 flex-1">
          <textarea
            className="w-full bg-neutral-800 text-gray-200 text-sm rounded-md p-2 border border-gray-600 resize-none focus:outline-none focus:border-cyan-500"
            rows={4}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            disabled={saving}
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-md px-3 py-1.5 transition disabled:opacity-50"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              className="bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-semibold rounded-md px-3 py-1.5 transition disabled:opacity-50"
              type="button"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-sm leading-6 text-gray-300 flex-1 whitespace-pre-wrap">
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
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit
              </button>
              <button
                className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 text-xs font-semibold rounded-md px-3 py-1 transition"
                type="button"
                onClick={() => onDelete(memory.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MemoryCard;
