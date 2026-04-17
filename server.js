// Doodle or Not — Express server with Postgres-backed API + static site.
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { updateDataset } = require('./src/update-sales');

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
const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api/leaderboard', readLimiter, leaderboardRoutes);
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
    maxAge: '1d',
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

// ----- Monthly sales updater (1st of month, 03:00 UTC) -----
const { requireAuth } = require('./src/auth');

// Manual trigger: POST /api/admin/update-sales (admin only)
app.post('/api/admin/update-sales', requireAuth, async (req, res) => {
  try {
    const prisma = require('./src/db');
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    if (!user || user.username !== 'degos') return res.status(403).json({ error: 'admin_only' });
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'missing_opensea_key' });
    res.json({ status: 'started', message: 'Sales update running in background...' });
    updateDataset(apiKey).then(r => console.log('Manual sales update result:', r)).catch(e => console.error('Manual sales update failed:', e));
  } catch (err) {
    console.error('update-sales error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Auto-cron: check every hour if it's the 1st of the month at 03:00 UTC
let lastUpdateMonth = -1;
setInterval(() => {
  const now = new Date();
  const day = now.getUTCDate();
  const hour = now.getUTCHours();
  const month = now.getUTCMonth();
  if (day === 1 && hour === 3 && month !== lastUpdateMonth) {
    lastUpdateMonth = month;
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) { console.warn('Skipping sales update: no OPENSEA_API_KEY'); return; }
    console.log('Monthly sales update triggered (1st of month, 03:00 UTC)');
    updateDataset(apiKey)
      .then(r => console.log('Monthly sales update result:', r))
      .catch(e => console.error('Monthly sales update FAILED:', e));
  }
}, 60 * 60 * 1000); // check every hour

app.listen(PORT, () => {
  console.log(`Doodle or Not listening on :${PORT} (node ${process.version})`);
});
