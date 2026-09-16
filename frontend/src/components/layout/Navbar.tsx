// frontend/src/components/layout/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { GlobalSearch } from '../GlobalSearch';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { breakpoints } from '../../styles/breakpoints';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const { mode, effectiveMode, setMode, colors } = useTheme();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const themeMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // ✅ Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Fermer le menu mobile à chaque navigation
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setThemeMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  // Icône selon le mode
  const getThemeIcon = () => {
    if (mode === 'system') return '💻';
    return effectiveMode === 'light' ? '☀️' : '🌙';
  };

  const getThemeLabel = (m: ThemeMode) => {
    switch (m) {
      case 'light': return '☀️ Clair';
      case 'dark': return '🌙 Sombre';
      case 'system': return '💻 Système';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // ============================================================
  // STYLES
  // ============================================================

  const headerStyle: React.CSSProperties = {
    backgroundColor: colors.dark,
    color: colors.light,
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'background-color 0.3s ease',
  };

  const logoStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '1.1rem',
    color: colors.light,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    flexShrink: 0,
  };

  const linkStyle = (active: boolean): React.CSSProperties => ({
    color: active ? colors.primary : colors.light,
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    transition: 'all 0.2s',
    display: 'block',
    width: isMobile ? '100%' : 'auto',
    textAlign: isMobile ? 'center' : 'left',
    fontWeight: active ? 'bold' : 'normal',
    backgroundColor: active && !isMobile ? colors.primary + '22' : 'transparent',
    borderBottom: active && !isMobile ? `2px solid ${colors.primary}` : 'none',
    fontSize: '14px',
  });

  const iconButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.light,
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '180px',
    overflow: 'hidden',
    zIndex: 200,
  };

  const dropdownItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: active ? colors.primary + '15' : 'transparent',
    color: colors.dark,
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    fontWeight: active ? 'bold' : 'normal',
    transition: 'background-color 0.15s',
  });

  const mobileMenuStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    backgroundColor: colors.dark,
    padding: '12px 0',
    gap: '4px',
    borderTop: `1px solid ${colors.gray[700]}`,
    marginTop: '8px',
  };

  const avatarStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: `2px solid ${colors.primaryLight}`,
    overflow: 'hidden',
    flexShrink: 0,
  };

  return (
    <header style={headerStyle}>
      {/* Logo */}
      <Link to="/" style={logoStyle}>
        <span style={{ fontSize: '1.4rem' }}>🎓</span>
        <span style={{ fontWeight: 700 }}>Ebeno</span>
      </Link>

      {/* ✅ Recherche globale - Desktop */}
      {!isMobile && (
        <div style={{ flex: 1, maxWidth: '500px', margin: '0 16px' }}>
          <GlobalSearch />
        </div>
      )}

      {isMobile ? (
        // ============================================================
        // MOBILE
        // ============================================================
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Sélecteur de thème */}
            <div ref={themeMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                style={iconButtonStyle}
                title={`Thème : ${getThemeLabel(mode)}`}
              >
                {getThemeIcon()}
              </button>
              {themeMenuOpen && (
                <div style={{ ...dropdownStyle, right: -60 }}>
                  {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setThemeMenuOpen(false);
                      }}
                      style={dropdownItemStyle(mode === m)}
                    >
                      {getThemeLabel(m)}
                      {mode === m && <span style={{ marginLeft: 'auto' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar utilisateur */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={avatarStyle}
                title={user?.name || user?.email}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(user?.name || user?.email || '?')
                )}
              </div>
              {userMenuOpen && (
                <div style={{ ...dropdownStyle, minWidth: '200px', right: -40 }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.gray[200]}` }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: colors.dark }}>
                      {user?.name || 'Utilisateur'}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.gray[500] }}>
                      {user?.email}
                    </div>
                  </div>
                  <Link
                    to="/settings"
                    style={{ ...dropdownItemStyle(false), textDecoration: 'none' }}
                  >
                    ⚙️ Paramètres
                  </Link>
                  <button
                    onClick={onLogout}
                    style={{
                      ...dropdownItemStyle(false),
                      color: colors.danger,
                      borderTop: `1px solid ${colors.gray[100]}`,
                    }}
                  >
                    🚪 Déconnexion
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ ...iconButtonStyle, fontSize: '1.6rem' }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>

          {menuOpen && (
            <nav style={mobileMenuStyle}>
              {/* ✅ Recherche globale - Mobile */}
              <div style={{ padding: '0 12px 12px 12px' }}>
                <GlobalSearch placeholder="Rechercher..." />
              </div>

              <Link to="/" style={linkStyle(isActive('/'))}>📊 Dashboard</Link>
              <Link to="/chat" style={linkStyle(isActive('/chat'))}>🤖 Chat IA</Link>
              <Link to="/collaboration" style={linkStyle(isActive('/collaboration'))}>🤝 Collaboration</Link>
              <Link to="/transcriptions" style={linkStyle(isActive('/transcriptions'))}>🎙️ Transcriptions</Link>
              <Link to="/settings" style={linkStyle(isActive('/settings'))}>⚙️ Paramètres</Link>
            </nav>
          )}
        </>
      ) : (
        // ============================================================
        // DESKTOP
        // ============================================================
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'nowrap' }}>
          <Link to="/" style={linkStyle(isActive('/'))}>📊 Dashboard</Link>
          <Link to="/chat" style={linkStyle(isActive('/chat'))}>🤖 Chat IA</Link>
          <Link to="/collaboration" style={linkStyle(isActive('/collaboration'))}>🤝 Collaboration</Link>
          <Link to="/transcriptions" style={linkStyle(isActive('/transcriptions'))}>🎙️ Transcriptions</Link>

          {/* Sélecteur de thème */}
          <div ref={themeMenuRef} style={{ position: 'relative', marginLeft: '8px' }}>
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              style={iconButtonStyle}
              title={`Thème : ${getThemeLabel(mode)}`}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.gray[700])}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {getThemeIcon()}
            </button>
            {themeMenuOpen && (
              <div style={dropdownStyle}>
                {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setThemeMenuOpen(false);
                    }}
                    style={dropdownItemStyle(mode === m)}
                    onMouseEnter={(e) => {
                      if (mode !== m) e.currentTarget.style.backgroundColor = colors.gray[100];
                    }}
                    onMouseLeave={(e) => {
                      if (mode !== m) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {getThemeLabel(m)}
                    {mode === m && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar utilisateur */}
          <div ref={userMenuRef} style={{ position: 'relative', marginLeft: '4px' }}>
            <div
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={avatarStyle}
              title={user?.name || user?.email}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                getInitials(user?.name || user?.email || '?')
              )}
            </div>
            {userMenuOpen && (
              <div style={{ ...dropdownStyle, minWidth: '220px' }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.gray[200]}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: colors.dark }}>
                    {user?.name || 'Utilisateur'}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.gray[500] }}>
                    {user?.email}
                  </div>
                </div>
                <Link
                  to="/settings"
                  style={{ ...dropdownItemStyle(false), textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.gray[100])}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  ⚙️ Paramètres
                </Link>
                <button
                  onClick={onLogout}
                  style={{
                    ...dropdownItemStyle(false),
                    color: colors.danger,
                    borderTop: `1px solid ${colors.gray[100]}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.gray[100])}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  🚪 Déconnexion
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
