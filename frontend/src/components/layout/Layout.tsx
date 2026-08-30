import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

interface LayoutProps {
  user: any;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Navbar user={user} onLogout={onLogout} />
      <main style={{ padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
};
