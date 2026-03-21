import { useState, useRef } from 'react';
import { AxiosError } from 'axios';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'text' | 'link' | 'document';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h10M4 14h16M4 18h10" />
      </svg>
    ),
  },
  {
    id: 'link',
    label: 'Link',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5M10.172 13.828a4 4 0 015.656 0l3-3a4 4 0 10-5.656-5.656l-1.5 1.5" />
      </svg>
    ),
  },
  {
    id: 'document',
    label: 'Document',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M5 8h14M7 4h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
];

const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md';

// ── Component ──────────────────────────────────────────────────────────────
const MainArea = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Submit handlers ──────────────────────────────────────────────────────

  const handleTextSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = (new FormData(e.currentTarget).get('text') as string).trim();
    if (!text) return;

    setLoading(true);
    try {
      await api.post('/api/v1/memories/text', { text });
      showToast('success', 'Memory saved from text!');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      showToast('error', err instanceof AxiosError ? (err.response?.data?.message ?? 'Failed to save text.') : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = (new FormData(e.currentTarget).get('url') as string).trim();
    if (!url) return;

    setLoading(true);
    try {
      await api.post('/api/v1/memories/link', { url });
      showToast('success', 'Memory saved from link!');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      showToast('error', err instanceof AxiosError ? (err.response?.data?.message ?? 'Failed to process link.') : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('error', 'Please select a file to upload.');
      return;
    }

    setLoading(true);
    const form = new FormData();
    form.append('file', selectedFile);

    try {
      await api.post('/api/v1/memories/document', form);
      showToast('success', `Memory saved from "${selectedFile.name}"!`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      showToast('error', err instanceof AxiosError ? (err.response?.data?.message ?? 'Failed to upload document.') : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (file: File | null) => {
    setSelectedFile(file);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full h-full px-4 py-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Add to Memory</h1>
          <p className="text-sm text-slate-400">Save text, links, or documents — NeuraMemoryAI will extract and store the key insights.</p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-neutral-800">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setSelectedFile(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors duration-150 focus:outline-none cursor-pointer
                  ${activeTab === tab.id
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
          <div className="p-6">

            {/* ── TEXT TAB ── */}
            {activeTab === 'text' && (
              <form onSubmit={handleTextSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Paste or type your text</span>
                  <textarea
                    name="text"
                    rows={7}
                    required
                    placeholder="Paste an article, note, meeting summary, research snippet…"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none transition"
                  />
                </label>
                <SubmitButton loading={loading} label="Save to Memory" />
              </form>
            )}

            {/* ── LINK TAB ── */}
            {activeTab === 'link' && (
              <form onSubmit={handleLinkSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Enter a URL</span>
                  <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-sky-500 transition">
                    <svg width="16" height="16" className="text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5M10.172 13.828a4 4 0 015.656 0l3-3a4 4 0 10-5.656-5.656l-1.5 1.5" />
                    </svg>
                    <input
                      name="url"
                      type="url"
                      required
                      placeholder="https://example.com/article"
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-500">NeuraMemoryAI will fetch and extract insights from the page.</p>
                </label>
                <SubmitButton loading={loading} label="Fetch & Save" />
              </form>
            )}

            {/* ── DOCUMENT TAB ── */}
            {activeTab === 'document' && (
              <form onSubmit={handleDocumentSubmit} className="flex flex-col gap-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Upload a document</span>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0] ?? null;
                    onFileChange(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-10 cursor-pointer transition
                    ${dragOver ? 'border-sky-400 bg-sky-950/30' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/40'}`}
                >
                  <svg width="36" height="36" className={`transition ${dragOver ? 'text-sky-400' : 'text-neutral-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-300">
                      {selectedFile ? selectedFile.name : 'Drop file here or click to browse'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, MD — max 10 MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    className="sr-only"
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  />
                </div>

                {/* Selected file badge */}
                {selectedFile && (
                  <div className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2">
                    <span className="text-xs text-slate-300 truncate">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-slate-500 hover:text-red-400 transition ml-3 shrink-0"
                      aria-label="Remove file"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <SubmitButton loading={loading} label="Upload & Save" />
              </form>
            )}
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-slate-600">
          Memories are private and tied to your account. View them under{' '}
          <span className="text-slate-500 font-medium">Manage Memories</span>.
        </p>
      </div>
    </div>
  );
};

// ── Shared submit button ───────────────────────────────────────────────────
function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-bold transition-colors duration-150 cursor-pointer"
    >
      {loading ? (
        <>
          <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Processing…
        </>
      ) : label}
    </button>
  );
}

export default MainArea;
