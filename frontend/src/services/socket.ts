// frontend/src/services/socket.ts
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'https://ebeno-backend.onrender.com';

// ✅ On crée une instance unique (singleton) pour toute l'application
export const socket = io(API_URL, {
  autoConnect: false, // On se connecte manuellement dans les composants qui en ont besoin
  transports: ['websocket', 'polling'],
  auth: (cb) => {
    // On récupère le token à chaque tentative de connexion
    cb({ token: localStorage.getItem('authToken') });
  }
});
