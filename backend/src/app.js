import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import sessionRoutes from './routes/session.routes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

// Define allowed origins for CORS.
// We collect all potential origins, sanitize them by removing trailing slashes, and merge them.
const originsList = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

if (process.env.FRONTEND_URL) {
  originsList.push(...process.env.FRONTEND_URL.split(','));
}

if (process.env.RENDER_EXTERNAL_URL) {
  originsList.push(process.env.RENDER_EXTERNAL_URL);
}

const allowedOrigins = originsList
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Configure CORS dynamically.
app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  const corsOptions = {
    credentials: true
  };

  if (!origin) {
    // Allow requests with no origin (like mobile apps, curl, postman, or same-origin static assets)
    corsOptions.origin = true;
  } else {
    const sanitizedOrigin = origin.trim().replace(/\/$/, '');
    const host = req.get('host');
    
    // Check if the request is same-origin (matches the backend host)
    const isSameOrigin = sanitizedOrigin === `https://${host}` || sanitizedOrigin === `http://${host}`;
    const isAllowed = allowedOrigins.includes(sanitizedOrigin);

    // Allow any request coming from a private LAN IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    // so students on the same WiFi network can access the app.
    const isLocalNetwork = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(sanitizedOrigin);

    if (isAllowed || isSameOrigin || isLocalNetwork) {
      corsOptions.origin = true;
    } else {
      console.warn(`[CORS Blocked] Origin: ${origin} is not allowed. Host: ${host}. Whitelisted:`, allowedOrigins);
      corsOptions.origin = false; // Disables CORS headers for this request, browser will block it
    }
  }

  callback(null, corsOptions);
}));
app.use(express.json());

app.get('/api', (req, res) => {
  res.json({ message: 'Quiz & Polling Platform API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/sessions', sessionRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
