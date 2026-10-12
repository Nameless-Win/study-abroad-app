// Offline support: keeps a copy of the app on the phone so it opens with no internet.
// Pages are served from that copy straight away, and a fresh copy is fetched in the background,
// so an update shows the next time the app is opened. Bump VERSION when files are added or removed.
const VERSION = "v1";
const CACHE = "study-abroad-" + VERSION;
const FILES = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith("study-abroad-") && k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if (req.method!=="GET" || new URL(req.url).origin!==location.origin) return;   // only the app's own files
  e.respondWith(caches.open(CACHE).then(async cache=>{
    const cached = await cache.match(req, {ignoreSearch:true}) || (req.mode==="navigate" ? await cache.match("./index.html") : null);
    const fresh = fetch(req).then(res=>{ if (res.ok) cache.put(req, res.clone()); return res; }).catch(()=>null);
    if (cached){ e.waitUntil(fresh); return cached; }
    return (await fresh) || new Response("Offline", {status:503, statusText:"Offline"});
  }));
});
