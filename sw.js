/* Incrementar la versión al modificar el App Shell. */
const CACHE_PREFIX = 'mi-billetera-lite-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = ['./', './index.html', './styles.css', './app.js', './db.js', './finance.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
const BASE_URL = new URL('./', self.location.href);
const SHELL_URLS = new Set(APP_SHELL.map(path => new URL(path, BASE_URL).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== BASE_URL.origin || !url.pathname.startsWith(BASE_URL.pathname)) return;
  const cleanURL = new URL(url);
  cleanURL.search = '';
  cleanURL.hash = '';
  const isNavigation = event.request.mode === 'navigate';
  if (!isNavigation && !SHELL_URLS.has(cleanURL.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache First: documentos equivalentes y recursos del App Shell.
    const cached = await cache.match(isNavigation ? new URL('./index.html', BASE_URL).href : cleanURL.href);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic' && SHELL_URLS.has(cleanURL.href)) {
        await cache.put(cleanURL.href, response.clone());
      }
      return response;
    } catch {
      return new Response('Abre Mi Billetera Lite una vez con conexión para prepararla.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
