import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { TextIngestion } from './ingestion/TextIngestion';
import { LinkIngestion } from './ingestion/LinkIngestion';
import { DocumentIngestion } from './ingestion/DocumentIngestion';

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'text' | 'link' | 'document';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6h16M4 10h10M4 14h16M4 18h10"
        />
      </svg>
    ),
  },
  {
    id: 'link',
    label: 'Link',
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.828 10.172a4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5M10.172 13.828a4 4 0 015.656 0l3-3a4 4 0 10-5.656-5.656l-1.5 1.5"
        />
      </svg>
    ),
  },
  {
    id: 'document',
    label: 'Document',
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6M5 8h14M7 4h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
        />
      </svg>
    ),
  },
];

// ── Component ──────────────────────────────────────────────────────────────
const MainArea = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetFeedback = () => {
    setError('');
    setSuccess('');
  };

  const handleSuccess = (msg: string) => setSuccess(msg);
  const handleError = (msg: string) => setError(msg);

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full h-full px-2 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Add to Memory
          </h1>
          <p className="text-sm text-slate-400">
            Save text, links, or documents — NeuraMemoryAI will extract and
            store the key insights.
          </p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-neutral-800">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  resetFeedback();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors duration-150 focus:outline-none cursor-pointer
                  ${
                    activeTab === tab.id
                      ? 'text-sky-400 border-b-2 border-sky-400 bg-neutral-800/50'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-neutral-800/30'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div className="p-4 sm:p-6">
            {activeTab === 'text' && (
              <TextIngestion
                onSuccess={handleSuccess}
                onError={handleError}
                onReset={resetFeedback}
              />
            )}

            {activeTab === 'link' && (
              <LinkIngestion
                onSuccess={handleSuccess}
                onError={handleError}
                onReset={resetFeedback}
              />
            )}

            {activeTab === 'document' && (
              <DocumentIngestion
                onSuccess={handleSuccess}
                onError={handleError}
                onReset={resetFeedback}
              />
            )}

            {/* Feedback messages */}
            {error && (
              <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-red-950/50 border border-red-800 text-red-400 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-400 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {success}
              </div>
            )}
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-slate-600">
          Memories are private and tied to your account. View them under{' '}
          <span className="text-slate-500 font-medium">Manage Memories</span>.
        </p>

        {/* Manage Memories action */}
        <button
          onClick={() => navigate('/manage-memories')}
          className="w-full flex items-center justify-center gap-2 border border-neutral-700 hover:border-neutral-500 text-slate-400 hover:text-white rounded-xl py-3 text-sm font-semibold transition-colors duration-150 cursor-pointer"
        >
          <svg
            width="15"
            height="15"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7h18M3 12h18M3 17h18"
            />
          </svg>
          Manage Memories
        </button>
      </div>
    </div>
  );
};

export default MainArea;
