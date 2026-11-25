const CACHE_VERSION = "2026.11.25.1";
const CACHE_NAME = `dakproelite-cache-v${CACHE_VERSION}`;

const APP_FILES = [
  "./",
  "./index.html",
  "./produit.html",
  "./metiers.html",
  "./profil-acheteur.html",
  "./support-rapide.html",
  "./support-rapide.js",
  "./aide.html",
  "./reglement-interieur.html",
  "./politique-confidentialite.html",
  "./programme-ambassadeur.html",
  "./manifest.json"
];

const PAYMENT_AND_AUTH_PATTERNS = [
  /\/pay\//i,
  /\/wallet\//i,
  /\/momo\//i,
  /\/moov\//i,
  /\/celtiis\//i,
  /\/webhook\//i,
  /\/callback\//i,
  /\/return\//i,
  /\/cancel\//i,
  /\/token\//i,
  /\/auth\//i,
  /\/session\//i,
  /\/retrait\//i,
  /\/payout\//i
];

function isBypassRequest(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;
  const fullPath = `${url.pathname}${url.search}`.toLowerCase();
  return PAYMENT_AND_AUTH_PATTERNS.some(pattern => pattern.test(fullPath));
}

/* MESSAGE POUR FORCER L'ACTIVATION IMMÉDIATE */
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* INSTALLATION : MISE EN CACHE SÉCURISÉE DES FICHIERS DE BASE */
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(
          APP_FILES.map(file =>
            cache.add(new Request(`${file}?v=${encodeURIComponent(CACHE_VERSION)}`, { cache: "reload" })).catch(() => null)
          )
        );
      })
  );
});

/* ACTIVATION : NETTOYAGE COMPLET DES ANCIENS CACHES & NOTIFICATION DES CLIENTS PWA */
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
      .then(() => {
        return self.clients.matchAll({ type: "window", includeUncontrolled: true });
      })
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: "CACHE_UPDATED",
            cacheName: CACHE_NAME,
            version: CACHE_VERSION,
            preservePaymentData: true
          });
        });
      })
  );
});

/* RÉSEAU D'ABORD + CACHE DE SECOURS (PASSERAIES DE PAIEMENT TOUJOURS EN DIRECT) */
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (isBypassRequest(event.request, url)) {
    return;
  }

  event.respondWith(
    fetch(new Request(event.request, { cache: "no-store" }))
      .then(response => {
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy))
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
