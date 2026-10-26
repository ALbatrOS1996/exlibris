/* Service worker: praca offline (aplikacja, czcionki, obejrzane okładki) */
var VERSION = '__VERSION__';
var CORE = 'exlibris-core-' + VERSION;
var FONTS = 'exlibris-fonts-v1';
var COVERS = 'exlibris-covers-v1';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('exlibris-core-') === 0 && k !== CORE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function cacheFirst(name, req) {
  return caches.open(name).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;
    });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return e.respondWith(cacheFirst(FONTS, req));
  if (req.destination === 'image' && (url.hostname === 'covers.openlibrary.org' || url.hostname.indexOf('books.google') >= 0 || url.hostname.indexOf('googleusercontent') >= 0))
    return e.respondWith(cacheFirst(COVERS, req));
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); return r;
    }).catch(function () { return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); }); }));
  }
});
