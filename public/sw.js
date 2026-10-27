const CACHE = 'turbo-shell-v1.5.5-daily-brief-3';
const SHELL = ['/', '/styles.css', '/app.js', '/ui.js', '/paper-engine.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('turbo-shell-') && key !== CACHE).map(key => caches.delete(key)))));});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || !SHELL.includes(url.pathname)) return;
    // Network-first shell only. No cached quotes, news, external scripts or account responses.
    event.respondWith(fetch(event.request).then(response => {
        if (response.ok) event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request,response.clone())));
        return response;
    }).catch(() => caches.match(event.request)));
});


