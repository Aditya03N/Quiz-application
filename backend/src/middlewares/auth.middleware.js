import jwt from 'jsonwebtoken';
import { SECRET } from '../utils/jwt.util.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role || 'teacher' };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}
