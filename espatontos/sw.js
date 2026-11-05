const C='espatontos-v14';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-512.png','./icon-192.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.indexOf('espatontos-')===0&&n!==C).map(n=>caches.delete(n)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  // Solo se guardan los archivos de la app y la librería de Firebase; la nube nunca se cachea.
  if(u.origin!==self.location.origin&&u.host!=='www.gstatic.com')return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
