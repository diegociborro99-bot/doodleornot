const express = require('express');
const prisma = require('../db');
const { requireAuth, optionalAuth } = require('../auth');
const { todayISO, weekStartISO } = require('../util');

const router = express.Router();

// Validation limits
const MAX_DISTANCE_M = 200_000;   // 200 km max per run
const MAX_DURATION_SEC = 86400;   // 24h max
const MAX_ROUTE_POINTS = 10_000;  // GPS points cap
const MAX_CALORIES = 20_000;

// POST /api/runs  — save a completed run
router.post('/', requireAuth, async (req, res) => {
  try {
    const { startedAt, endedAt, distanceM, durationSec, avgPaceSec, calories, route, status } = req.body || {};

    // Validate required fields
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    if (isNaN(start.getTime())) return res.status(400).json({ error: 'bad_start' });
    if (isNaN(end.getTime())) return res.status(400).json({ error: 'bad_end' });

    const dist = Math.max(0, Math.min(parseInt(distanceM, 10) || 0, MAX_DISTANCE_M));
    const dur = Math.max(0, Math.min(parseInt(durationSec, 10) || 0, MAX_DURATION_SEC));
    const pace = Math.max(0, Math.min(parseInt(avgPaceSec, 10) || 0, 3600)); // max 60min/km
    const cal = Math.max(0, Math.min(parseInt(calories, 10) || 0, MAX_CALORIES));
    const runStatus = status === 'abandoned' ? 'abandoned' : 'completed';

    // Validate & cap route
    let cleanRoute = null;
    if (Array.isArray(route)) {
      cleanRoute = route.slice(0, MAX_ROUTE_POINTS).map(p => ({
        lat: Number(p.lat) || 0,
        lng: Number(p.lng) || 0,
        ts: Number(p.ts) || 0
      }));
    }

    const run = await prisma.run.create({
      data: {
        userId: req.userId,
        startedAt: start,
        endedAt: end,
        distanceM: dist,
        durationSec: dur,
        avgPaceSec: pace,
        calories: cal,
        route: cleanRoute,
        status: runStatus
      }
    });

    // Update RunStats
    if (runStatus === 'completed' && dist > 0) {
      const ws = weekStartISO();
      const today = todayISO();

      const existing = await prisma.runStats.findUnique({ where: { userId: req.userId } });

      if (!existing) {
        await prisma.runStats.create({
          data: {
            userId: req.userId,
            totalRuns: 1,
            totalDistanceM: dist,
            totalDurationSec: dur,
            longestRunM: dist,
            bestPaceSec: pace > 0 ? pace : 0,
            weekDistanceM: dist,
            weekRuns: 1,
            weekStart: ws,
            streakDays: 1,
            lastRunDay: today
          }
        });
      } else {
        // Reset week if new week
        const sameWeek = existing.weekStart === ws;
        const weekDist = sameWeek ? existing.weekDistanceM + dist : dist;
        const weekRuns = sameWeek ? existing.weekRuns + 1 : 1;

        // Streak: consecutive days
        let streak = existing.streakDays;
        if (existing.lastRunDay) {
          const lastDate = new Date(existing.lastRunDay + 'T00:00:00Z');
          const todayDate = new Date(today + 'T00:00:00Z');
          const diffDays = Math.round((todayDate - lastDate) / 86400000);
          if (diffDays === 1) streak += 1;
          else if (diffDays > 1) streak = 1;
          // diffDays === 0: same day, keep streak
        }

        await prisma.runStats.update({
          where: { userId: req.userId },
          data: {
            totalRuns: existing.totalRuns + 1,
            totalDistanceM: existing.totalDistanceM + dist,
            totalDurationSec: existing.totalDurationSec + dur,
            longestRunM: Math.max(existing.longestRunM, dist),
            bestPaceSec: pace > 0 && (existing.bestPaceSec === 0 || pace < existing.bestPaceSec) ? pace : existing.bestPaceSec,
            weekDistanceM: weekDist,
            weekRuns: weekRuns,
            weekStart: ws,
            streakDays: streak,
            lastRunDay: today
          }
        });
      }
    }

    res.json({ ok: true, run: { id: run.id, distanceM: dist, durationSec: dur, avgPaceSec: pace } });
  } catch (err) {
    console.error('POST /api/runs error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/runs?limit=20&offset=0  — user's run history
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '20', 10)));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));

    const runs = await prisma.run.findMany({
      where: { userId: req.userId, status: 'completed' },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        startedAt: true,
        distanceM: true,
        durationSec: true,
        avgPaceSec: true,
        calories: true,
        status: true
      }
    });

    const total = await prisma.run.count({ where: { userId: req.userId, status: 'completed' } });

    res.json({ runs, total, limit, offset });
  } catch (err) {
    console.error('GET /api/runs error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/runs/:id  — single run with full route
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const run = await prisma.run.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!run) return res.status(404).json({ error: 'not_found' });
    res.json(run);
  } catch (err) {
    console.error('GET /api/runs/:id error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/runs/me/stats  — user's run stats
router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const ws = weekStartISO();
    let stats = await prisma.runStats.findUnique({ where: { userId: req.userId } });

    if (!stats) {
      return res.json({
        totalRuns: 0, totalDistanceM: 0, totalDurationSec: 0,
        longestRunM: 0, bestPaceSec: 0,
        weekDistanceM: 0, weekRuns: 0, streakDays: 0
      });
    }

    // Reset week stats if stale
    if (stats.weekStart !== ws) {
      stats = await prisma.runStats.update({
        where: { userId: req.userId },
        data: { weekDistanceM: 0, weekRuns: 0, weekStart: ws }
      });
    }

    res.json({
      totalRuns: stats.totalRuns,
      totalDistanceM: stats.totalDistanceM,
      totalDurationSec: stats.totalDurationSec,
      longestRunM: stats.longestRunM,
      bestPaceSec: stats.bestPaceSec,
      weekDistanceM: stats.weekDistanceM,
      weekRuns: stats.weekRuns,
      streakDays: stats.streakDays
    });
  } catch (err) {
    console.error('GET /api/runs/me/stats error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/runs/club/leaderboard?scope=weekly|alltime&limit=20
router.get('/club/leaderboard', optionalAuth, async (req, res) => {
  try {
    const scope = req.query.scope === 'alltime' ? 'alltime' : 'weekly';
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '20', 10)));

    if (scope === 'weekly') {
      const ws = weekStartISO();
      const rows = await prisma.runStats.findMany({
        where: { weekStart: ws, weekDistanceM: { gt: 0 } },
        orderBy: { weekDistanceM: 'desc' },
        take: limit,
        select: {
          userId: true,
          weekDistanceM: true,
          weekRuns: true,
          user: { select: { username: true, avatarColor: true, avatarData: true } }
        }
      });
      return res.json({
        scope, rows: rows.map((r, i) => ({
          rank: i + 1,
          username: r.user.username,
          avatarColor: r.user.avatarColor,
          avatarData: r.user.avatarData || null,
          distanceM: r.weekDistanceM,
          runs: r.weekRuns
        }))
      });
    }

    // alltime
    const rows = await prisma.runStats.findMany({
      where: { totalDistanceM: { gt: 0 } },
      orderBy: { totalDistanceM: 'desc' },
      take: limit,
      select: {
        userId: true,
        totalDistanceM: true,
        totalRuns: true,
        user: { select: { username: true, avatarColor: true, avatarData: true } }
      }
    });
    res.json({
      scope, rows: rows.map((r, i) => ({
        rank: i + 1,
        username: r.user.username,
        avatarColor: r.user.avatarColor,
        avatarData: r.user.avatarData || null,
        distanceM: r.totalDistanceM,
        runs: r.totalRuns
      }))
    });
  } catch (err) {
    console.error('GET /api/runs/club/leaderboard error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
