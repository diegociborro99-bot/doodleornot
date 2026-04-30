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
      // Only show users whose stats are actually for THIS week with non-zero points.
      // Without `weekPoints > 0`, users left over from a previous week (or with zeroed
      // stats from an admin reset) appear in the board with 0 — confusing.
      const rows = await prisma.stats.findMany({
        where: { weekStart: ws, weekPoints: { gt: 0 } },
        // Stable secondary sort by username for ties (avoids podium reshuffling on every refresh).
        orderBy: [{ weekPoints: 'desc' }, { user: { username: 'asc' } }],
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
      // Two cohorts of users have last-week scores:
      //   1. Users who already played in the new week — their previous total was snapshotted
      //      into (lastWeekStart, lastWeekPoints) by the progress route.
      //   2. Users who played last week but haven't returned yet — their stats still live in
      //      (weekStart, weekPoints) because the snapshot is lazy. Without this branch they
      //      vanish from the board entirely the moment the new week starts.
      const [snapshotted, notYetSnapshotted] = await Promise.all([
        prisma.stats.findMany({
          where: { lastWeekStart: lws, lastWeekPoints: { gt: 0 } },
          select: {
            userId: true,
            lastWeekPoints: true,
            user: { select: { username: true, avatarColor: true, avatarData: true } }
          }
        }),
        prisma.stats.findMany({
          where: { weekStart: lws, weekPoints: { gt: 0 } },
          select: {
            userId: true,
            weekPoints: true,
            user: { select: { username: true, avatarColor: true, avatarData: true } }
          }
        })
      ]);

      // De-dupe by userId — snapshot value wins because it is the authoritative
      // frozen total once the user has played a new-week round.
      const merged = new Map();
      for (const r of notYetSnapshotted) {
        merged.set(r.userId, { user: r.user, points: r.weekPoints });
      }
      for (const r of snapshotted) {
        merged.set(r.userId, { user: r.user, points: r.lastWeekPoints });
      }

      const sorted = Array.from(merged.values())
        .sort((a, b) => b.points - a.points || a.user.username.localeCompare(b.user.username))
        .slice(0, limit);

      return res.json({ scope, weekStart: lws, weekNumber: getWeekNumber() - 1, rows: sorted.map((r, i) => ({
        rank: i + 1,
        username: r.user.username,
        avatarColor: r.user.avatarColor,
        avatarData: r.user.avatarData || null,
        points: r.points
      })) });
    }

    const rows = await prisma.stats.findMany({
      where: { totalPoints: { gt: 0 } },
      orderBy: [{ totalPoints: 'desc' }, { user: { username: 'asc' } }],
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
    // Snapshot current week into lastWeek before resetting — single round-trip, not N+1.
    const allStats = await prisma.stats.findMany({
      where: { weekPoints: { gt: 0 } },
      select: { userId: true, weekPoints: true, weekStart: true }
    });
    if (allStats.length > 0) {
      // Group by (weekPoints, weekStart) and emit one update per unique pair would be
      // overkill for typical sizes; serial updates inside a transaction keep semantics
      // intact and avoid the partial-failure problem of the previous loop.
      await prisma.$transaction(allStats.map(s =>
        prisma.stats.update({
          where: { userId: s.userId },
          data: { lastWeekPoints: s.weekPoints, lastWeekStart: s.weekStart }
        })
      ));
    }
    await prisma.stats.updateMany({
      data: { weekPoints: 0, weekStart: '' }
    });
    res.json({ ok: true, message: 'All weekly points reset to 0', snapshotted: allStats.length });
  } catch (err) {
    console.error('reset-weekly error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
