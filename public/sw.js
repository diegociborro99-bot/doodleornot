/* Doodle or Not — Service Worker
   Strategy: network-first for HTML/JS (always fresh), cache-first for assets (images/fonts).
   Bumping VERSION forces a full cache refresh on next visit. */
const VERSION = 'don-v16-2026-04-30';

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
      // Only force-reload when UPGRADING from an old SW version.
      // On first install (no old caches), skip — the page already loaded fine.
      if (deletedCount > 0) {
        // Force-reload all open tabs so they pick up fresh index.html + app.js.
        // This is critical: if the old app.js had a syntax error, the page has
        // no controllerchange listener and will stay stuck without this.
        self.clients.matchAll({ type: 'window' }).then(tabs => {
          tabs.forEach(tab => tab.navigate(tab.url));
        });
      }
    })
  );
});

// Allow clients to trigger skipWaiting manually (e.g. from update prompt)
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Enable navigation preload if supported (faster network-first for navigations)
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

  // HTML & own JS: network-first (always get latest), fall back to cache
  const isAppShell = url.pathname.endsWith('.html')
    || url.pathname === '/'
    || url.pathname.endsWith('.js');

  if (isAppShell && url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
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
