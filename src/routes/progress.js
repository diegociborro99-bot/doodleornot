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
    const { mode } = req.body || {};
    // Always use server-computed day — never trust client
    const day = todayISO();
    // Clamp points to prevent manipulation
    const rawPoints = parseInt(req.body && req.body.points, 10) || 0;
    const points = Math.max(0, Math.min(rawPoints, MAX_POINTS_PER_MODE));

    if (!['higher', 'rarity', 'trait'].includes(mode)) return res.status(400).json({ error: 'bad_mode' });

    // Validate and cap icons array (max 15 rounds per mode)
    const VALID_ICONS = new Set(['check', 'up', 'down', 'wrong', 'perfect', 'correct', 'near', 'skip']);
    const rawIcons = Array.isArray(req.body.icons) ? req.body.icons : [];
    const icons = rawIcons.filter(i => typeof i === 'string' && VALID_ICONS.has(i)).slice(0, 15);
    // Server-computed clutch: all icons are bad until the last one (0 wrong when freeze absorbs)
    const clutch = false; // clutch is cosmetic only, disable client-controlled value

    const field = mode === 'higher' ? 'higherSale' : mode === 'rarity' ? 'rarityDuel' : 'traitRoulette';
    const correct = Math.min(15, icons.filter(i => i === 'check' || i === 'up' || i === 'perfect' || i === 'correct').length);
    const weekStart = weekStartISO();
    const badIcons = new Set(['wrong', 'down']);
    const wrongIconsToday = (Array.isArray(icons) ? icons : []).filter(i => badIcons.has(i));

    // Entire read-check-write wrapped in serializable transaction to prevent
    // concurrent requests from duplicating points or bypassing the mode guard.
    const result = await prisma.$transaction(async (tx) => {
      // Guard: prevent duplicate submission for same user/mode/day
      const existingProgress = await tx.dailyProgress.findUnique({
        where: { userId_day: { userId: req.userId, day } }
      });
      if (existingProgress && existingProgress[field]) {
        return { ok: true, progress: existingProgress, duplicate: true };
      }

      // 1) insert Score row — unique constraint is the last-resort guard
      await tx.score.create({
        data: { userId: req.userId, day, mode, points, icons: Array.isArray(icons) ? icons : [] }
      });

      // 2) upsert DailyProgress — mark this mode completed
      const existing = existingProgress;
      const baseData = {
        [field]: true,
        totalPoints: (existing?.totalPoints || 0) + points,
        clutch: clutch || existing?.clutch || false,
        wrongIcons: [...(existing?.wrongIcons || []), ...wrongIconsToday]
      };
      const progress = await tx.dailyProgress.upsert({
        where: { userId_day: { userId: req.userId, day } },
        update: baseData,
        create: { userId: req.userId, day, ...baseData }
      });

      // 3) update Stats — snapshot last week if needed, then increment
      const statsNow = await tx.stats.findUnique({ where: { userId: req.userId } });
      if (statsNow && statsNow.weekStart !== weekStart && statsNow.weekStart !== '') {
        await tx.stats.update({
          where: { userId: req.userId },
          data: {
            lastWeekPoints: statsNow.weekPoints,
            lastWeekStart: statsNow.weekStart,
            weekPoints: 0,
            weekStart
          }
        });
      }

      await tx.stats.upsert({
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
        const streak = await tx.streak.findUnique({ where: { userId: req.userId } });
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
        await tx.streak.upsert({
          where: { userId: req.userId },
          update: { currentStreak: current, longestStreak: longest, lastPlayedDay: day },
          create: { userId: req.userId, currentStreak: 1, longestStreak: 1, lastPlayedDay: day }
        });
      }

      return { ok: true, progress };
    }, { isolationLevel: 'Serializable' });

    if (result.duplicate) return res.json(result);
    res.json(result);
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
