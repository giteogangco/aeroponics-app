// Service worker — PWA install + offline app shell.
// Pages are network-first so an update shows on the first open; the cache is
// only the offline fallback. Static assets (icons, manifest) stay cache-first.
const CACHE = 'aero-v6';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' bypasses the browser HTTP cache so a new version never stores a stale copy
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || req.method !== 'GET') return; // MQTT/CDN go straight to network

  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
