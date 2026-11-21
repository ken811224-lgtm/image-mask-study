/* ウェブアプリ共通：開いたとき・画面に戻ったときに新しい版を取りに行き、届いたら自動で開き直す
 * もとは 学習音声プレーヤー v1.4.2〜 の「新しい版への入れかえ」。
 *
 * 使い方：
 *   1. index.html で app.js より前に <script src="auto-update.js"></script>（または中身を app.js に貼る）
 *   2. app.js の起動のところで
 *        AutoUpdate.start({
 *          isBusy:       function () { return 再生中や入力中なら true; },   // 省略可
 *          beforeReload: function () { 保存しておくものを保存; },          // 省略可（Promise を返してもよい）
 *          onWaiting:    function () { toast('新しい版が届きました。終わったら入れかわります'); }  // 省略可
 *        });
 *   3. 忙しいのが終わったところ（一時停止・保存のあと など）で AutoUpdate.idle() を呼ぶ
 *      → 待っていた入れかえをそこで行う
 *   4. FILES に auto-update.js を足すのを忘れない（sw.js）
 */
(function () {
  var reg = null, hadCtrl = false, want = false, reloading = false, lastCheck = 0, opt = {};

  function check() {
    // iPhone のホーム画面のアプリは、閉じても裏で生きていて開き直さないことが多い。
    // そこで、開いたとき・画面に戻ったときに公開先へ新しい版を聞きに行く（30 秒に 1 回まで）
    if (!reg || navigator.onLine === false) return;
    if (Date.now() - lastCheck < 30000) return;
    lastCheck = Date.now();
    try { reg.update().catch(function () { /* 圏外など */ }); } catch (e) { /* 無視 */ }
  }
  function reload() {
    if (reloading) return;
    reloading = true;
    var p;
    try { p = opt.beforeReload && opt.beforeReload(); } catch (e) { /* 無視 */ }
    Promise.resolve(p).then(function () { location.reload(); }, function () { location.reload(); });
  }

  window.AutoUpdate = {
    start: function (o) {
      opt = o || {};
      if (!('serviceWorker' in navigator)) return;
      hadCtrl = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadCtrl) { hadCtrl = true; return; }   // はじめて開いたとき（入れかえではない）は開き直さない
        if (opt.isBusy && opt.isBusy()) {
          want = true;
          if (opt.onWaiting) opt.onWaiting();
          return;
        }
        reload();
      });
      navigator.serviceWorker.register('sw.js').then(function (r) { reg = r; check(); })
        .catch(function (e) { console.warn('SW', e); });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') check();
      });
    },
    idle: function () { if (want) setTimeout(reload, 300); },
    check: check
  };
})();
