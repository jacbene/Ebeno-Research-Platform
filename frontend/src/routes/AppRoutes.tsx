import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword'; // Importer
import ResetPassword from '../pages/auth/ResetPassword';   // Importer
import Dashboard from '../pages/Dashboard';

const AppRoutes: React.FC = () => {
  const { initializeAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/register" 
        element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} 
      />
       <Route 
        path="/forgot-password" 
        element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/reset-password/:token"
        element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />
    </Routes>
  );
};

export default AppRoutes;
