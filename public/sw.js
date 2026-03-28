const CACHE_NAME = 'abyssal-v1';

function isLocalDev(url) {
  const h = url.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  // Vite dev server + HMR: never intercept (avoids broken cache + rejected respondWith).
  if (isLocalDev(url)) return;
  // Vite transformed modules if ever same-origin without localhost
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@')) return;

  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);
      try {
        const res = await fetch(e.request);
        if (res && res.status === 200) {
          const clone = res.clone();
          const c = await caches.open(CACHE_NAME);
          await c.put(e.request, clone);
        }
        return res;
      } catch {
        if (cached) return cached;
        return new Response('Network error', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })(),
  );
});
