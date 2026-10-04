// 오프라인에서도 열리게 하고, 온라인이면 항상 새 버전을 먼저 받아옴
const CACHE = "chromatic-v5";
const CORE = ["./", "./index.html", "./manifest.json", "./icon-d-180.png", "./icon-d-192.png", "./icon-d-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 앱 화면: 네트워크 먼저(새 버전), 안 되면 저장해 둔 화면
  if (req.mode === "navigate" || (url.origin === location.origin && url.pathname.endsWith("/index.html"))) {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // 아이콘·글꼴 등: 저장해 둔 것을 바로 쓰고 뒤에서 새로 받아 둠
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
