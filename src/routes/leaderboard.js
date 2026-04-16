const express = require('express');
const prisma = require('../db');
const { optionalAuth, requireAuth } = require('../auth');
const { weekStartISO, getWeekNumber } = require('../util');

const router = express.Router();

// GET /api/leaderboard?scope=weekly|alltime&limit=50
router.get('/', optionalAuth, async (req, res) => {
  try {
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
          user: { select: { username: true, avatarColor: true, avatarData: true } }
        }
      });
      return res.json({ scope, weekStart, weekNumber: getWeekNumber(), rows: rows.map((r, i) => ({
        rank: i + 1,
        username: r.user.username,
        avatarColor: r.user.avatarColor,
        avatarData: r.user.avatarData || null,
        points: r.weekPoints
      })) });
    }

    const rows = await prisma.stats.findMany({
      orderBy: [{ totalPoints: 'desc' }],
      take: limit,
      select: {
        userId: true,
        totalPoints: true,
        user: { select: { username: true, avatarColor: true, avatarData: true } }
      }
    });
    res.json({ scope, rows: rows.map((r, i) => ({
      rank: i + 1,
      username: r.user.username,
      avatarColor: r.user.avatarColor,
      avatarData: r.user.avatarData || null,
      points: r.totalPoints
    })) });
  } catch (err) {
    console.error('GET / error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/leaderboard/reset-weekly — admin-only action to zero out weekly points
router.post('/reset-weekly', requireAuth, async (req, res) => {
  try {
    // Only admin (degos) can reset
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (!user || user.username !== 'degos') {
      return res.status(403).json({ error: 'admin_only' });
    }
    await prisma.stats.updateMany({
      data: { weekPoints: 0, weekStart: '' }
    });
    res.json({ ok: true, message: 'All weekly points reset to 0' });
  } catch (err) {
    console.error('reset-weekly error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
