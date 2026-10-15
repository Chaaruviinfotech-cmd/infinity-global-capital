import { io } from 'socket.io-client';
import { Platform } from 'react-native';
import { BASE_URL } from './helper';

// Live Render WebSocket Server (Public, HTTPS & WSS)
export const SOCKET_SERVER_URL = 'https://igc-socket-server.onrender.com';

console.log('📡 [Mobile Socket Target URL]:', SOCKET_SERVER_URL);

export const socket = io(SOCKET_SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 25,
  reconnectionDelay: 1500,
  timeout: 10000,
  autoConnect: true,
});

let currentJoinedUserId = null;

socket.on('connect', () => {
  console.log('🟢 [Mobile Socket Connected]:', socket.id, 'to', SOCKET_SERVER_URL);
  if (currentJoinedUserId) {
    socket.emit('join_user', currentJoinedUserId);
  }
});

socket.on('disconnect', (reason) => {
  console.log('🔴 [Mobile Socket Disconnected]:', reason);
});

socket.on('connect_error', (error) => {
  console.warn('⚠️ [Mobile Socket Error]:', error.message, 'Target:', SOCKET_SERVER_URL);
});

export const joinUserRoom = (userId) => {
  if (userId) {
    currentJoinedUserId = userId;
    if (socket && socket.connected) {
      socket.emit('join_user', userId);
    }
  }
};

export const onSocket = (event, callback) => {
  socket.on(event, callback);
  return () => {
    socket.off(event, callback);
  };
};

export const emitSocket = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  }
};

export default socket;
