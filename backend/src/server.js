import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import app from './app.js';
import { initSocket } from './config/socket.js';
import { connectDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_PORT = Number(process.env.PORT || 5000);
const MAX_PORT_RETRIES = 5;

await connectDB();

function startServer(port, attempt = 0) {
  const server = http.createServer(app);
  initSocket(server);

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (all interfaces)`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_RETRIES) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use, retrying on port ${nextPort}...`);
      server.close(() => startServer(nextPort, attempt + 1));
      return;
    }

    console.error('Server failed to start:', error);
    process.exit(1);
  });
}

startServer(BASE_PORT);
