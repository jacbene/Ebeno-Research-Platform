// store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService, type LoginData, type RegisterData, type User } from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  lastLogin: Date | null;
  
  // Actions
  login: (loginData: LoginData) => Promise<void>;
  register: (registerData: RegisterData) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
  updateProfile: (profileData: Partial<User>) => void;
  
  // Getters (computed values)
  isAdmin: () => boolean;
  isVerified: () => boolean;
  fullName: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      lastLogin: null,

      login: async (loginData: LoginData) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.login(loginData);
          
          // Mise à jour du stockage local
          localStorage.setItem('token', token);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false, 
            lastLogin: new Date(),
            error: null 
          });
          
          return Promise.resolve();
        } catch (error: any) {
          const errorMessage = error.response?.data?.msg || 
                              error.message || 
                              'Échec de la connexion';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          return Promise.reject(error);
        }
      },

      register: async (registerData: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.register(registerData);
          
          localStorage.setItem('token', token);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
          
          return Promise.resolve();
        } catch (error: any) {
          const errorMessage = error.response?.data?.msg || 
                              error.message || 
                              'Échec de l\'inscription';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          return Promise.reject(error);
        }
      },

      logout: () => {
        // Appeler l'API de logout si nécessaire
        authService.logout();
        
        // Nettoyer le stockage local
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          error: null 
        });
      },

      initializeAuth: async () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          set({ isLoading: true });
          try {
            // Option 1: Valider le token avec le backend
            const user = await authService.getCurrentUser();
            
            // Mettre à jour le cache local avec les données fraîches
            localStorage.setItem('user', JSON.stringify(user));
            
            set({ 
              user, 
              token, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } catch (error) {
            // Token invalide ou expiré
            console.warn('Token invalide, déconnexion...');
            get().logout();
          }
        } else {
          // Aucune session stockée
          get().logout();
        }
      },

      clearError: () => set({ error: null }),

      updateProfile: (profileData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...profileData };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          set({ user: updatedUser });
        }
      },

      // Getters (computed values)
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'ADMIN';
      },

      isVerified: () => {
        const user = get().user;
        return user?.isVerified || false;
      },

      fullName: () => {
        const user = get().user;
        if (!user) return '';
        
        // Si l'utilisateur a un profil avec firstName/lastName
        if ('profile' in user && user.profile) {
          return `${user.profile.firstName} ${user.profile.lastName}`.trim();
        }
        
        // Sinon, utiliser l'email ou un champ par défaut
        return user.email || '';
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        lastLogin: state.lastLogin,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);
