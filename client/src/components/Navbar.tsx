import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import type { UserProfile } from '../types/index';

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Fetch user profile on mount
  useEffect(() => {
    api.get<{ success: boolean; data: UserProfile }>('/api/v1/profile')
      .then((res) => setProfile(res.data.data))
      .catch(() => {/* silently suppress errors */});
  }, []);

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
          <svg width="32" height="32" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect x="7" y="7" width="24" height="24" rx="6" fill="#18181b" stroke="#38bdf8" strokeWidth="2" />
            <rect x="13" y="13" width="12" height="12" rx="3" fill="#a78bfa" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="13" cy="13" r="2" fill="#38bdf8" />
            <circle cx="25" cy="13" r="2" fill="#38bdf8" />
            <circle cx="13" cy="25" r="2" fill="#38bdf8" />
            <circle cx="25" cy="25" r="2" fill="#38bdf8" />
            <rect x="18" y="18" width="2" height="2" rx="1" fill="#fff" />
            <path d="M19 7V11" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M19 27V31" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 19H11" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M27 19H31" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
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
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              role="menu"
              aria-label="Profile menu"
              className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl py-1 z-50 animate-fade-in"
            >
              {/* Profile info */}
              {profile && (
                <div className="px-4 py-2.5 border-b border-neutral-800">
                  <p className="text-sm font-medium text-slate-200 truncate">{profile.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Member since: {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={handleManageMemories}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-neutral-800 hover:text-sky-400 transition-colors duration-100 text-left"
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                Manage Memories
              </button>

              <div className="border-t border-neutral-800 my-1" />

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-neutral-800 hover:text-red-400 transition-colors duration-100 text-left"
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
