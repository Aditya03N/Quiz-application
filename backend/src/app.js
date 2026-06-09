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

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman, or same-origin requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    const sanitizedOrigin = origin.trim().replace(/\/$/, '');

    if (allowedOrigins.includes(sanitizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Access denied for origin: ${origin}. Allowed origins:`, allowedOrigins);
      callback(new Error(`Not allowed by CORS. Origin '${origin}' is not whitelisted.`));
    }
  },
  credentials: true
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
