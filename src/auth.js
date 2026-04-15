// JWT + bcrypt helpers
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const COOKIE_NAME = 'don_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const hashPassword = (pw) => bcrypt.hash(pw, 12);
const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);

const signToken = (userId) =>
  jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' });

const verifyToken = (token) => {
  try { return jwt.verify(token, SECRET); } catch { return null; }
};

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/'
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
};

// Middleware: loads user from cookie; sets req.userId if valid.
const requireAuth = (req, res, next) => {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'unauthorized' });
  req.userId = payload.sub;
  next();
};

const optionalAuth = (req, _res, next) => {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.userId = payload.sub;
  }
  next();
};

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  optionalAuth
};
