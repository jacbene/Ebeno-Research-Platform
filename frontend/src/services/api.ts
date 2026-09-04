// frontend/src/services/api.ts
import axios from 'axios';

// Configuration de l'API
const API_BASE_URL = 'https://ebeno-backend.onrender.com/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification (localStorage pour le Web)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('🔍 [api] URL de la requête :', config.baseURL + config.url);
    console.log('🔑 [api] Token envoyé :', token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ [api] Erreur intercepteur requête :', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse et les réponses non JSON
api.interceptors.response.use(
  (response) => {
    console.log('✅ [api] Réponse reçue :', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ [api] Erreur réponse :', error);
    if (error.response) {
      const data = error.response.data;
      if (typeof data === 'string' && !data.startsWith('{') && !data.startsWith('[')) {
        console.warn('⚠️ Réponse non JSON reçue:', data);
        error.response.data = {
          message: data || 'Erreur serveur',
          status: error.response.status,
        };
      }
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
