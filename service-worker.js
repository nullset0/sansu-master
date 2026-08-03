// 算数マスター Service Worker
const CACHE_NAME = 'sansu-master-v60';
const ASSETS = [
  './', './index.html', './train.html', './learn.html', './zukan.html', './parent.html', './print.html',
  './manifest.json', './icon.svg',
  './app/style.css', './app/fig.js', './app/chara.js', './app/store.js', './app/quiz.js', './app/home.js',
  './data/core.js', './data/elem.js',
  './data/jk-num.js', './data/jk-ratio.js', './data/jk-toku.js', './data/jk-speed.js', './data/jk-geo.js', './data/jk-calc.js', './data/jk-speed2.js', './data/jk-geo2.js', './data/jk-num2.js', './data/jk-drill.js', './data/hard.js', './data/graph.js', './app/mastery.js', './app/modes.js',
  './questions/g1.js', './questions/g2.js', './questions/g3.js',
  './questions/g4.js', './questions/g5.js', './questions/g6.js',
  // 旧バージョン（残してある）
  './shared.css', './shared.js',
  './1年.html', './2年.html', './3年.html', './4年.html', './5年.html', './6年.html',
  './全学年.html', './お話.html', './ひらめき.html', './バッジ.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // 1つでも失敗したら全部落ちるのを防ぐ
      Promise.all(ASSETS.map((a) => cache.add(a).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// stale-while-revalidate：すぐ表示しつつ、裏で最新に入れ替える
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached || cache.match('./index.html'));
      return cached || network;
    })
  );
});
