import api from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  discipline: string;
  affiliation?: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  profile: {
    firstName: string;
    lastName: string;
    discipline: string;
    affiliation?: string;
    avatar?: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  async login(loginData: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', loginData);
    return response.data;
  },

  async register(registerData: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', registerData);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};
