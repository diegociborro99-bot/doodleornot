const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');
const { todayISO } = require('../util');

const router = express.Router();

// POST /api/powerups/use  { kind: 'hint' | 'skip' }
router.post('/use', requireAuth, async (req, res) => {
  try {
    const kind = req.body && req.body.kind;
    if (!['hint', 'skip'].includes(kind)) return res.status(400).json({ error: 'bad_kind' });
    const day = todayISO();
    const current = await prisma.powerup.findUnique({ where: { userId_day: { userId: req.userId, day } } });
    const hintsUsed = (current?.hintsUsed || 0) + (kind === 'hint' ? 1 : 0);
    const skipsUsed = (current?.skipsUsed || 0) + (kind === 'skip' ? 1 : 0);
    if (hintsUsed > 1 && kind === 'hint') return res.status(429).json({ error: 'no_hints' });
    if (skipsUsed > 1 && kind === 'skip') return res.status(429).json({ error: 'no_skips' });
    const row = await prisma.powerup.upsert({
      where: { userId_day: { userId: req.userId, day } },
      update: { hintsUsed, skipsUsed },
      create: { userId: req.userId, day, hintsUsed, skipsUsed }
    });
    res.json(row);
  } catch (err) {
    console.error('POST /use error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/today', requireAuth, async (req, res) => {
  try {
    const day = todayISO();
    const row = await prisma.powerup.findUnique({ where: { userId_day: { userId: req.userId, day } } });
    res.json(row || { day, hintsUsed: 0, skipsUsed: 0 });
  } catch (err) {
    console.error('GET /today error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
