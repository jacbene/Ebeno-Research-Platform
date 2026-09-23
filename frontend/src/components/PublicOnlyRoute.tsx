import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface PublicOnlyRouteProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ isAuthenticated, children }) => {
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default PublicOnlyRoute;
