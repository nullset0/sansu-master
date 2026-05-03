// 算数マスター Service Worker
const CACHE_NAME = 'sansu-master-v17';
const ASSETS = [
  './',
  './index.html',
  './1年.html',
  './2年.html',
  './3年.html',
  './4年.html',
  './5年.html',
  './6年.html',
  './全学年.html',
  './shared.css',
  './shared.js',
  './qrcode.min.js',
  './manifest.json',
  './icon.svg',
  './questions/g1.js',
  './questions/g2.js',
  './questions/g3.js',
  './questions/g4.js',
  './questions/g5.js',
  './questions/g6.js',
];

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// キャッシュ優先（オフラインでも動く）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // 同じオリジンならキャッシュに追加
        if (response.ok && new URL(event.request.url).origin === location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
