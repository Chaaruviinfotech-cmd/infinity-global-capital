import { io } from 'socket.io-client';

// Live Render WebSocket Server
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://igc-socket-server.onrender.com';

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  timeout: 10000,
  autoConnect: true
});

socket.on('connect', () => {
  console.log('🟢 [Socket Connected] Connected to Real-Time Server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔴 [Socket Disconnected] Reason:', reason);
});

socket.on('connect_error', (error) => {
  console.warn('⚠️ [Socket Connection Error]:', error.message);
});

export const emitEvent = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  }
};

export const onEvent = (event, callback) => {
  socket.on(event, callback);
  return () => socket.off(event, callback);
};

export default socket;
