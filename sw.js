// 书架 service worker: the app works offline once opened
const V = 'shujia-1d301741';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
// libraries and data never change under the same address: they live in a cache kept across updates, filled at install so the app opens books offline
const STATIC = 'shujia-static-1';
const LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'lib/pdf.worker.min.js', 'lib/mobi.js', 'lib/fb2.js', 'lib/fflate.js', 'data/cmaps.json'];
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([caches.open(V).then(c => c.addAll(CORE)),
    caches.open(STATIC).then(c => Promise.all(LIBS.map(u => c.match(u).then(hit => hit || c.add(u)).catch(() => {}))))]));
  self.skipWaiting();
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== STATIC).map(k => caches.delete(k))))); self.clients.claim(); });
const cacheFirst = async req => { const c = await caches.open(STATIC); const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; };
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
