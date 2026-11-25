import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const token = localStorage.getItem('authToken');

export const socket = io(API_URL, {
  auth: { token }, // ✅ AJOUT : envoie le JWT au handshake
  transports: ['websocket'],
  autoConnect: false,
});
