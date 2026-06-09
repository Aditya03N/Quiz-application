import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../utils/jwt.util.js';

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const trimmedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long and include a symbol like @ or #.' });
    }

    const requiresSymbol = /[^A-Za-z0-9]/;
    if (!requiresSymbol.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one symbol like @ or #.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered. Please login or use a different email.' });
    }

    const                                                                                                                                                                                                                                                   passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: trimmedName, email: normalizedEmail, passwordHash });
    const token = signToken({ id: user._id, email: user.email });

    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signToken({ id: user._id, email: user.email });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res) {
  const user = req.user;
  res.json({ user });
}
