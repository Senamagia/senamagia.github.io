// Guarda Susitio en el móvil para que funcione sin internet.
// Cada versión nueva cambia VERSION; la app avisa y se actualiza cuando se pulsa «Actualizar».
const VERSION = 'susitio-v10';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))));
});
// Solo borra versiones antiguas de Susitio: SenaBoard y Espatontos tienen su propia copia.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('susitio-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // La letra (Google Fonts) se guarda la primera vez que se descarga.
  if (u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION + '-letra').then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; } catch (err) { return Response.error(); }
    }));
    return;
  }
  if (u.origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(e.request); }
    catch (err) { return (e.request.mode === 'navigate' && await cache.match('./index.html')) || Response.error(); }
  }));
});

// Avisos: el programa de la hoja de Google manda el mensaje y aquí se enseña
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { data: { title: 'Susitio', body: e.data ? e.data.text() : '' } }; }
  const d = p.data || p.notification || p;
  e.waitUntil(self.registration.showNotification(d.title || 'Susitio', { body: d.body || '', icon: 'icon-180.png', badge: 'icon-180.png', tag: d.tag || 'susitio', renotify: true }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { const c = l.find(x => x.url.includes('/susitio/')); return c ? c.focus() : self.clients.openWindow('./'); }));
});
