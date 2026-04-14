# Doodle or Not — Railway deploy

Static deploy of the Doodle or Not single-page app. A tiny Node/Express server
wraps the `public/` folder with gzip + brotli compression and a SPA fallback so
the game runs as a single URL.

## Folder layout

```
deploy/
├─ public/
│  ├─ index.html            ← Doodle or Not (built from doodle-or-not.jsx)
│  └─ doodles-dataset.js    ← 9998 Doodles + 2.8k sales (~2 MB)
├─ server.js                ← Express static server
├─ package.json
├─ railway.json             ← Railway build/deploy config
├─ .nvmrc                   ← Pin Node 20
└─ .gitignore
```

## Deploy on Railway (one-time setup)

1. Create a new GitHub repo (e.g. `doodle-or-not`) and push everything inside
   this `deploy/` folder to its root:

   ```bash
   cd deploy
   git init
   git add .
   git commit -m "Initial deploy"
   git branch -M main
   git remote add origin git@github.com:<your-user>/doodle-or-not.git
   git push -u origin main
   ```

2. Go to <https://railway.app/new> → **Deploy from GitHub repo** → pick the
   repo. Railway auto-detects Nixpacks + Node 20 from `.nvmrc` and the
   `engines` field in `package.json`.

3. After the first build, in the Railway service:
   - **Settings → Networking → Generate Domain** to get the free
     `*.up.railway.app` URL.
   - **Settings → Deploy → Healthcheck Path** is already `/healthz` (set
     via `railway.json`).

4. Done. Push to `main` triggers a redeploy.

## Local sanity check

```bash
cd deploy
npm install
npm start
# open http://localhost:3000
```

## Updating the app later

The HTML is generated from `doodle-or-not.jsx` outside this repo. To ship
updates:

1. Rebuild `doodle-or-not.html` from the JSX source.
2. Copy it over `deploy/public/index.html`.
3. If the dataset changed, copy the new `doodles-dataset.js` too.
4. `git commit && git push` — Railway redeploys automatically.

## Notes

- The HTML loads React, Tailwind and Babel-standalone from CDNs, so the
  Railway service itself only ships static assets — no build step beyond
  `npm install`. This keeps the container small (~30 MB).
- `cdn.tailwindcss.com` will print a console warning recommending the CLI in
  production. It's safe; if you want to silence it later, swap to a prebuilt
  Tailwind CSS file or migrate to a Vite build.
- The dataset (`doodles-dataset.js`) is served with a 30-day immutable cache.
  If you ever change its contents, rename the file (e.g. `doodles-dataset.v2.js`)
  and update the `<script src>` in `index.html` to bust caches.
