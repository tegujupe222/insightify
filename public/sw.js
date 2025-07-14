// Service Worker for Insightify PWA
const CACHE_VERSION = 'v1.0.5'; // デプロイごとに上げる
const CACHE_NAME = `insightify-cache-${CACHE_VERSION}`;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon.svg',
        // 必要な静的ファイルを追加
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // APIリクエストはキャッシュしない
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(error => {
        console.error('API fetch failed:', error);
        // APIリクエストが失敗した場合は、ネットワークエラーを返す
        return new Response('Network error', { status: 503 });
      })
    );
    return;
  }

  // 静的ファイルのみキャッシュ
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(error => {
        console.error('Fetch failed:', error);
        // オフライン時のフォールバック
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
}); 