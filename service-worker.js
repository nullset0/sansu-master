// 算数マスター Service Worker
const CACHE_NAME = 'sansu-master-v82';
const ASSETS = [
  './', './index.html', './train.html', './sokutei.html', './learn.html', './zukan.html', './parent.html', './print.html',
  './manifest.json', './icon.svg',
  './app/style.css?v=82', './app/fig.js?v=82', './app/chara.js?v=82', './app/store.js?v=82', './app/quiz.js?v=82', './app/notice.js?v=82', './app/home.js?v=82',
  './data/core.js?v=82', './data/elem.js?v=82',
  './data/jk-num.js?v=82', './data/jk-ratio.js?v=82', './data/jk-toku.js?v=82', './data/jk-speed.js?v=82', './data/jk-geo.js?v=82', './data/jk-calc.js?v=82', './data/jk-speed2.js?v=82', './data/jk-geo2.js?v=82', './data/jk-num2.js?v=82', './data/jk-drill.js?v=82', './data/hard.js?v=82', './data/graph.js?v=82', './app/mastery.js?v=82', './app/goal.js?v=82', './app/modes.js?v=82',
  './questions/g1.js?v=82', './questions/g2.js?v=82', './questions/g3.js?v=82',
  './questions/g4.js?v=82', './questions/g5.js?v=82', './questions/g6.js?v=82',
  // 旧バージョン（残してある）
  './shared.css', './shared.js',
  './1年.html', './2年.html', './3年.html', './4年.html', './5年.html', './6年.html',
  './全学年.html', './お話.html', './ひらめき.html', './バッジ.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // 1つでも失敗したら全部落ちるのを防ぐ
      // {cache:'reload'} でブラウザのHTTPキャッシュを迂回する。
      // 付けないと、install したのに古いJSを取りこんでしまう。
      Promise.all(ASSETS.map((a) =>
        cache.add(new Request(a, { cache: 'reload' })).catch(() => cache.add(a).catch(() => null))))
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
  // おうちの人からのひとことは、必ずネットワークから取る
  if (req.url.indexOf('/notice.json') >= 0) return;
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
