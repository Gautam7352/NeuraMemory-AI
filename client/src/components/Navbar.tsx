import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import type { UserProfile } from '../types/index';

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; data: UserProfile }>('/api/v1/profile')
      .then((res) => setProfile(res.data.data))
      .catch(() => {});
  }, []);

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
    try { await api.post('/api/v1/logout'); } finally { navigate('/login'); }
  };

  const generateOneTimeAPIKey = async () => {
    setMenuOpen(false);
    setApiKeyError('');
    setCopySuccess('');
    setIsApiKeyLoading(true);
    try {
      const response = await api.post('/api/v1/api-key');
      const generatedKey = response?.data?.data?.apiKey;
      if (!generatedKey) throw new Error('API key generation failed.');
      setApiKey(generatedKey);
      setIsApiKeyModalOpen(true);
    } catch {
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
    <>
      <nav className="w-full flex items-center justify-between px-5 py-3 border-b border-white/5 z-50" style={{ background: 'rgba(8,11,20,0.9)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 focus:outline-none group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">
            Neura<span className="text-indigo-400">Memory</span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManageMemories}
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-white/4 hover:bg-white/7 border border-white/6 rounded-lg px-3 py-1.5 transition-all duration-150"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h10M4 14h16M4 18h10" />
            </svg>
            Memories
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 hover:border-indigo-400/50 transition-all duration-150 focus:outline-none"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in"
              style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {profile && (
                  <div className="px-4 py-2.5 border-b border-white/6">
                    <p className="text-xs font-medium text-slate-200 truncate">{profile.email}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}

                <button type="button" role="menuitem" onClick={handleManageMemories}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-indigo-300 transition-colors text-left cursor-pointer">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h10M4 14h16M4 18h10" />
                  </svg>
                  Manage Memories
                </button>

                <div className="border-t border-white/5 my-1" />

                <button type="button" role="menuitem" onClick={generateOneTimeAPIKey} disabled={isApiKeyLoading}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-indigo-300 transition-colors text-left cursor-pointer disabled:opacity-50">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  {isApiKeyLoading ? 'Generating…' : 'Get API Key'}
                </button>

                <div className="border-t border-white/5 my-1" />

                <button type="button" role="menuitem" onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left cursor-pointer">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md glass-strong rounded-2xl p-6 shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Your API Key</h2>
                <p className="text-xs text-slate-400 mt-0.5">Copy it now — it won't be shown again.</p>
              </div>
              <button type="button" onClick={() => { setIsApiKeyModalOpen(false); setApiKey(''); setCopySuccess(''); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white transition cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {apiKeyError ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{apiKeyError}</div>
            ) : (
              <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">
                <input type="text" readOnly value={apiKey}
                  className="flex-1 bg-transparent text-xs text-slate-200 font-mono outline-none select-all" />
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(apiKey); setCopySuccess('Copied!'); }}
                  className="shrink-0 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer">
                  {copySuccess || 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
