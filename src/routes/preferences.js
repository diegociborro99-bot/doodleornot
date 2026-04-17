const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// PATCH /api/preferences  { darkMode?, sound?, haptics?, lang?, notifications? }
router.patch('/', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const data = {};
    if (typeof body.darkMode === 'string' && ['auto', 'light', 'dark'].includes(body.darkMode)) data.darkMode = body.darkMode;
    if (typeof body.sound === 'boolean') data.sound = body.sound;
    if (typeof body.haptics === 'boolean') data.haptics = body.haptics;
    if (typeof body.lang === 'string' && ['en', 'es', 'de'].includes(body.lang)) data.lang = body.lang;
    if (typeof body.notifications === 'boolean') data.notifications = body.notifications;
    const prefs = await prisma.preferences.upsert({
      where: { userId: req.userId },
      update: data,
      create: { userId: req.userId, ...data }
    });
    res.json(prefs);
  } catch (err) {
    console.error('PATCH / error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
