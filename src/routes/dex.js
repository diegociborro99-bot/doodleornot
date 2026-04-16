const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// POST /api/dex  { ids: [int, ...] }
router.post('/', requireAuth, async (req, res) => {
  try {
    const ids = (req.body && Array.isArray(req.body.ids)) ? req.body.ids : [];
    const clean = ids.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n >= 0 && n < 10000);
    if (!clean.length) return res.json({ added: 0 });
    // use createMany with skipDuplicates
    const result = await prisma.dexEntry.createMany({
      data: clean.map(doodleId => ({ userId: req.userId, doodleId })),
      skipDuplicates: true
    });
    res.json({ added: result.count });
  } catch (err) {
    console.error('POST / error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/dex
router.get('/', requireAuth, async (req, res) => {
  try {
    const entries = await prisma.dexEntry.findMany({
      where: { userId: req.userId },
      select: { doodleId: true, firstSeen: true },
      orderBy: { firstSeen: 'desc' }
    });
    res.json({ ids: entries.map(e => e.doodleId) });
  } catch (err) {
    console.error('GET / error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
