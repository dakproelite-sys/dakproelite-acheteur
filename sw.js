const CACHE_NAME = "dakproelite-v5-20261122";

const APP_FILES = [
  "./",
  "./index.html",
  "./produit.html",
  "./manifest.json"
];

// Chemins / mots-clés sensibles à ne JAMAIS mettre en cache ni bloquer
const PAYMENT_AND_AUTH_PATTERNS = [
  /fedapay/i,
  /payment/i,
  /paiement/i,
  /checkout/i,
  /pay/i,
  /wallet/i,
  /momo/i,
  /moov/i,
  /celtiis/i,
  /webhook/i,
  /callback/i,
  /return/i,
  /cancel/i,
  /token/i,
  /auth/i,
  /session/i,
  /retrait/i,
  /payout/i
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(
          APP_FILES.map(file =>
            cache.add(file).catch(() => null)
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ACTIVATION : NETTOYAGE DES ANCIENS CACHES SANS TOUCHER AUX PAIEMENTS */
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
    fetch(event.request)
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
