const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');
const { todayISO } = require('../util');

const router = express.Router();

// POST /api/powerups/use  { kind: 'hint' | 'skip' | 'freeze' }
// Uses atomic conditional UPDATE to prevent concurrent-request exploit
router.post('/use', requireAuth, async (req, res) => {
  try {
    const kind = req.body && req.body.kind;
    if (!['hint', 'skip', 'freeze'].includes(kind)) return res.status(400).json({ error: 'bad_kind' });
    const day = todayISO();

    // Ensure row exists
    await prisma.powerup.upsert({
      where: { userId_day: { userId: req.userId, day } },
      update: {},
      create: { userId: req.userId, day, hintsUsed: 0, skipsUsed: 0, freezesUsed: 0 }
    });

    // Atomic conditional increment: only increments if still under limit
    // Returns number of affected rows — 0 means limit already reached
    let affected;
    if (kind === 'hint') {
      affected = await prisma.$executeRaw`
        UPDATE "Powerup" SET "hintsUsed" = "hintsUsed" + 1
        WHERE "userId" = ${req.userId} AND "day" = ${day} AND "hintsUsed" < 1`;
    } else if (kind === 'skip') {
      affected = await prisma.$executeRaw`
        UPDATE "Powerup" SET "skipsUsed" = "skipsUsed" + 1
        WHERE "userId" = ${req.userId} AND "day" = ${day} AND "skipsUsed" < 1`;
    } else {
      affected = await prisma.$executeRaw`
        UPDATE "Powerup" SET "freezesUsed" = "freezesUsed" + 1
        WHERE "userId" = ${req.userId} AND "day" = ${day} AND "freezesUsed" < 1`;
    }

    if (affected === 0) {
      const errorCode = kind === 'hint' ? 'no_hints' : kind === 'skip' ? 'no_skips' : 'no_freezes';
      return res.status(429).json({ error: errorCode });
    }

    const row = await prisma.powerup.findUnique({ where: { userId_day: { userId: req.userId, day } } });
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
    res.json(row || { day, hintsUsed: 0, skipsUsed: 0, freezesUsed: 0 });
  } catch (err) {
    console.error('GET /today error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
