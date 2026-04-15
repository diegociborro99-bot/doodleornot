const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');
const { todayISO, weekStartISO } = require('../util');

const router = express.Router();

// POST /api/progress   { day, mode, points, icons, clutch? }
// mode: 'higher' | 'rarity' | 'trait'
router.post('/', requireAuth, async (req, res) => {
  const { mode, points = 0, icons = [], clutch = false } = req.body || {};
  const day = (req.body && req.body.day) || todayISO();
  if (!['higher', 'rarity', 'trait'].includes(mode)) return res.status(400).json({ error: 'bad_mode' });

  // 1) insert a Score row (for replay/history)
  await prisma.score.create({
    data: { userId: req.userId, day, mode, points, icons: Array.isArray(icons) ? icons : [] }
  });

  // 2) upsert DailyProgress — mark this mode completed
  const field = mode === 'higher' ? 'higherSale' : mode === 'rarity' ? 'rarityDuel' : 'traitRoulette';
  const existing = await prisma.dailyProgress.findUnique({
    where: { userId_day: { userId: req.userId, day } }
  });
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
  const isCurrentWeek = (ws) => ws === weekStartISO();
  const statsNow = await prisma.stats.findUnique({ where: { userId: req.userId } });
  const weekStart = weekStartISO();
  const weekPoints = (statsNow && isCurrentWeek(statsNow.weekStart)) ? statsNow.weekPoints + points : points;

  await prisma.stats.upsert({
    where: { userId: req.userId },
    update: {
      totalGames: { increment: 1 },
      totalCorrect: { increment: correct },
      totalPoints: { increment: points },
      weekPoints,
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
});

// GET /api/progress/:day
router.get('/:day', requireAuth, async (req, res) => {
  const progress = await prisma.dailyProgress.findUnique({
    where: { userId_day: { userId: req.userId, day: req.params.day } }
  });
  res.json(progress || null);
});

module.exports = router;
