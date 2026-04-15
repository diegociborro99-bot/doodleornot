# Doodle or Not — Backend (Postgres + Prisma + JWT)

The app now has a real server: users, progress, streaks, achievements, dex, leaderboards, leagues, preferences and powerups are all stored in Postgres. The client still works offline (localStorage cache), but authoritative data lives on the server.

## Architecture

```
public/           → static SPA (index.html, api.js, doodles-dataset.js, sw.js, icons)
server.js         → Express app: serves /public + mounts /api/*
src/
  db.js           → Prisma singleton
  auth.js         → bcrypt + JWT + httpOnly cookies
  util.js         → ISO-day / week-start helpers, validators
  routes/
    auth.js           POST /api/auth/signup | /login | /logout, GET|PATCH /me
    progress.js       POST /api/progress  (idempotent per day/mode)
    leaderboard.js    GET  /api/leaderboard?scope=weekly|alltime
    dex.js            POST|GET /api/dex
    achievements.js   POST /api/achievements
    leagues.js        POST /api/leagues · /:code/join · GET /:code · GET /api/leagues
    preferences.js    PATCH /api/preferences
    powerups.js       POST /api/powerups/use · GET /api/powerups/today
prisma/schema.prisma  → 11 models
```

Auth is cookie-based (httpOnly, SameSite=Lax, Secure in prod). No tokens touch JS. A 30-day JWT is issued at signup/login.

## Railway setup (one-time)

1. In your Railway project, click **+ New → Database → Add PostgreSQL**. Railway creates a managed Postgres and exposes `DATABASE_URL` as a shared variable.
2. Open your web service → **Variables**. Make sure these are set:
   - `DATABASE_URL` — reference the Postgres plugin's variable (Railway can auto-link it)
   - `JWT_SECRET` — paste a long random string (≥32 chars). Generate one with: `openssl rand -hex 48`
   - `NODE_ENV=production`
3. Push. The build command (`npm ci && npx prisma generate && npx prisma migrate deploy`) will apply migrations on every deploy.

### First deploy

The first deploy has no migrations yet. Generate one locally against any Postgres (or just run `db:dev` against Railway's DB by copying DATABASE_URL into a local `.env`):

```bash
cd deploy
cp .env.example .env     # fill in DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate dev --name init
git add prisma/migrations && git commit -m "init migration"
git push
```

Railway's build step will see `prisma/migrations/` and run `migrate deploy` to apply them to production.

## Health check

`GET /healthz` runs a `SELECT 1` against the database. Railway's health check is wired to this.

## Local dev

```bash
cd deploy
cp .env.example .env
npm install
npx prisma migrate dev
node server.js
```

Then open http://localhost:3000.

## Client fallback

If `/api/auth/me` returns 401 or the network is down, the client transparently falls back to local SHA-256 + localStorage. This keeps the PWA working offline and during cold starts. Once connectivity returns, signup/login calls hit the server and hydrate state.
