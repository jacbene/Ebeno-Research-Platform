// frontend/src/services/api.ts
import axios from 'axios';

// Configuration de l'API
//const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ebeno-backend.onrender.com/api';
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse et les réponses non JSON
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Vérifier si la réponse est du JSON valide
      const data = error.response.data;
      if (typeof data === 'string' && !data.startsWith('{') && !data.startsWith('[')) {
        // Réponse non JSON (HTML, plain text, etc.)
        console.warn('⚠️ Réponse non JSON reçue:', data);
        // Transformer en objet pour uniformiser
        error.response.data = {
          message: data || 'Erreur serveur',
          status: error.response.status,
        };
      }
    }
    // Si erreur 401 (non authentifié), déconnecter l'utilisateur
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
