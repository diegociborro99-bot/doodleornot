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
const runsRoutes = require('./src/routes/runs');

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
app.use('/api/runs', writeLimiter, runsRoutes);

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
    // Critical app files: always revalidate so deploys take effect immediately
    // sw.js: no-store prevents ANY caching — browser always fetches fresh copy
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }
    // Other critical app files: revalidate so deploys take effect immediately
    else if (filePath.endsWith('index.html') || filePath.endsWith('app.js') || filePath.endsWith('api.js') || filePath.endsWith('run-club.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    // Static assets (images, icons, fonts, CSS): cache 24h
    else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
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
    if (!user || !user.username || user.username.toLowerCase() !== 'degos') return res.status(403).json({ error: 'admin_only' });
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

app.listen(PORT, async () => {
  console.log(`Doodle or Not listening on :${PORT} (node ${process.version})`);

  // Run migrations AFTER server is listening (so Railway healthcheck passes)
  const prisma = require('./src/db');
  try {
    // Fix Prisma's failed migration state so future deploys won't crash
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations" WHERE "migration_name" LIKE '%add_run_club%' AND "finished_at" IS NULL
    `).catch(() => {});
    // Mark it as successfully applied
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
      VALUES (gen_random_uuid()::text, 'manual', '20260429200000_add_run_club', NOW(), 1)
      ON CONFLICT DO NOTHING
    `).catch(() => {});
    console.log('[migration] Cleaned up Prisma migration state.');
  } catch (_) { /* table might not exist yet on fresh DB */ }

  try {
    console.log('[migration] Creating Run Club tables if needed...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "RunClubAccess" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "socialProof" TEXT,
          "message" TEXT,
          "reviewNote" TEXT,
          "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reviewedAt" TIMESTAMP(3),
          CONSTRAINT "RunClubAccess_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RunClubAccess_userId_key" ON "RunClubAccess"("userId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RunClubAccess_status_idx" ON "RunClubAccess"("status")`);
      await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "RunClubAccess" ADD CONSTRAINT "RunClubAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Run" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "startedAt" TIMESTAMP(3) NOT NULL,
          "endedAt" TIMESTAMP(3),
          "distanceM" INTEGER NOT NULL DEFAULT 0,
          "durationSec" INTEGER NOT NULL DEFAULT 0,
          "avgPaceSec" INTEGER NOT NULL DEFAULT 0,
          "calories" INTEGER NOT NULL DEFAULT 0,
          "route" JSONB,
          "status" TEXT NOT NULL DEFAULT 'completed',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Run_userId_idx" ON "Run"("userId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Run_userId_startedAt_idx" ON "Run"("userId", "startedAt")`);
      await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "Run" ADD CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "RunStats" (
          "userId" TEXT NOT NULL,
          "totalRuns" INTEGER NOT NULL DEFAULT 0,
          "totalDistanceM" INTEGER NOT NULL DEFAULT 0,
          "totalDurationSec" INTEGER NOT NULL DEFAULT 0,
          "longestRunM" INTEGER NOT NULL DEFAULT 0,
          "bestPaceSec" INTEGER NOT NULL DEFAULT 0,
          "weekDistanceM" INTEGER NOT NULL DEFAULT 0,
          "weekRuns" INTEGER NOT NULL DEFAULT 0,
          "weekStart" TEXT NOT NULL DEFAULT '',
          "streakDays" INTEGER NOT NULL DEFAULT 0,
          "lastRunDay" TEXT,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "RunStats_pkey" PRIMARY KEY ("userId")
        )
      `);
      await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "RunStats" ADD CONSTRAINT "RunStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "RunAchievement" (
          "userId" TEXT NOT NULL,
          "achievementId" TEXT NOT NULL,
          "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "RunAchievement_pkey" PRIMARY KEY ("userId", "achievementId")
        )
      `);
      await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "RunAchievement" ADD CONSTRAINT "RunAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WeeklyChallenge" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "weekStart" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "goalM" INTEGER NOT NULL,
          "currentM" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "WeeklyChallenge_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyChallenge_weekStart_key" ON "WeeklyChallenge"("weekStart")`);

      console.log('[migration] Run Club tables ready.');
    } catch (err) {
      // "already exists" errors are fine
      if (err.message && err.message.includes('already exists')) {
        console.log('[migration] Run Club tables already exist — OK.');
      } else {
        console.error('[migration] Error creating tables:', err.message);
      }
    }
});
