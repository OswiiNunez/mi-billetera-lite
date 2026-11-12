import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function workerHarness() {
  const root = new URL('../', import.meta.url);
  const base = 'https://example.com/PWA_U2/';
  const listeners = new Map();
  const stores = new Map();
  let online = true;
  let fetchCount = 0;
  let claimed = false;
  const normalize = input => new URL(typeof input === 'string' ? input : input.url, base).href;
  async function network(request) {
    fetchCount++;
    if (!online) throw new Error('Offline');
    const url = new URL(normalize(request));
    const name = url.pathname.replace('/PWA_U2/', '') || 'index.html';
    try {
      const body = await readFile(new URL(name, root));
      const response = new Response(body, { status: 200 });
      Object.defineProperty(response, 'type', { value: 'basic' });
      return response;
    } catch { return new Response('404', { status: 404 }); }
  }
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); },
    async open(key) {
      if (!stores.has(key)) stores.set(key, new Map());
      const entries = stores.get(key);
      return {
        async addAll(paths) {
          const responses = await Promise.all(paths.map(network));
          if (responses.some(response => !response.ok)) throw new Error('App Shell incompleto');
          paths.forEach((path, index) => entries.set(normalize(path), responses[index]));
        },
        async match(request) { return entries.get(normalize(request))?.clone(); },
        async put(request, response) { entries.set(normalize(request), response.clone()); }
      };
    }
  };
  vm.runInNewContext(await readFile(new URL('sw.js', root), 'utf8'), {
    self: { location: { href: `${base}sw.js` }, addEventListener: (type, handler) => listeners.set(type, handler), clients: { async claim() { claimed = true; } } },
    caches, fetch: network, URL, Response, Set, Promise
  });
  return {
    stores, caches,
    setOnline(value) { online = value; },
    get fetchCount() { return fetchCount; },
    get claimed() { return claimed; },
    async lifecycle(type) { let pending; listeners.get(type)({ waitUntil(promise) { pending = promise; } }); await pending; },
    async request(path, mode = 'cors', method = 'GET') {
      let pending;
      listeners.get('fetch')({ request: { url: new URL(path, base).href, method, mode }, respondWith(promise) { pending = promise; } });
      return pending ? await pending : null;
    }
  };
}

test('el formulario ofrece las cinco categorias como opciones validas', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const select = html.match(/<select id="category"[^>]*>(.*?)<\/select>/s)?.[1];
  assert.ok(select);
  const categories = [...select.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(match => match[1]);
  assert.deepEqual(categories, ['Comida', 'Transporte', 'Servicios', 'Ocio', 'Otros']);
});

test('App Shell completo carga sin red, también bajo subdirectorio y con query', async () => {
  const harness = await workerHarness();
  await harness.lifecycle('install');
  harness.setOnline(false);
  const before = harness.fetchCount;
  const page = await harness.request('./?source=installed', 'navigate');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Mi Billetera Lite/);
  for (const resource of ['styles.css', 'app.js', 'db.js', 'finance.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png']) {
    assert.equal((await harness.request(resource)).status, 200, resource);
  }
  assert.equal(harness.fetchCount, before, 'offline usa caché sin intentar la red');
});
test('activate elimina solo cachés antiguas de esta app', async () => {
  const harness = await workerHarness();
  await harness.caches.open('otra-app-v1');
  await harness.caches.open('mi-billetera-lite-shell-antigua');
  await harness.lifecycle('install');
  await harness.lifecycle('activate');
  assert.ok(harness.stores.has('otra-app-v1'));
  assert.ok(!harness.stores.has('mi-billetera-lite-shell-antigua'));
  assert.ok(harness.stores.has('mi-billetera-lite-shell-v2'));
  assert.ok(harness.claimed);
});
test('Cache First usa red al faltar recurso y no intercepta solicitudes ajenas', async () => {
  const harness = await workerHarness();
  const first = await harness.request('styles.css');
  assert.equal(first.status, 200);
  harness.setOnline(false);
  assert.equal((await harness.request('styles.css')).status, 200);
  assert.equal(await harness.request('https://externo.example/image.png'), null);
  assert.equal(await harness.request('https://example.com/otra-app/'), null);
  assert.equal(await harness.request('./', 'cors', 'POST'), null);
  assert.equal(await harness.request('archivo-no-shell.txt'), null);
});
