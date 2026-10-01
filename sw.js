const CACHE_NAME = "dakproelite-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

/* INSTALLATION */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

/* ACTIVATION */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name =>
              name.startsWith("dakproelite-") &&
              name !== CACHE_NAME
            )
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* FONCTIONNEMENT HORS CONNEXION + CACHE */
self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {

        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, copy);
            });
        }

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );

});