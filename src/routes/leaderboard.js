const express = require('express');
const prisma = require('../db');
const { optionalAuth, requireAuth } = require('../auth');
const { weekStartISO, lastWeekStartISO, getWeekNumber } = require('../util');

const router = express.Router();

// GET /api/leaderboard?scope=weekly|lastweekly|alltime&limit=50
router.get('/', optionalAuth, async (req, res) => {
  try {
    const validScopes = ['weekly', 'lastweekly', 'alltime'];
    const scope = validScopes.includes(req.query.scope) ? req.query.scope : 'weekly';
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));

    if (scope === 'weekly') {
      const ws = weekStartISO();
      const rows = await prisma.stats.findMany({
        where: { weekStart: ws },
        orderBy: [{ weekPoints: 'desc' }],
        take: limit,
        select: {
          userId: true,
          weekPoints: true,
          user: { select: { username: true, avatarColor: true, avatarData: true } }
        }
      });
      return res.json({ scope, weekStart: ws, weekNumber: getWeekNumber(), rows: rows.map((r, i) => ({
        rank: i + 1,
        username: r.user.username,
        avatarColor: r.user.avatarColor,
        avatarData: r.user.avatarData || null,
        points: r.weekPoints
      })) });
    }

    if (scope === 'lastweekly') {
      const lws = lastWeekStartISO();
      const rows = await prisma.stats.findMany({
        where: { lastWeekStart: lws, lastWeekPoints: { gt: 0 } },
        orderBy: [{ lastWeekPoints: 'desc' }],
        take: limit,
        select: {
          userId: true,
          lastWeekPoints: true,
          user: { select: { username: true, avatarColor: true, avatarData: true } }
        }
      });
      return res.json({ scope, weekStart: lws, weekNumber: getWeekNumber() - 1, rows: rows.map((r, i) => ({
        rank: i + 1,
        username: r.user.username,
        avatarColor: r.user.avatarColor,
        avatarData: r.user.avatarData || null,
        points: r.lastWeekPoints
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
    // Snapshot current week into lastWeek before resetting
    const allStats = await prisma.stats.findMany({ where: { weekPoints: { gt: 0 } }, select: { userId: true, weekPoints: true, weekStart: true } });
    for (const s of allStats) {
      await prisma.stats.update({
        where: { userId: s.userId },
        data: { lastWeekPoints: s.weekPoints, lastWeekStart: s.weekStart }
      });
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
