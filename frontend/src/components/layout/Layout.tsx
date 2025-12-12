// components/layout/Layout.tsx
import { ReactNode } from 'react';
import Navbar from './Navbar'; // Importation de la Navbar

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar /> {/* Ajout de la Navbar */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
