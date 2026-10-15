import { io } from 'socket.io-client';
import { Platform } from 'react-native';
import { BASE_URL } from './helper';

// Dynamically resolve socket server host matching BASE_URL (e.g. 192.168.67.239:4000)
const getSocketServerUrl = () => {
  try {
    if (BASE_URL) {
      const match = BASE_URL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1]) {
        const host = match[1];
        if (host === 'localhost' || host === '127.0.0.1') {
          return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
        }
        return `http://${host}:4000`;
      }
    }
  } catch (e) {}
  return 'http://192.168.31.17:4000';
};

export const SOCKET_SERVER_URL = getSocketServerUrl();

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
