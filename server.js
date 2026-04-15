// Doodle or Not — Express server with Postgres-backed API + static site.
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const progressRoutes = require('./src/routes/progress');
const leaderboardRoutes = require('./src/routes/leaderboard');
const dexRoutes = require('./src/routes/dex');
const achievementsRoutes = require('./src/routes/achievements');
const leaguesRoutes = require('./src/routes/leagues');
const prefsRoutes = require('./src/routes/preferences');
const powerupsRoutes = require('./src/routes/powerups');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.set('trust proxy', 1);               // for Railway / proxies (correct client IP for rate-limits)
app.use(compression({ level: 6 }));
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// ----- rate limits -----
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

// ----- API -----
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/progress', writeLimiter, progressRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/dex', writeLimiter, dexRoutes);
app.use('/api/achievements', writeLimiter, achievementsRoutes);
app.use('/api/leagues', writeLimiter, leaguesRoutes);
app.use('/api/preferences', writeLimiter, prefsRoutes);
app.use('/api/powerups', writeLimiter, powerupsRoutes);

// ----- health / error guard -----
app.get('/healthz', async (_req, res) => {
  try {
    const prisma = require('./src/db');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});
app.use('/api', (err, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: 'internal_error' });
});

// ----- static site -----
app.use(
  '/doodles-dataset.js',
  express.static(path.join(PUBLIC_DIR, 'doodles-dataset.js'), {
    maxAge: '30d', immutable: true,
    setHeaders(res) { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); }
  })
);
app.use(express.static(PUBLIC_DIR, {
  etag: true, lastModified: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// SPA fallback (ignore /api/* so 404s from API aren't swallowed by index.html)
app.get(/^(?!\/api\/).*$/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Doodle or Not listening on :${PORT} (node ${process.version})`);
});
