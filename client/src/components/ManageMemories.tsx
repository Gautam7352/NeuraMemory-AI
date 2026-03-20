import { useState } from 'react';

type MemoryCard = {
  title: string;
  text: string;
};

const memoryCards: MemoryCard[] = [
  {
    title: 'Project kickoff notes',
    text: 'Initial goals, scope, and delivery checkpoints for the NeuraMemory rollout.',
  },
  {
    title: 'AI research snapshot',
    text: 'Key points on vector search, retrieval quality, and prompt workflow ideas.',
  },
  {
    title: 'Client feedback digest',
    text: 'Summary of user pain points, requested features, and priority follow-ups.',
  },
];

const ManageMemories = () => {
  const [cards, setCards] = useState<MemoryCard[]>(memoryCards);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftText, setDraftText] = useState('');

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setDraftTitle(cards[index].title);
    setDraftText(cards[index].text);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraftTitle('');
    setDraftText('');
  };

  const saveEdit = () => {
    if (editingIndex === null) {
      return;
    }

    const trimmedTitle = draftTitle.trim();
    const trimmedText = draftText.trim();
    if (!trimmedTitle || !trimmedText) {
      return;
    }

    setCards((prevCards) =>
      prevCards.map((card, index) =>
        index === editingIndex
          ? { title: trimmedTitle, text: trimmedText }
          : card,
      ),
    );
    cancelEdit();
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black p-3 sm:p-4 md:p-8">
      <div className="w-full max-w-7xl min-h-[70vh] bg-neutral-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-800 p-4 sm:p-6 md:p-10 flex flex-col gap-6 mx-auto">
        <div className="w-full rounded-2xl border border-gray-700 bg-linear-to-r from-neutral-900 via-neutral-900 to-slate-900/60 p-4 sm:p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-300 mb-2">Memory Workspace</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">Manage Memories</h1>
              <p className="text-gray-300 text-sm md:text-base mt-2 max-w-2xl">
                Organize your saved notes, revisit important context, and clean up entries you no longer need.
              </p>
            </div>
            <button className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg px-4 py-2 h-fit transition shadow">
              + New Memory
            </button>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-gray-700 bg-[#232b36] p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card, index) => {
              const isEditing = editingIndex === index;
              return (
                <div key={`${card.title}-${index}`} className="rounded-2xl border border-gray-600 bg-neutral-900/80 p-5 shadow-md flex flex-col min-h-[190px]">
                  <div className="flex items-start justify-end gap-2 mb-3 flex-wrap">
                    {!isEditing && (
                      <button
                        className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
                        onClick={() => startEdit(index)}
                        type="button"
                      >
                        Edit
                      </button>
                    )}
                    {isEditing && (
                      <>
                        <button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
                          onClick={saveEdit}
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded-md px-3 py-1 transition"
                          onClick={cancelEdit}
                          type="button"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md px-3 py-1 transition" type="button">
                      Delete
                    </button>
                  </div>
                  {isEditing ? (
                    <div className="flex flex-col gap-3 flex-1">
                      <input
                        className="w-full bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        placeholder="Memory title"
                      />
                      <textarea
                        className="w-full bg-neutral-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500 resize-y min-h-[100px]"
                        value={draftText}
                        onChange={(event) => setDraftText(event.target.value)}
                        placeholder="Memory details"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="text-base font-semibold text-white mb-2">{card.title}</div>
                      <div className="text-sm leading-6 text-gray-300 flex-1">{card.text}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ManageMemories;
