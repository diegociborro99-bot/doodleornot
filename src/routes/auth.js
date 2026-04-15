const express = require('express');
const prisma = require('../db');
const { hashPassword, verifyPassword, signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('../auth');
const { isValidUsername, isValidPassword } = require('../util');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { username, password, avatarColor, faceShape } = req.body || {};
  if (!isValidUsername(username)) return res.status(400).json({ error: 'invalid_username' });
  if (!isValidPassword(password)) return res.status(400).json({ error: 'weak_password' });
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ error: 'username_taken' });
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      avatarColor: avatarColor || '#C5B3E6',
      faceShape: faceShape || 'round',
      stats: { create: {} },
      streak: { create: {} },
      preferences: { create: {} }
    }
  });
  const token = signToken(user.id);
  setAuthCookie(res, token);
  res.json({ id: user.id, username: user.username, avatarColor: user.avatarColor, faceShape: user.faceShape });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'bad_credentials' });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'bad_credentials' });
  const token = signToken(user.id);
  setAuthCookie(res, token);
  res.json({ id: user.id, username: user.username, avatarColor: user.avatarColor, faceShape: user.faceShape });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      stats: true,
      streak: true,
      preferences: true,
      achievements: { select: { achievementId: true, unlockedAt: true } },
      dex: { select: { doodleId: true } },
      leagues: {
        include: {
          league: { select: { code: true, name: true, createdAt: true } }
        }
      }
    }
  });
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({
    id: user.id,
    username: user.username,
    avatarColor: user.avatarColor,
    faceShape: user.faceShape,
    stats: user.stats,
    streak: user.streak,
    preferences: user.preferences,
    achievements: user.achievements.map(a => a.achievementId),
    dex: user.dex.map(d => d.doodleId),
    leagues: user.leagues.map(m => ({ code: m.league.code, name: m.league.name }))
  });
});

router.patch('/me', requireAuth, async (req, res) => {
  const { avatarColor, faceShape } = req.body || {};
  const data = {};
  if (typeof avatarColor === 'string') data.avatarColor = avatarColor;
  if (typeof faceShape === 'string') data.faceShape = faceShape;
  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json({ id: user.id, username: user.username, avatarColor: user.avatarColor, faceShape: user.faceShape });
});

module.exports = router;
