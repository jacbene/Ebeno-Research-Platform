import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', 
});


api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
