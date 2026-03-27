import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await api.post('/api/v1/logout');
    } finally {
      navigate('/login');
    }
  };

  const generateOneTimeAPIKey = async () => {
    setMenuOpen(false);
    setApiKeyError('');
    setCopySuccess('');
    setIsApiKeyLoading(true);

    try {
      const response = await api.post('/api/v1/api-key');
      const generatedKey = response?.data?.data?.apiKey;

      if (!generatedKey) {
        throw new Error('API key generation failed.');
      }

      setApiKey(generatedKey);
      setIsApiKeyModalOpen(true);
    } catch (err) {
      console.error(err);
      setApiKeyError('Unable to generate API key. Please try again.');
    } finally {
      setIsApiKeyLoading(false);
    }
  };

  const handleManageMemories = () => {
    setMenuOpen(false);
    navigate('/manage-memories');
  };

  return (
    <nav className="w-full flex items-center justify-between px-6 py-3 bg-neutral-950 border-b border-neutral-800 shadow-sm z-50">
      {/* ── Logo ────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/')}
        className="flex flex-col items-start gap-0.5 focus:outline-none"
      >
        <span className="flex items-center gap-2">
          {/* Icon */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 38 38"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <rect
              x="7"
              y="7"
              width="24"
              height="24"
              rx="6"
              fill="#18181b"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <rect
              x="13"
              y="13"
              width="12"
              height="12"
              rx="3"
              fill="#a78bfa"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <circle cx="13" cy="13" r="2" fill="#38bdf8" />
            <circle cx="25" cy="13" r="2" fill="#38bdf8" />
            <circle cx="13" cy="25" r="2" fill="#38bdf8" />
            <circle cx="25" cy="25" r="2" fill="#38bdf8" />
            <rect x="18" y="18" width="2" height="2" rx="1" fill="#fff" />
            <path
              d="M19 7V11"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M19 27V31"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M7 19H11"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M27 19H31"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Wordmark */}
          <span className="text-lg font-black tracking-tight">
            <span className="text-sky-400">Neura</span>
            <span className="text-slate-500">Memory</span>
            <span className="text-violet-400">AI</span>
          </span>
        </span>
      </button>

      {/* ── Right: nav links + avatar ────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Manage Memories shortcut */}
        <button
          onClick={handleManageMemories}
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-sky-400 transition-colors duration-150"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
            className="shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7h18M3 12h18M3 17h18"
            />
          </svg>
          Memories
        </button>

        {/* Avatar / dropdown trigger */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="Profile"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 hover:border-sky-500 hover:bg-neutral-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a3a3a3"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              role="menu"
              aria-label="Profile menu"
              className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl py-1 z-50 animate-fade-in"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleManageMemories}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-neutral-800 hover:text-sky-400 transition-colors duration-100 text-left cursor-pointer"
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

              <div className="border-t border-neutral-800 my-1" />

              <button
                type="button"
                role="menuitem"
                onClick={generateOneTimeAPIKey}
                disabled={isApiKeyLoading}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 transition-colors duration-100 text-left ${
                  isApiKeyLoading
                    ? 'cursor-not-allowed opacity-70'
                    : 'hover:bg-neutral-800 hover:text-sky-400 cursor-pointer'
                }`}
              >
                {isApiKeyLoading ? 'Generating...' : 'Get API Key'}
              </button>

              <div className="border-t border-neutral-800 my-1" />

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-neutral-800 hover:text-red-400 transition-colors duration-100 text-left cursor-pointer"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-700 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-white">Your new API key</h2>
              <button
                type="button"
                onClick={() => {
                  setIsApiKeyModalOpen(false);
                  setApiKey('');
                  setCopySuccess('');
                }}
                aria-label="Close"
                className="rounded-full p-1 text-slate-300 hover:bg-neutral-800 hover:text-white cursor-pointer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Please copy this key before closing. It is displayed only once.
            </p>

            {apiKeyError ? (
              <p className="mt-4 rounded-md bg-rose-950 p-3 text-sm text-rose-300">
                {apiKeyError}
              </p>
            ) : (
              <div className="mt-4">
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  API Key
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={apiKey}
                    className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-slate-100 selection:bg-sky-500/30"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!apiKey) return;
                      await navigator.clipboard.writeText(apiKey);
                      setCopySuccess('Copied!');
                    }}
                    className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                {copySuccess && (
                  <p className="mt-1 text-xs text-emerald-400">{copySuccess}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
