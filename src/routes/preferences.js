const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// PATCH /api/preferences  { darkMode?, sound?, haptics?, lang?, notifications? }
router.patch('/', requireAuth, async (req, res) => {
  const allowed = ['darkMode', 'sound', 'haptics', 'lang', 'notifications'];
  const data = {};
  for (const k of allowed) if (k in (req.body || {})) data[k] = req.body[k];
  const prefs = await prisma.preferences.upsert({
    where: { userId: req.userId },
    update: data,
    create: { userId: req.userId, ...data }
  });
  res.json(prefs);
});

module.exports = router;
