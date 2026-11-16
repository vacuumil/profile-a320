// Офлайн-кэш: PWA для iPad.
// Используем Network-First для HTML-страниц (чтобы обновления подтягивались мгновенно при наличии сети)
// и Cache-First для офлайна в полете.
const CACHE = "vector-a320-v7";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Для HTML / навигации — сначала сеть (Network-First), если нет сети — кэш
  if (e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return resp;
        })
        .catch(() => {
          return caches.match(e.request).then((cached) => cached || caches.match("./index.html"));
        })
    );
    return;
  }

  // Для остальных ресурсов (иконки, манифест) — кэш с обновлением
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((resp) => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => {});
      return cached || fetchPromise;
    })
  );
});
