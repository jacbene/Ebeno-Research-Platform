import axios from 'axios';
import * as Sentry from '@sentry/react';

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ Envoyer uniquement les erreurs 5xx à Sentry
    const status = error.response?.status;
    if (status && status >= 500) {
      Sentry.captureException(error, {
        tags: { type: 'api-error', status: String(status) },
        contexts: {
          response: {
            url: error.config?.url,
            method: error.config?.method,
            status,
          },
        },
      });
    }
    return Promise.reject(error);
  }
);

export default api;
