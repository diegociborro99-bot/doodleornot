const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');
const { todayISO, weekStartISO } = require('../util');

const router = express.Router();

// Maximum points per mode per round (prevents client-sent inflated scores)
const MAX_POINTS_PER_MODE = 25;

// POST /api/progress   { mode, points, icons, clutch? }
// mode: 'higher' | 'rarity' | 'trait'
router.post('/', requireAuth, async (req, res) => {
  try {
    const { mode, icons = [], clutch = false } = req.body || {};
    // Always use server-computed day — never trust client
    const day = todayISO();
    // Clamp points to prevent manipulation
    const rawPoints = parseInt(req.body && req.body.points, 10) || 0;
    const points = Math.max(0, Math.min(rawPoints, MAX_POINTS_PER_MODE));

    if (!['higher', 'rarity', 'trait'].includes(mode)) return res.status(400).json({ error: 'bad_mode' });

    // Guard: prevent duplicate submission for same user/mode/day
    const field = mode === 'higher' ? 'higherSale' : mode === 'rarity' ? 'rarityDuel' : 'traitRoulette';
    const existingProgress = await prisma.dailyProgress.findUnique({
      where: { userId_day: { userId: req.userId, day } }
    });
    if (existingProgress && existingProgress[field]) {
      return res.json({ ok: true, progress: existingProgress, duplicate: true });
    }

    // 1) insert a Score row (for replay/history) — catch duplicate constraint
    try {
      await prisma.score.create({
        data: { userId: req.userId, day, mode, points, icons: Array.isArray(icons) ? icons : [] }
      });
    } catch (e) {
      // P2002 = unique constraint violation — duplicate score, skip
      if (e.code === 'P2002') {
        return res.json({ ok: true, duplicate: true });
      }
      throw e;
    }

    // 2) upsert DailyProgress — mark this mode completed
    const existing = existingProgress;
    const badIcons = new Set(['wrong', 'down']);
    const wrongIconsToday = (Array.isArray(icons) ? icons : []).filter(i => badIcons.has(i));

    const baseData = {
      [field]: true,
      totalPoints: (existing?.totalPoints || 0) + points,
      clutch: clutch || existing?.clutch || false,
      wrongIcons: [...(existing?.wrongIcons || []), ...wrongIconsToday]
    };
    const progress = await prisma.dailyProgress.upsert({
      where: { userId_day: { userId: req.userId, day } },
      update: baseData,
      create: { userId: req.userId, day, ...baseData }
    });

    // 3) update Stats (totalGames/totalCorrect/totalPoints/weekPoints/xp)
    const correct = (Array.isArray(icons) ? icons : []).filter(i => i === 'check' || i === 'up').length;
    const weekStart = weekStartISO();

    // Atomic update: first reset weekPoints if new week, then increment
    const statsNow = await prisma.stats.findUnique({ where: { userId: req.userId } });
    if (statsNow && statsNow.weekStart !== weekStart) {
      // New week — reset weekPoints before incrementing
      await prisma.stats.update({
        where: { userId: req.userId },
        data: { weekPoints: 0, weekStart }
      });
    }

    await prisma.stats.upsert({
      where: { userId: req.userId },
      update: {
        totalGames: { increment: 1 },
        totalCorrect: { increment: correct },
        totalPoints: { increment: points },
        weekPoints: { increment: points },
        weekStart,
        xp: { increment: points }
      },
      create: {
        userId: req.userId,
        totalGames: 1,
        totalCorrect: correct,
        totalPoints: points,
        weekPoints: points,
        weekStart,
        xp: points
      }
    });

    // 4) update Streak when all three modes done today
    if (progress.higherSale && progress.rarityDuel && progress.traitRoulette) {
      const streak = await prisma.streak.findUnique({ where: { userId: req.userId } });
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let current = 1, longest = 1;
      if (streak) {
        if (streak.lastPlayedDay === day) {
          current = streak.currentStreak;
          longest = streak.longestStreak;
        } else if (streak.lastPlayedDay === yesterday) {
          current = (streak.currentStreak || 0) + 1;
          longest = Math.max(streak.longestStreak || 0, current);
        } else {
          current = 1;
          longest = Math.max(streak.longestStreak || 0, 1);
        }
      }
      await prisma.streak.upsert({
        where: { userId: req.userId },
        update: { currentStreak: current, longestStreak: longest, lastPlayedDay: day },
        create: { userId: req.userId, currentStreak: 1, longestStreak: 1, lastPlayedDay: day }
      });
    }

    res.json({ ok: true, progress });
  } catch (err) {
    console.error('POST / error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/progress/:day
router.get('/:day', requireAuth, async (req, res) => {
  try {
    const day = req.params.day;
    // Validate day format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'bad_date' });
    const progress = await prisma.dailyProgress.findUnique({
      where: { userId_day: { userId: req.userId, day } }
    });
    res.json(progress || null);
  } catch (err) {
    console.error('GET /:day error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
