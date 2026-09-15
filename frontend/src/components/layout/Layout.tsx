// frontend/src/components/layout/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useTheme } from '../../context/ThemeContext';

interface LayoutProps {
  user: any;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
  const { colors } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.body,  // ✅ Utilise le thème
      transition: 'background-color 0.3s ease',
    }}>
      <Navbar user={user} onLogout={onLogout} />
      <main style={{ padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
};
