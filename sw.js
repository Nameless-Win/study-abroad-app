// Offline support: keeps a copy of the app on the phone so it opens with no internet.
// Pages are served from that copy straight away, and a fresh copy is fetched in the background,
// so an update shows the next time the app is opened. Bump VERSION when files are added or removed
// or when this file's logic changes.
const VERSION = "v4";   // v4: app icon with darker edges
const CACHE = "study-abroad-" + VERSION;
const FILES = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"];
const APP_PAGES = ["./", "./index.html"].map(p=>new URL(p, self.registration.scope).pathname);

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith("study-abroad-") && k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

self.addEventListener("fetch", e=>{
  const req = e.request, url = new URL(req.url);
  if (req.method!=="GET" || url.origin!==location.origin) return;   // only the site's own files
  e.respondWith(caches.open(CACHE).then(async cache=>{
    const fresh = fetch(req).then(res=>{ if (res.ok) cache.put(req, res.clone()); return res; }).catch(()=>null);
    const cached = await cache.match(req, {ignoreSearch:true});
    if (cached){ e.waitUntil(fresh); return cached; }
    const res = await fresh;
    if (res) return res;
    // offline: the app itself still opens; other pages (like word-lists/) need the internet
    if (req.mode==="navigate" && APP_PAGES.includes(url.pathname)) return cache.match("./index.html");
    return new Response("You're offline. This page needs the internet.", {status:503, headers:{"Content-Type":"text/plain; charset=utf-8"}});
  }));
});
