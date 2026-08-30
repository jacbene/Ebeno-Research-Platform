// frontend/src/components/layout/Navbar.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { breakpoints } from '../../styles/breakpoints';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const { mode, toggleMode, colors } = useTheme();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const [menuOpen, setMenuOpen] = useState(false);

  const headerStyle: React.CSSProperties = {
    backgroundColor: colors.dark,
    color: colors.white,
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };

  const linkStyle: React.CSSProperties = {
    color: colors.white,
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    display: 'block',
    width: '100%',
    textAlign: 'center',
  };

  const toggleButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.white,
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const mobileMenuStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    backgroundColor: colors.dark,
    padding: '8px 0',
    gap: '6px',
    borderTop: `1px solid ${colors.gray[700]}`,
    marginTop: '8px',
  };

  const hamburgerStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.white,
    fontSize: '1.6rem',
    cursor: 'pointer',
    padding: '4px 8px',
  };

  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>🎓 Ebeno Research</h1>
      </div>

      {isMobile ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={toggleMode} style={toggleButtonStyle}>
              {mode === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} style={hamburgerStyle}>
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
          {menuOpen && (
            <nav style={mobileMenuStyle}>
              <Link to="/" style={linkStyle} onClick={() => setMenuOpen(false)}>📊 Dashboard</Link>
              <Link to="/chat" style={linkStyle} onClick={() => setMenuOpen(false)}>🤖 Chat IA</Link>
              <Link to="/collaboration" style={linkStyle} onClick={() => setMenuOpen(false)}>🤝 Collaboration</Link>
              <Link to="/settings" style={linkStyle} onClick={() => setMenuOpen(false)}>⚙️ Paramètres</Link>
              <span style={{ opacity: 0.7, textAlign: 'center', padding: '4px 0' }}>👋 {user?.name || user?.email}</span>
              <Button variant="danger" size="sm" onClick={() => { onLogout(); setMenuOpen(false); }} style={{ width: '90%', margin: '0 auto' }}>
                Déconnexion
              </Button>
            </nav>
          )}
        </>
      ) : (
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <Link to="/" style={linkStyle}>📊 Dashboard</Link>
          <Link to="/chat" style={linkStyle}>🤖 Chat IA</Link>
          <Link to="/collaboration" style={linkStyle}>🤝 Collaboration</Link>
          <Link to="/settings" style={linkStyle}>⚙️ Paramètres</Link>
          <span style={{ opacity: 0.7, marginLeft: '4px' }}>👋 {user?.name || user?.email}</span>
          <Button variant="danger" size="sm" onClick={onLogout}>Déconnexion</Button>
          <button onClick={toggleMode} style={toggleButtonStyle}>
            {mode === 'light' ? '🌙' : '☀️'}
          </button>
        </nav>
      )}
    </header>
  );
};
