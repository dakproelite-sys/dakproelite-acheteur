const CACHE_VERSION = "2026.11.25.5";
const CACHE_NAME = `dakproelite-cache-v${CACHE_VERSION}`;
const CACHE_PREFIX = "dakproelite-cache-v";

const CORE_FILES = [
  "./",
  "./index.html",
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

  const path = url.pathname.toLowerCase();
  return PAYMENT_AND_AUTH_PATTERNS.some(pattern => pattern.test(path));
}

/* INSTALLATION */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(
        CORE_FILES.map(async file => {
          try {
            const response = await fetch(new Request(file, { cache: "reload" }));
            if (response.ok) {
              await cache.put(file, response);
            }
          } catch (error) {
            console.warn("Cache initial indisponible :", file);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

/* ACTIVATION */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({
          type: "window",
          includeUncontrolled: true
        })
      )
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: "CACHE_UPDATED",
            cacheName: CACHE_NAME,
            version: CACHE_VERSION
          });
        });
      })
  );
});

/* ACTIVATION FORCÉE */
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* GESTION DU RÉSEAU ET DU CACHE */
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (isBypassRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copyForPage = response.clone();
            const copyForIndex = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copyForPage);
              if (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
                cache.put("./index.html", copyForIndex);
              }
            });
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(request, { ignoreSearch: true })) ||
            (await caches.match("./index.html")) ||
            new Response(
              "DAKPROÉLITE : connexion indisponible. Veuillez réessayer.",
              {
                status: 503,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8"
                }
              }
            )
          );
        })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, {
          ignoreSearch: true
        });
        return cached || Response.error();
      })
  );
});
