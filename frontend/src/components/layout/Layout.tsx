// frontend/src/components/layout/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useTheme } from '../../context/ThemeContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

interface LayoutProps {
  user: any;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
  const { colors } = useTheme();

  // ✅ Notifications temps réel (une seule connexion pour toute l'app)
  useRealtimeNotifications({ currentUserId: user?.id || null });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.body,
      transition: 'background-color 0.3s ease',
    }}>
      <Navbar user={user} onLogout={onLogout} />
      <main style={{ padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
};
