// Tiny static server for Doodle or Not — Railway-ready.
// Serves /public with gzip + brotli compression and aggressive caching for assets.
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.use(compression({ level: 6 }));

// Long cache for the dataset (rev it via filename if it ever changes).
app.use(
  '/doodles-dataset.js',
  express.static(path.join(PUBLIC_DIR, 'doodles-dataset.js'), {
    maxAge: '30d',
    immutable: true,
    setHeaders(res) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    },
  })
);

// Serve the rest of /public, but never cache index.html so updates ship instantly.
app.use(
  express.static(PUBLIC_DIR, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  })
);

// SPA fallback (single-page app — every unknown route returns index.html).
app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Health check (Railway will hit / by default but this is handy for monitors).
app.get('/healthz', (_req, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`Doodle or Not listening on :${PORT}`);
});
