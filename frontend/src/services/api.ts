// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'https://ebeno-backend.onrender.com/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ NE PAS rediriger automatiquement sur 401.
//    Sinon : boucle infinie car les pages publiques (verify-email) montent
//    LanguageProvider qui appelle /language/me sans token → 401 → reload → boucle.
//    On laisse les composants gérer l'erreur (Login, App, etc.)
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
