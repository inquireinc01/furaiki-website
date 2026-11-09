// Googleアナリティクス(GA4)の初期化。CSPでインラインスクリプトを禁止しているため別ファイルにしている。
// 測定IDは tools/build_common.py の GA4_ID が data-ga4 属性で渡す。
(function () {
  const id = document.currentScript.dataset.ga4;
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", id);
})();
