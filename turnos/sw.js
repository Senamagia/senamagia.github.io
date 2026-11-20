// Guarda Turnos en el móvil para que funcione sin internet.
const VERSION = 'turnos-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))));
});
// Solo borra versiones antiguas de Turnos: las otras apps tienen su propia copia.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('turnos-') && k !== VERSION && k !== 'turnos-letra').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com' || (u.host === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'))) {
    e.respondWith(caches.open('turnos-letra').then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; } catch (err) { return Response.error(); }
    }));
    return;
  }
  if (u.origin !== self.location.origin) return;
  // Primero la red (para tener siempre la última versión); sin internet, la copia guardada.
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const r = await fetch(e.request);
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    } catch (err) {
      return (await cache.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' && await cache.match('./index.html')) || Response.error();
    }
  })());
});

// Aviso de la noche: la hoja de Google manda el mensaje y aquí se enseña.
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { data: { title: 'Turnos', body: e.data ? e.data.text() : '' } }; }
  const d = p.data || p.notification || p;
  e.waitUntil(self.registration.showNotification(d.title || 'Turnos', { body: d.body || '', icon: 'icon-180.png', badge: 'icon-180.png', tag: d.tag || 'turnos', renotify: true, data: { abrir: d.abrir || '' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const abrir = (e.notification.data && e.notification.data.abrir) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const c = l.find(x => x.url.includes('/turnos/'));
    if (c) { if (abrir) c.postMessage({ abrir }); return c.focus(); }
    return self.clients.openWindow('./' + (abrir ? '#' + abrir : ''));
  }));
});
