// Guarda SenaBoard en el dispositivo para que funcione sin internet.
// Cada versión nueva cambia VERSION; la app avisa y se actualiza solo cuando el usuario lo pide.
const VERSION = 'sb-v14';
const SHARE = 'senaboard-share'; // canciones recibidas desde «Compartir» (Android)
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' = descargar de GitHub, no de la copia del navegador
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))));
});
// Solo borra versiones antiguas de SenaBoard: las otras apps de la web tienen su propia copia.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sb-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// La app pide aplicar la versión nueva (al pulsar «Actualizar»)
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  const url = new URL(e.request.url);
  const rel = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  // Android: canciones compartidas con SenaBoard desde WhatsApp, Archivos…
  if (e.request.method === 'POST' && rel === 'share-target'){
    e.respondWith((async () => {
      let n = 0;
      try {
        const fd = await e.request.formData();
        const cache = await caches.open(SHARE);
        for (const f of fd.getAll('audio')){
          if (!f || typeof f === 'string' || !f.size) continue;
          await cache.put(new Request('./__share/' + Date.now() + '-' + (n++)),
            new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'Pista') } }));
        }
      } catch (err) {}
      return Response.redirect('./?shared=' + n, 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  // Las apps que viven en subcarpetas (espatontos/, laura/…) se gestionan solas: SenaBoard no las toca.
  if (rel.includes('/')) return;
  // Siempre se sirve la copia guardada de esta versión: rápido y sin internet.
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(e.request); }
    catch (err) { return (e.request.mode === 'navigate' && await cache.match('./index.html')) || Response.error(); }
  }));
});
