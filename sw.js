/* ウェブアプリ共通：自動更新つき Service Worker（ひな形）
 * もとは 学習音声プレーヤー v1.4.2〜 の sw.js。
 * ・画面の部品を端末にしまって、圏外でも開けるようにする
 * ・版を上げたら CACHE の名前を変える → 開いたときに新しい部品が入り、自動で入れかわる
 *
 * 使い方：アプリのフォルダ（index.html と同じ所）にコピーして、CACHE と FILES を直す
 */
var CACHE = 'mask-study-v45';   // publish.ps1 が公開のたびに上げる
var FILES = [
  './',
  'index.html',
  'auto-update.js'
];

self.addEventListener('install', function (e) {
  // cache: 'reload' … ブラウザの一時保存（古い版のこともある）を使わず、公開先から取り直す
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));   // 待たずにすぐ新しい版にする
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      // 古い版のしまい場所を消す
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })  // 開いている画面もすぐ新しい版の管理下に
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // GAS への送信などはそのまま通す
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // ほかのサイト（GAS・CDN）は触らない
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).catch(function () {
        if (req.mode === 'navigate') return caches.match('index.html');
        return new Response('', { status: 504 });
      });
    })
  );
});
