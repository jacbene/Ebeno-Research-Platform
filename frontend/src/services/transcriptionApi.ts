import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
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

export const transcriptionApi = {
  // Upload d'un fichier audio
  uploadAudio: (file: File, projectId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId);
    }

    return api.post('/transcription/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Récupérer une transcription
  getTranscription: (id: string) => {
    return api.get(`/transcription/${id}`);
  },

  // Récupérer la progression
  getProgress: (id: string) => {
    return api.get(`/transcription/${id}/progress`);
  },

  // Récupérer les transcriptions de l'utilisateur
  getUserTranscriptions: (page = 1, limit = 10) => {
    return api.get('/transcription/user/list', {
      params: { page, limit },
    });
  },

  // Supprimer une transcription
  deleteTranscription: (id: string) => {
    return api.delete(`/transcription/${id}`);
  },
};
