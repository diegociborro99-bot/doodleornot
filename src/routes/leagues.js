const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../auth');
const { makeLeagueCode, weekStartISO } = require('../util');

const router = express.Router();

// POST /api/leagues  { name }
router.post('/', requireAuth, async (req, res) => {
  const name = (req.body && req.body.name || '').trim().slice(0, 40) || 'Untitled League';
  // try codes up to 5 times
  let code = null;
  for (let i = 0; i < 5 && !code; i++) {
    const candidate = makeLeagueCode();
    const clash = await prisma.league.findUnique({ where: { code: candidate } });
    if (!clash) code = candidate;
  }
  if (!code) return res.status(500).json({ error: 'code_collision' });
  const league = await prisma.league.create({
    data: {
      code, name, creatorId: req.userId,
      members: { create: { userId: req.userId } }
    }
  });
  res.json({ code: league.code, name: league.name });
});

// POST /api/leagues/:code/join
router.post('/:code/join', requireAuth, async (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const league = await prisma.league.findUnique({ where: { code } });
  if (!league) return res.status(404).json({ error: 'not_found' });
  await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId: req.userId } },
    update: {},
    create: { leagueId: league.id, userId: req.userId }
  });
  res.json({ code: league.code, name: league.name });
});

// GET /api/leagues/:code — members with weekly points
router.get('/:code', requireAuth, async (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const league = await prisma.league.findUnique({
    where: { code },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true, username: true, avatarColor: true,
              stats: { select: { weekPoints: true, weekStart: true, totalPoints: true } }
            }
          }
        }
      }
    }
  });
  if (!league) return res.status(404).json({ error: 'not_found' });
  const ws = weekStartISO();
  const members = league.members.map(m => ({
    username: m.user.username,
    avatarColor: m.user.avatarColor,
    weekPoints: m.user.stats && m.user.stats.weekStart === ws ? m.user.stats.weekPoints : 0,
    totalPoints: m.user.stats ? m.user.stats.totalPoints : 0
  })).sort((a, b) => b.weekPoints - a.weekPoints);
  res.json({ code: league.code, name: league.name, members });
});

// GET /api/leagues — list mine
router.get('/', requireAuth, async (req, res) => {
  const rows = await prisma.leagueMember.findMany({
    where: { userId: req.userId },
    include: { league: { select: { code: true, name: true } } }
  });
  res.json({ leagues: rows.map(r => ({ code: r.league.code, name: r.league.name })) });
});

module.exports = router;
