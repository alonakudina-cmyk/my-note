// Ім'я кешу — змінюй, коли оновлюєш файли
const CACHE_NAME = 'my-notes-pwa-v1';

// Перелік файлів, які ми хочемо закешувати під час встановлення SW.
// Це мінімальний набір, щоб додаток працював офлайн.
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Слухаємо подію "install" — коли service worker встановлюється.
self.addEventListener('install', (evt) => {
  // Під час встановлення відкриваємо кеш і додаємо туди файли.
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
  // force activate — після встановлення активуємо новий SW негайно
  self.skipWaiting();
});

// Слухаємо подію "activate" — тут можна видаляти старі кеші.
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Слухаємо запроси (fetch) — відповідаємо з кешу, якщо є, інакше робимо мережевий запит.
// Це простий "cache-first" підхід.
self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then(cachedResp => {
      if (cachedResp) {
        // якщо файл є в кеші — віддаємо його
        return cachedResp;
      }
      // інакше йдемо в мережу
      return fetch(evt.request);
    })
  );
});