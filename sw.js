const CACHE_NAME = "dakproelite-v4";

const APP_FILES = [
  "./",
  "./index.html",
  "./produit.html",
  "./manifest.json"
];

/* MESSAGE POUR FORCER L'ACTIVATION IMMÉDIATE */
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* INSTALLATION : MISE EN CACHE DES NOUVEAUX FICHIERS */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

/* ACTIVATION : SUPPRESSION DE TOUS LES ANCIENS CACHES */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* RÉSEAU D'ABORD + CACHE DE SECOURS */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
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
            })
            .catch(() => {});
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request, { ignoreSearch: true })
          .then(cached => cached || caches.match("./index.html"));
      })
  );
});
