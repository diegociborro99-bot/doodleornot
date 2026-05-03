const express = require('express');
const prisma = require('../db');
const { requireAuth, optionalAuth } = require('../auth');
const { todayISO, weekStartISO } = require('../util');

const router = express.Router();

// Validation limits
const MAX_DISTANCE_M = 200_000;
const MAX_DURATION_SEC = 86400;
const MAX_ROUTE_POINTS = 10_000;
const MAX_CALORIES = 20_000;
const ADMIN_USERNAME = 'degos';
const isAdmin = (user) => user && user.username && user.username.toLowerCase() === ADMIN_USERNAME;

// ============================================================
// RUN CLUB ACCESS — request / approve / deny
// ============================================================

// GET /api/runs/access/status — check current user's access status
router.get('/access/status', requireAuth, async (req, res) => {
  try {
    // Admin always has access
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (user && isAdmin(user)) {
      return res.json({ status: 'approved', isAdmin: true });
    }

    const access = await prisma.runClubAccess.findUnique({ where: { userId: req.userId } });
    if (!access) return res.json({ status: 'none' });
    res.json({ status: access.status, requestedAt: access.requestedAt, reviewNote: access.reviewNote });
  } catch (err) {
    console.error('GET /access/status error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/runs/access/request — request access to Run Club
router.post('/access/request', requireAuth, async (req, res) => {
  try {
    // Admin is always approved — no need to request
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (user && isAdmin(user)) {
      return res.json({ status: 'approved' });
    }
    const { socialProof, message } = req.body || {};
    const spVal = typeof socialProof === 'string' ? socialProof.slice(0, 200) : null;
    const msgVal = typeof message === 'string' ? message.slice(0, 500) : null;

    // Use upsert to avoid race conditions / unique constraint violations
    const access = await prisma.runClubAccess.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId,
        socialProof: spVal,
        message: msgVal
      },
      update: {
        // Only update if status was 'denied' (re-apply); otherwise keep existing
        socialProof: spVal,
        message: msgVal
      }
    });

    // If status is denied and they're re-applying, reset to pending
    if (access.status === 'denied') {
      const updated = await prisma.runClubAccess.update({
        where: { userId: req.userId },
        data: { status: 'pending', reviewNote: null, reviewedAt: null, requestedAt: new Date() }
      });
      return res.json({ status: updated.status });
    }

    res.json({ status: access.status });
  } catch (err) {
    console.error('POST /access/request error:', err.message, err.code, err.meta);
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// GET /api/runs/access/pending — admin: list all pending requests
router.get('/access/pending', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (!user || !isAdmin(user)) return res.status(403).json({ error: 'admin_only' });

    const requests = await prisma.runClubAccess.findMany({
      where: { status: 'pending' },
      orderBy: { requestedAt: 'asc' },
      include: { user: { select: { username: true, avatarColor: true, avatarData: true, createdAt: true } } }
    });
    res.json({ requests });
  } catch (err) {
    console.error('GET /access/pending error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/runs/access/all — admin: list all requests (any status)
router.get('/access/all', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (!user || !isAdmin(user)) return res.status(403).json({ error: 'admin_only' });

    const requests = await prisma.runClubAccess.findMany({
      orderBy: { requestedAt: 'desc' },
      include: { user: { select: { username: true, avatarColor: true, avatarData: true } } }
    });
    res.json({ requests });
  } catch (err) {
    console.error('GET /access/all error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/runs/access/:id/review — admin: approve or deny
router.post('/access/:id/review', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (!user || !isAdmin(user)) return res.status(403).json({ error: 'admin_only' });

    const { decision, reviewNote } = req.body || {};
    if (!['approved', 'denied'].includes(decision)) return res.status(400).json({ error: 'bad_decision' });

    const updated = await prisma.runClubAccess.update({
      where: { id: req.params.id },
      data: {
        status: decision,
        reviewNote: typeof reviewNote === 'string' ? reviewNote.slice(0, 300) : null,
        reviewedAt: new Date()
      }
    });
    res.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error('POST /access/:id/review error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// ============================================================
// RUN ACHIEVEMENTS
// ============================================================

const RUN_ACHIEVEMENTS = [
  { id: 'first_run', name: 'First Steps', desc: 'Complete your first run', check: (s) => s.totalRuns >= 1 },
  { id: 'ran_5k', name: '5K Runner', desc: 'Complete a 5K run', checkRun: (r) => r.distanceM >= 5000 },
  { id: 'ran_10k', name: '10K Club', desc: 'Complete a 10K run', checkRun: (r) => r.distanceM >= 10000 },
  { id: 'half_marathon', name: 'Half Marathon', desc: 'Complete a half marathon (21.1km)', checkRun: (r) => r.distanceM >= 21097 },
  { id: 'marathon', name: 'Marathoner', desc: 'Complete a marathon (42.2km)', checkRun: (r) => r.distanceM >= 42195 },
  { id: 'total_50mi', name: '50 Mile Club', desc: 'Run 50 miles total', check: (s) => s.totalDistanceM >= 80467 },
  { id: 'total_100mi', name: 'Century Runner', desc: 'Run 100 miles total', check: (s) => s.totalDistanceM >= 160934 },
  { id: 'total_500mi', name: 'Ultra Legend', desc: 'Run 500 miles total', check: (s) => s.totalDistanceM >= 804672 },
  { id: 'streak_7', name: 'Week Warrior', desc: '7-day running streak', check: (s) => s.streakDays >= 7 },
  { id: 'streak_30', name: 'Iron Will', desc: '30-day running streak', check: (s) => s.streakDays >= 30 },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Run a km under 4:30 pace', check: (s) => s.bestPaceSec > 0 && s.bestPaceSec < 270 },
  { id: 'ten_runs', name: 'Getting Serious', desc: 'Complete 10 runs', check: (s) => s.totalRuns >= 10 },
  { id: 'fifty_runs', name: 'Dedicated', desc: 'Complete 50 runs', check: (s) => s.totalRuns >= 50 },
  { id: 'early_bird', name: 'Early Bird', desc: 'Start a run before 7 AM', checkRun: (r) => new Date(r.startedAt).getHours() < 7 },
  { id: 'night_owl', name: 'Night Owl', desc: 'Start a run after 9 PM', checkRun: (r) => new Date(r.startedAt).getHours() >= 21 },
  { id: 'ran_1mi', name: 'First Mile', desc: 'Run at least 1 mile in a single run', checkRun: (r) => r.distanceM >= 1609 },
  { id: 'three_runs', name: 'Hat Trick', desc: 'Complete 3 runs', check: (s) => s.totalRuns >= 3 },
  { id: 'five_runs', name: 'High Five', desc: 'Complete 5 runs', check: (s) => s.totalRuns >= 5 },
  { id: 'twenty_five_runs', name: 'Quarter Century', desc: 'Complete 25 runs', check: (s) => s.totalRuns >= 25 },
  { id: 'hundred_runs', name: 'Centurion', desc: 'Complete 100 runs', check: (s) => s.totalRuns >= 100 },
  { id: 'total_10mi', name: 'Double Digits', desc: 'Run 10 miles total', check: (s) => s.totalDistanceM >= 16093 },
  { id: 'total_25mi', name: 'Silver Soles', desc: 'Run 25 miles total', check: (s) => s.totalDistanceM >= 40233 },
  { id: 'total_250mi', name: 'Gold Standard', desc: 'Run 250 miles total', check: (s) => s.totalDistanceM >= 402336 },
  { id: 'total_1000mi', name: 'Thousand Miler', desc: 'Run 1000 miles total', check: (s) => s.totalDistanceM >= 1609344 },
  { id: 'streak_3', name: 'Momentum', desc: '3-day running streak', check: (s) => s.streakDays >= 3 },
  { id: 'streak_14', name: 'Fortnight Force', desc: '14-day running streak', check: (s) => s.streakDays >= 14 },
  { id: 'streak_100', name: 'Legendary', desc: '100-day running streak', check: (s) => s.streakDays >= 100 },
  { id: 'long_run_15k', name: 'Long Hauler', desc: 'Complete a 15km run', checkRun: (r) => r.distanceM >= 15000 },
  { id: 'sub_5_pace', name: 'Sub Five', desc: 'Average pace under 5:00/km', check: (s) => s.bestPaceSec > 0 && s.bestPaceSec < 300 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', desc: 'Run on a Saturday or Sunday', checkRun: (r) => { var d = new Date(r.startedAt).getDay(); return d === 0 || d === 6; } },
  { id: 'lunch_run', name: 'Lunch Laps', desc: 'Start a run between 11am and 1pm', checkRun: (r) => { var h = new Date(r.startedAt).getHours(); return h >= 11 && h < 13; } },
  // === v20 NEW ACHIEVEMENTS ===
  { id: 'cal_1000', name: 'Furnace', desc: 'Burn 1,000 total calories', check: (s) => Math.round(s.totalDistanceM / 1000 * 62) >= 1000 },
  { id: 'cal_10000', name: 'Inferno', desc: 'Burn 10,000 total calories', check: (s) => Math.round(s.totalDistanceM / 1000 * 62) >= 10000 },
  { id: 'ran_2k', name: 'Warm Up Done', desc: 'Run 2km in a single run', checkRun: (r) => r.distanceM >= 2000 },
  { id: 'ran_30k', name: 'Ultra Curious', desc: 'Run 30km in a single run', checkRun: (r) => r.distanceM >= 30000 },
  { id: 'sub_4_pace', name: 'Lightning', desc: 'Average pace under 4:00/km', check: (s) => s.bestPaceSec > 0 && s.bestPaceSec < 240 },
  { id: 'hour_run', name: 'Hour Power', desc: 'Run for 60+ minutes non-stop', checkRun: (r) => r.durationSec >= 3600 },
  { id: 'two_hour_run', name: 'Endurance King', desc: 'Run for 2+ hours non-stop', checkRun: (r) => r.durationSec >= 7200 },
  { id: 'dawn_patrol', name: 'Dawn Patrol', desc: 'Start a run before 5 AM', checkRun: (r) => new Date(r.startedAt).getHours() < 5 },
  { id: 'midnight_runner', name: 'Midnight Runner', desc: 'Start a run after 11 PM', checkRun: (r) => new Date(r.startedAt).getHours() >= 23 },
  { id: 'two_hundred_runs', name: 'Unstoppable', desc: 'Complete 200 runs', check: (s) => s.totalRuns >= 200 },
];

async function checkAndUnlockAchievements(userId, runStats, run) {
  const existing = await prisma.runAchievement.findMany({
    where: { userId },
    select: { achievementId: true }
  });
  const unlocked = new Set(existing.map(a => a.achievementId));
  const newUnlocks = [];

  for (const ach of RUN_ACHIEVEMENTS) {
    if (unlocked.has(ach.id)) continue;
    let earned = false;
    if (ach.check && runStats) earned = ach.check(runStats);
    if (ach.checkRun && run) earned = earned || ach.checkRun(run);
    if (earned) newUnlocks.push(ach.id);
  }

  if (newUnlocks.length > 0) {
    await prisma.runAchievement.createMany({
      data: newUnlocks.map(id => ({ userId, achievementId: id })),
      skipDuplicates: true
    });
  }
  return newUnlocks;
}

// GET /api/runs/achievements — user's run achievements
router.get('/achievements', requireAuth, async (req, res) => {
  try {
    const unlocked = await prisma.runAchievement.findMany({
      where: { userId: req.userId },
      select: { achievementId: true, unlockedAt: true }
    });
    const unlockedMap = {};
    for (const u of unlocked) unlockedMap[u.achievementId] = u.unlockedAt;

    res.json({
      achievements: RUN_ACHIEVEMENTS.map(a => ({
        id: a.id, name: a.name, desc: a.desc,
        unlocked: !!unlockedMap[a.id],
        unlockedAt: unlockedMap[a.id] || null
      }))
    });
  } catch (err) {
    console.error('GET /achievements error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// ============================================================
// AI COACH — post-run analysis
// ============================================================

function generateCoachTips(run, stats) {
  const tips = [];
  const distKm = run.distanceM / 1000;
  const paceMin = run.avgPaceSec / 60;
  const durMin = run.durationSec / 60;

  // Pace analysis
  if (run.avgPaceSec > 0 && run.avgPaceSec < 300) {
    tips.push({ type: 'pace', icon: 'zap', text: `Great pace! ${Math.floor(paceMin)}:${String(Math.floor(run.avgPaceSec % 60)).padStart(2, '0')}/km is fast. Make sure to balance speed days with easy recovery runs.` });
  } else if (run.avgPaceSec >= 300 && run.avgPaceSec < 420) {
    tips.push({ type: 'pace', icon: 'check', text: `Solid pace at ${Math.floor(paceMin)}:${String(Math.floor(run.avgPaceSec % 60)).padStart(2, '0')}/km. This is a great tempo effort.` });
  } else if (run.avgPaceSec >= 420) {
    tips.push({ type: 'pace', icon: 'heart', text: `Easy pace run — perfect for building endurance. These runs should make up 80% of your training.` });
  }

  // Distance milestones
  if (distKm >= 5 && distKm < 10) {
    tips.push({ type: 'distance', icon: 'star', text: `Nice ${distKm.toFixed(1)}km run! You're building a solid aerobic base.` });
  } else if (distKm >= 10) {
    tips.push({ type: 'distance', icon: 'trophy', text: `${distKm.toFixed(1)}km — impressive distance! Remember to refuel with carbs and protein within 30 minutes.` });
  }

  // Recovery
  if (durMin > 45) {
    tips.push({ type: 'recovery', icon: 'moon', text: 'After a long effort, take a rest day or do light cross-training tomorrow. Hydrate well!' });
  }

  // Streak encouragement
  if (stats) {
    if (stats.streakDays >= 3 && stats.streakDays < 7) {
      tips.push({ type: 'streak', icon: 'fire', text: `${stats.streakDays}-day streak! Keep it up — you're building a habit. Remember rest days are important too.` });
    } else if (stats.streakDays >= 7) {
      tips.push({ type: 'streak', icon: 'fire', text: `Amazing ${stats.streakDays}-day streak! Consider one easy/rest day per week to prevent overtraining.` });
    }

    // Weekly volume
    const weekKm = stats.weekDistanceM / 1000;
    if (weekKm > 30) {
      tips.push({ type: 'volume', icon: 'alert', text: `${weekKm.toFixed(0)}km this week — high volume! Increase weekly mileage by no more than 10% to avoid injury.` });
    }

    // Progress
    if (stats.totalRuns > 1 && stats.bestPaceSec > 0 && run.avgPaceSec <= stats.bestPaceSec) {
      tips.push({ type: 'pr', icon: 'zap', text: 'New personal best pace! You\'re getting faster. Keep mixing speed work with easy runs.' });
    }
  }

  // General tips rotation based on run count
  const generalTips = [
    { type: 'tip', icon: 'bulb', text: 'Try the 80/20 rule: 80% easy runs, 20% hard efforts. It builds endurance without burnout.' },
    { type: 'tip', icon: 'bulb', text: 'Cadence matters! Aim for 170-180 steps per minute to reduce impact and improve efficiency.' },
    { type: 'tip', icon: 'bulb', text: 'Stay hydrated: drink ~500ml of water in the hour before running, especially in warm weather.' },
    { type: 'tip', icon: 'bulb', text: 'Warm up with 5 minutes of brisk walking before starting your run to prevent injuries.' },
    { type: 'tip', icon: 'bulb', text: 'Post-run stretching for 5-10 minutes reduces soreness and improves flexibility.' },
    { type: 'tip', icon: 'bulb', text: 'Hill training once a week builds strength and speed. Find a hill and do 4-6 repeats.' },
    { type: 'tip', icon: 'bulb', text: 'Your running form: lean slightly forward, land midfoot, keep arms at 90 degrees.' },
  ];
  const runIdx = stats ? (stats.totalRuns || 0) : 0;
  tips.push(generalTips[runIdx % generalTips.length]);

  return tips.slice(0, 3); // max 3 tips per run
}

// GET /api/runs/coach/:runId — AI coach tips for a specific run
router.get('/coach/:runId', requireAuth, async (req, res) => {
  try {
    const run = await prisma.run.findFirst({
      where: { id: req.params.runId, userId: req.userId },
      select: { distanceM: true, durationSec: true, avgPaceSec: true, startedAt: true, calories: true }
    });
    if (!run) return res.status(404).json({ error: 'not_found' });

    const stats = await prisma.runStats.findUnique({ where: { userId: req.userId } });
    const tips = generateCoachTips(run, stats);
    res.json({ tips });
  } catch (err) {
    console.error('GET /coach error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// ============================================================
// COMMUNITY STATS + WEEKLY CHALLENGE
// ============================================================

// GET /api/runs/community/stats — aggregate stats for all runners
router.get('/community/stats', optionalAuth, async (req, res) => {
  try {
    const agg = await prisma.runStats.aggregate({
      _sum: { totalDistanceM: true, totalRuns: true },
      _count: { userId: true }
    });
    const ws = weekStartISO();
    const weekAgg = await prisma.runStats.aggregate({
      where: { weekStart: ws },
      _sum: { weekDistanceM: true, weekRuns: true }
    });

    // Get active weekly challenge
    const challenge = await prisma.weeklyChallenge.findUnique({ where: { weekStart: ws } });

    res.json({
      totalRunners: agg._count.userId || 0,
      totalDistanceM: agg._sum.totalDistanceM || 0,
      totalRuns: agg._sum.totalRuns || 0,
      weekDistanceM: weekAgg._sum.weekDistanceM || 0,
      weekRuns: weekAgg._sum.weekRuns || 0,
      challenge: challenge ? {
        title: challenge.title,
        description: challenge.description,
        goalM: challenge.goalM,
        currentM: weekAgg._sum.weekDistanceM || 0
      } : null
    });
  } catch (err) {
    console.error('GET /community/stats error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/runs/community/challenge — admin: create weekly challenge
router.post('/community/challenge', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (!user || !isAdmin(user)) return res.status(403).json({ error: 'admin_only' });

    const { title, description, goalKm } = req.body || {};
    if (!title || !goalKm) return res.status(400).json({ error: 'missing_fields' });

    const ws = weekStartISO();
    const challenge = await prisma.weeklyChallenge.upsert({
      where: { weekStart: ws },
      update: { title, description: description || '', goalM: Math.round(goalKm * 1000) },
      create: { weekStart: ws, title, description: description || '', goalM: Math.round(goalKm * 1000) }
    });
    res.json({ ok: true, challenge });
  } catch (err) {
    console.error('POST /community/challenge error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// ============================================================
// CORE RUN CRUD
// ============================================================

// Middleware: check Run Club access (used on run-saving endpoints)
async function requireRunAccess(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (user && isAdmin(user)) return next();

    const access = await prisma.runClubAccess.findUnique({ where: { userId: req.userId } });
    if (!access || access.status !== 'approved') {
      return res.status(403).json({ error: 'run_club_access_required' });
    }
    next();
  } catch (err) {
    console.error('requireRunAccess error:', err);
    res.status(500).json({ error: 'server_error' });
  }
}

// POST /api/runs  — save a completed run
router.post('/', requireAuth, requireRunAccess, async (req, res) => {
  try {
    const { startedAt, endedAt, distanceM, durationSec, avgPaceSec, calories, route, status, splits } = req.body || {};

    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    if (isNaN(start.getTime())) return res.status(400).json({ error: 'bad_start' });
    if (isNaN(end.getTime())) return res.status(400).json({ error: 'bad_end' });

    const dist = Math.max(0, Math.min(parseInt(distanceM, 10) || 0, MAX_DISTANCE_M));
    const dur = Math.max(0, Math.min(parseInt(durationSec, 10) || 0, MAX_DURATION_SEC));
    const pace = Math.max(0, Math.min(parseInt(avgPaceSec, 10) || 0, 3600));
    const cal = Math.max(0, Math.min(parseInt(calories, 10) || 0, MAX_CALORIES));
    const runStatus = status === 'abandoned' ? 'abandoned' : 'completed';

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

    let newAchievements = [];

    // Update RunStats
    if (runStatus === 'completed' && dist > 0) {
      const ws = weekStartISO();
      const today = todayISO();
      const existing = await prisma.runStats.findUnique({ where: { userId: req.userId } });

      let updatedStats;
      if (!existing) {
        updatedStats = await prisma.runStats.create({
          data: {
            userId: req.userId,
            totalRuns: 1, totalDistanceM: dist, totalDurationSec: dur,
            longestRunM: dist,
            bestPaceSec: pace > 0 ? pace : 0,
            weekDistanceM: dist, weekRuns: 1, weekStart: ws,
            streakDays: 1, lastRunDay: today
          }
        });
      } else {
        const sameWeek = existing.weekStart === ws;
        const weekDist = sameWeek ? existing.weekDistanceM + dist : dist;
        const weekRuns = sameWeek ? existing.weekRuns + 1 : 1;

        let streak = existing.streakDays;
        if (existing.lastRunDay) {
          const lastDate = new Date(existing.lastRunDay + 'T00:00:00Z');
          const todayDate = new Date(today + 'T00:00:00Z');
          const diffDays = Math.round((todayDate - lastDate) / 86400000);
          if (diffDays === 1) streak += 1;
          else if (diffDays > 1) streak = 1;
        }

        updatedStats = await prisma.runStats.update({
          where: { userId: req.userId },
          data: {
            totalRuns: existing.totalRuns + 1,
            totalDistanceM: existing.totalDistanceM + dist,
            totalDurationSec: existing.totalDurationSec + dur,
            longestRunM: Math.max(existing.longestRunM, dist),
            bestPaceSec: pace > 0 && (existing.bestPaceSec === 0 || pace < existing.bestPaceSec) ? pace : existing.bestPaceSec,
            weekDistanceM: weekDist, weekRuns, weekStart: ws,
            streakDays: streak, lastRunDay: today
          }
        });
      }

      // Check achievements
      newAchievements = await checkAndUnlockAchievements(req.userId, updatedStats, run);
    }

    // Generate AI coach tips
    const stats = await prisma.runStats.findUnique({ where: { userId: req.userId } });
    const coachTips = generateCoachTips(run, stats);

    res.json({
      ok: true,
      run: { id: run.id, distanceM: dist, durationSec: dur, avgPaceSec: pace },
      newAchievements,
      coachTips
    });
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
        id: true, startedAt: true, distanceM: true,
        durationSec: true, avgPaceSec: true, calories: true, status: true
      }
    });
    const total = await prisma.run.count({ where: { userId: req.userId, status: 'completed' } });
    res.json({ runs, total, limit, offset });
  } catch (err) {
    console.error('GET /api/runs error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/runs/me/stats
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
    console.error('GET /runs/me/stats error:', err);
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
          userId: true, weekDistanceM: true, weekRuns: true,
          user: { select: { username: true, avatarColor: true, avatarData: true } }
        }
      });
      return res.json({
        scope, rows: rows.map((r, i) => ({
          rank: i + 1, username: r.user.username,
          avatarColor: r.user.avatarColor, avatarData: r.user.avatarData || null,
          distanceM: r.weekDistanceM, runs: r.weekRuns
        }))
      });
    }

    const rows = await prisma.runStats.findMany({
      where: { totalDistanceM: { gt: 0 } },
      orderBy: { totalDistanceM: 'desc' },
      take: limit,
      select: {
        userId: true, totalDistanceM: true, totalRuns: true,
        user: { select: { username: true, avatarColor: true, avatarData: true } }
      }
    });
    res.json({
      scope, rows: rows.map((r, i) => ({
        rank: i + 1, username: r.user.username,
        avatarColor: r.user.avatarColor, avatarData: r.user.avatarData || null,
        distanceM: r.totalDistanceM, runs: r.totalRuns
      }))
    });
  } catch (err) {
    console.error('GET /club/leaderboard error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/runs/:id — single run with full route
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const run = await prisma.run.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!run) return res.status(404).json({ error: 'not_found' });
    res.json(run);
  } catch (err) {
    console.error('GET /runs/:id error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
