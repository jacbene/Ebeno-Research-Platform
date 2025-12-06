import { create } from 'zustand';
import { authService, LoginData, RegisterData, User } from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (loginData: LoginData) => Promise<void>;
  register: (registerData: RegisterData) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (loginData: LoginData) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authService.login(loginData);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (registerData: RegisterData) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authService.register(registerData);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, token: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ isLoading: true });
      try {
        const user = await authService.getCurrentUser();
        localStorage.setItem('user', JSON.stringify(user)); // Mettre à jour le cache local
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch (error) {
        authService.logout();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    }
  }
}));