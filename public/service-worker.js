// service-worker.js
const CACHE_NAME = 'blog-cache-v1';
const urlsToCache = [
  '/',
  '/css/stylesheet.css',
  '/js/main.js',
  '/images/*'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});