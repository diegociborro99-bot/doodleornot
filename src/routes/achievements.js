const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// POST /api/achievements  { ids: [achievementId, ...] }
router.post('/', requireAuth, async (req, res) => {
  try {
    const ids = (req.body && Array.isArray(req.body.ids)) ? req.body.ids : [];
    const clean = ids.filter(id => typeof id === 'string' && id.length > 0 && id.length < 64);
    if (!clean.length) return res.json({ added: 0 });
    const result = await prisma.userAchievement.createMany({
      data: clean.map(achievementId => ({ userId: req.userId, achievementId })),
      skipDuplicates: true
    });
    res.json({ added: result.count });
  } catch (err) {
    console.error('POST / error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
