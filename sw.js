/* Hors ligne : l'outil est gardé sur l'iPad après la 1re ouverture avec internet.
   Après une modification, augmenter VERSION (ex. ttp-v3 → ttp-v3). */
const VERSION='ttp-v9';
const FICHIERS=['./','index.html','prof.js','prof-plus.js','prof-demo.js','prof-poules.js','prof-cycle.js','donnees.js','logique.js','scan.js','jsqr.js','jszip.js','xlsx.js','qrcode.js','manifest.webmanifest',
  'icon-32.png','icon-180.png','icon-192.png','icon-512.png','polices/archivo.woff2','polices/atkinson-400.woff2','polices/atkinson-700.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FICHIERS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
