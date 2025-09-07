// Service Worker for PhysX Dashboard PWA
const CACHE_NAME = 'physx-dashboard-v1.0.0';
const RUNTIME = 'runtime';

// Cache strategies
const PRECACHE_MANIFEST = [
  '/',
  '/manifest.json',
  '/offline',
  '/_next/static/css/',
  '/_next/static/js/',
];

// Assets to cache on install
const PRECACHE_URLS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// Network first strategy for API calls
const API_CACHE_STRATEGY = {
  networkFirst: [
    /^.*\/api\/.*$/,
  ],
  cacheFirst: [
    /^.*\/_next\/static\/.*$/,
    /^.*\/icons\/.*$/,
    /^.*\.(?:js|css|png|jpg|jpeg|svg|ico)$/,
  ],
  networkOnly: [
    /^.*\/auth\/.*$/,
    /^.*\/api\/auth\/.*$/,
  ]
};

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell and static assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle different types of requests
  if (request.method !== 'GET') {
    return;
  }
  
  // API requests - Network first with cache fallback
  if (API_CACHE_STRATEGY.networkFirst.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirstStrategy(event));
    return;
  }
  
  // Static assets - Cache first
  if (API_CACHE_STRATEGY.cacheFirst.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(cacheFirstStrategy(event));
    return;
  }
  
  // Auth routes - Network only
  if (API_CACHE_STRATEGY.networkOnly.some(pattern => pattern.test(url.pathname))) {
    return;
  }
  
  // Default strategy for pages - Stale while revalidate
  event.respondWith(staleWhileRevalidateStrategy(event));
});

// Network first strategy
async function networkFirstStrategy(event) {
  const cache = await caches.open(RUNTIME);
  
  try {
    const response = await fetch(event.request);
    
    if (response.status === 200) {
      cache.put(event.request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (event.request.destination === 'document') {
      return cache.match('/offline.html');
    }
    
    throw error;
  }
}

// Cache first strategy
async function cacheFirstStrategy(event) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(event.request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(event.request);
    
    if (response.status === 200) {
      cache.put(event.request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Cache and network failed:', error);
    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidateStrategy(event) {
  const cache = await caches.open(RUNTIME);
  const cachedResponse = await cache.match(event.request);
  
  const fetchPromise = fetch(event.request).then((response) => {
    if (response.status === 200) {
      cache.put(event.request, response.clone());
    }
    return response;
  }).catch((error) => {
    console.log('[SW] Network failed for stale-while-revalidate:', error);
    return null;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  const networkResponse = await fetchPromise;
  
  if (networkResponse) {
    return networkResponse;
  }
  
  // Return offline page for navigation requests
  if (event.request.destination === 'document') {
    return cache.match('/offline.html');
  }
  
  throw new Error('Network unavailable and no cache found');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'test-submission') {
    event.waitUntil(syncTestSubmissions());
  }
  
  if (event.tag === 'user-data') {
    event.waitUntil(syncUserData());
  }
});

// Sync test submissions when back online
async function syncTestSubmissions() {
  try {
    // Get pending submissions from IndexedDB
    const submissions = await getStoredSubmissions();
    
    for (const submission of submissions) {
      try {
        const response = await fetch('/api/tests/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          await removeStoredSubmission(submission.id);
          console.log('[SW] Synced test submission:', submission.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync submission:', submission.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync user data
async function syncUserData() {
  // Implementation for syncing user data changes
  console.log('[SW] Syncing user data...');
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'PhysX дээр шинэ мэдэгдэл ирлээ',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Харах',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Хаах',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PhysX Dashboard', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Notification closed
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for IndexedDB operations
async function getStoredSubmissions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('physx-offline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readonly');
      const store = transaction.objectStore('submissions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function removeStoredSubmission(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('physx-offline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readwrite');
      const store = transaction.objectStore('submissions');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME)
        .then(cache => cache.addAll(event.data.payload))
    );
  }
});