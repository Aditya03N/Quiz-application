import jwt from 'jsonwebtoken';

export const SECRET = process.env.JWT_SECRET || 'dev_secret_fallback_please_change';

export function signToken(payload) {
  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set. Using fallback secret for development only.');
  }

  return jwt.sign(payload, SECRET, {
    expiresIn: '7d'
  });
}