/* Doodle or Not — Service Worker
   Strategy: network-first with FULL cache bypass for app files.
   Bumping VERSION forces a complete cache refresh on next visit. */
const VERSION = 'don-v22-2026-05-03b';

const CORE = [
  './',
  './index.html',
  './tailwind.css',
  './app.js',
  './run-club.js',
  './api.js',
  './doodles-dataset.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      const old = keys.filter((k) => k !== VERSION);
      return Promise.all(old.map((k) => caches.delete(k))).then(() => old.length);
    })
    .then((deletedCount) => self.clients.claim().then(() => deletedCount))
    .then((deletedCount) => {
      if (deletedCount > 0) {
        self.clients.matchAll({ type: 'window' }).then(tabs => {
          tabs.forEach(tab => tab.navigate(tab.url));
        });
      }
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Enable navigation preload if supported
self.addEventListener('activate', (e2) => {
  if (self.registration.navigationPreload) {
    e2.waitUntil(self.registration.navigationPreload.enable());
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API calls: always network, never cache
  if (url.pathname.startsWith('/api/')) return;

  // App shell files (HTML & own JS): network-first with FULL cache bypass.
  // cache: 'no-store' tells the browser to skip its HTTP cache entirely —
  // every request hits the real server. This is the key fix: without it,
  // the browser can return a 304 from its own disk cache even when the
  // server has new content, because ETags/Last-Modified can be stale.
  const isAppShell = url.origin === self.location.origin && (
    url.pathname.endsWith('.html')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.css')
    || url.pathname === '/'
  );

  if (isAppShell) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((resp) => {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Everything else (CDN libs, images, fonts): cache-first
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      });
    })
  );
});
