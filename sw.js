// ================================
// SEOLLERHAUS KASSA - SERVICE WORKER
// ================================

const CACHE_NAME = 'seollerhaus-kassa-v1';
const urlsToCache = [
    '/kassa/',
    '/kassa/index.html',
    '/kassa/styles.css',
    '/kassa/app.js',
    '/kassa/manifest.json',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
    'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;700&family=Crimson+Pro:wght@400;600;700&display=swap'
];

// Install Event - Cache Resources
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Serve from Cache, Fallback to Network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Cache the new resource
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            }).catch(() => {
                // If both cache and network fail, show offline page
                return caches.match('/kassa/index.html');
            })
    );
});

// Background Sync (future enhancement)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-buchungen') {
        console.log('Service Worker: Syncing buchungen...');
        // Implement sync logic here when server is available
    }
});

// Push Notifications (future enhancement)
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const options = {
        body: data.body || 'Neue Benachrichtigung',
        icon: '/kassa/assets/icon-192.png',
        badge: '/kassa/assets/icon-72.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Seollerhaus Kassa', options)
    );
});
