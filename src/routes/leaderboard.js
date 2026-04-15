const express = require('express');
const prisma = require('../db');
const { optionalAuth } = require('../auth');
const { weekStartISO } = require('../util');

const router = express.Router();

// GET /api/leaderboard?scope=weekly|alltime&limit=50
router.get('/', optionalAuth, async (req, res) => {
  const scope = req.query.scope === 'alltime' ? 'alltime' : 'weekly';
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));

  if (scope === 'weekly') {
    const weekStart = weekStartISO();
    const rows = await prisma.stats.findMany({
      where: { weekStart },
      orderBy: [{ weekPoints: 'desc' }],
      take: limit,
      select: {
        userId: true,
        weekPoints: true,
        user: { select: { username: true, avatarColor: true } }
      }
    });
    return res.json({ scope, weekStart, rows: rows.map((r, i) => ({
      rank: i + 1,
      username: r.user.username,
      avatarColor: r.user.avatarColor,
      points: r.weekPoints
    })) });
  }

  const rows = await prisma.stats.findMany({
    orderBy: [{ totalPoints: 'desc' }],
    take: limit,
    select: {
      userId: true,
      totalPoints: true,
      user: { select: { username: true, avatarColor: true } }
    }
  });
  res.json({ scope, rows: rows.map((r, i) => ({
    rank: i + 1,
    username: r.user.username,
    avatarColor: r.user.avatarColor,
    points: r.totalPoints
  })) });
});

module.exports = router;
