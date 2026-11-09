// Compras: abre sem internet e atualiza-se sozinha.
// As listas ficam no Firebase; aqui só se guardam os ficheiros da própria app.
// Ao publicar uma versão nova, mudar VERSION (e o número em index.html, id="app-ver").
const VERSION = 'v12-2026-11-09';
const CACHE = 'compras-' + VERSION;
const CORE = ['./', './index.html', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const sdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!same && !sdk && !font) return; // login e listas vão sempre à rede
  const isPage = req.mode === 'navigate' || (same && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));
  if (isPage) {
    // página: tenta sempre a mais recente; com rede fraca, ao fim de 3 s abre a guardada
    const cached = () => caches.match('./index.html', { ignoreSearch: true }).then(h => h || caches.match('./', { ignoreSearch: true }));
    const net = fetch(req).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } return r; });
    const timeout = new Promise(res => setTimeout(res, 3000)).then(cached);
    e.respondWith(Promise.race([net.catch(cached), timeout.then(h => h || net)]).then(r => r || cached()));
    return;
  }
  // restantes ficheiros: rápido a partir da cache, renovados em segundo plano
  e.respondWith(caches.match(req, { ignoreSearch: same }).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => hit || new Response('', { status: 504 }));
    return hit || net;
  }));
});
