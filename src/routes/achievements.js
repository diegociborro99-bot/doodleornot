const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Known achievement IDs — only these can be unlocked
const VALID_ACHIEVEMENTS = new Set([
  'first_blood', 'perfect_day', 'streak_3', 'streak_7', 'streak_30',
  'century', 'rarity_hunter', 'whale_spotter', 'eye_for_rare',
  'top_10', 'comeback_kid', 'points_500', 'games_50', 'flawless'
]);

// POST /api/achievements  { ids: [achievementId, ...] }
router.post('/', requireAuth, async (req, res) => {
  try {
    const ids = (req.body && Array.isArray(req.body.ids)) ? req.body.ids : [];
    const clean = ids.filter(id => typeof id === 'string' && VALID_ACHIEVEMENTS.has(id)).slice(0, 20);
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
