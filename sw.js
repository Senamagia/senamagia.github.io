// Guarda la app en el iPad para que funcione sin internet.
// Cada versión nueva cambia VERSION; la app avisa y se actualiza solo cuando el usuario lo pide.
const VERSION = 'sb-v9';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' = descargar de GitHub, no de la copia del navegador
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// La app pide aplicar la versión nueva (al pulsar «Actualizar»)
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
// Siempre se sirve la copia guardada de esta versión: rápido y sin internet.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(e.request); }
    catch (err) { return (e.request.mode === 'navigate' && await cache.match('./index.html')) || Response.error(); }
  }));
});
