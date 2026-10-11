// 书架 service worker: the app works offline once opened
const V = 'shujia-a37ae069';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
const cacheFirst = async req => { const c = await caches.open(V); const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; };
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (/\/data\/(cedict|words)\.txt$/.test(u.pathname)) return; // the app keeps these in its own database
    if (u.pathname.includes('/data/') || u.pathname.includes('/lib/')) { e.respondWith(cacheFirst(req)); return; }
    // the app page: network first (updates show at once), cache when offline
    e.respondWith(caches.open(V).then(async c => { try { const r = await fetch(req, { cache: 'no-cache' }); if (r.ok) c.put(req, r.clone()); return r; } catch { return (await c.match(req)) || (await c.match('index.html')); } }));
    return;
  }
  if (u.hostname === 'cdnjs.cloudflare.com' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(req));
});
