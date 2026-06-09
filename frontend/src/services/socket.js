import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

const socket = io(socketUrl, {
  transports: ['websocket']
});

export default socket;
