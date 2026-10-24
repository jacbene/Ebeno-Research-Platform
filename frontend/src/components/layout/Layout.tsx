// frontend/src/components/layout/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer'; // ✅ NOUVEAU
import { useTheme } from '../../context/ThemeContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

interface LayoutProps {
  user: any;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
  const { colors } = useTheme();

  useRealtimeNotifications({ currentUserId: user?.id || null });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.body,
      transition: 'background-color 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar user={user} onLogout={onLogout} />
      <main style={{ padding: '20px', flex: 1 }}>
        <Outlet />
      </main>
      <Footer /> {/* ✅ NOUVEAU */}
    </div>
  );
};
