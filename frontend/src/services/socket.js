import { io } from 'socket.io-client';

// In dev, use the same host as the browser (works from phones/other devices on LAN)
// In prod, connect to the same origin that served the page.
function getSocketURL() {
  if (import.meta.env.PROD) return window.location.origin;
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  const host = window.location.hostname;
  return `http://${host}:5000`;
}

const socket = io(getSocketURL(), {
  transports: ['websocket']
});

export default socket;
