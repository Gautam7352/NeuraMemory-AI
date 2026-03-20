import { useEffect, useRef, useState } from 'react';
import styles from './Navbar.module.css';
import { useNavigate } from 'react-router';

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('neura_user');
    localStorage.removeItem('neura_logged_in');
    setMenuOpen(false);
    navigate('/signup');
  };

  const handleManageMemories = () => {
    setMenuOpen(false);
    navigate('/manage-memories');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles['navbar-actions']}>
        <span className={styles['navbar-logo']}>
          <span style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 38 38" fill="none" style={{ marginRight: 8, flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
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
              <span style={{
                fontWeight: 900,
                fontSize: 'clamp(1.1rem, 3.6vw, 1.6rem)',
                letterSpacing: '0.01em',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                <span style={{ color: '#38bdf8' }}>Neura</span>
                <span style={{ color: '#64748b', fontWeight: 900 }}>Memory</span>
                <span style={{ color: '#a78bfa', fontWeight: 900 }}>AI</span>
              </span>
            </span>
            <span style={{
              fontSize: 'clamp(0.62rem, 1.7vw, 0.78rem)',
              color: '#cbd5e1',
              fontWeight: 500,
              letterSpacing: '0.09em',
              marginTop: 2,
              marginLeft: 2,
              textTransform: 'uppercase',
            }}>
              INTELLIGENT NEURAL SOLUTIONS
            </span>
          </span>
        </span>
      </div>
      <div className={styles['navbar-actions']}>
        <div className={styles['navbar-profile-wrap']} ref={menuRef}>
          <button
            type="button"
            className={styles['navbar-avatar']}
            onClick={() => setMenuOpen((prev) => !prev)}
            title="Profile"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" />
            </svg>
          </button>

          {menuOpen && (
            <div className={styles['navbar-profile-menu']} role="menu" aria-label="Profile menu">
              <button
                type="button"
                className={styles['navbar-profile-item']}
                onClick={handleManageMemories}
                role="menuitem"
              >
                Manage memories
              </button>
              <button
                type="button"
                className={styles['navbar-profile-item']}
                onClick={handleLogout}
                role="menuitem"
              >
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
