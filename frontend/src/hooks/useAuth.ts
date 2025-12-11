// hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';

export const useAuth = () => {
  const {
    user,
    token,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    initializeAuth,
    clearError,
    updateProfile,
    isAdmin,
    isVerified,
    fullName,
  } = useAuthStore();

  // Initialiser l'authentification au montage du composant
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      initializeAuth();
    }
  }, []);

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    clearError,
    updateProfile,
    isAdmin: isAdmin(),
    isVerified: isVerified(),
    fullName: fullName(),
  };
};
