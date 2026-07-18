// モバイルメニュー
// 開閉そのものはボタンの onclick 属性(HTML側)で行う。
// ここでは補助動作(リンク選択・メニュー外タップで閉じる、ヘッダー影)のみ担当。
document.addEventListener('DOMContentLoaded', function() {
  const menuButton = document.getElementById('menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuButton && mobileMenu) {
    function closeMenu() {
      mobileMenu.classList.add('hidden');
      menuButton.setAttribute('aria-expanded', 'false');
    }

    // メニュー項目をクリックしたらメニューを閉じる
    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', closeMenu);
    });

    // メニューの外側をタップしたら閉じる
    document.addEventListener('click', function(e) {
      if (mobileMenu.classList.contains('hidden')) return;
      if (menuButton.contains(e.target) || mobileMenu.contains(e.target)) return;
      closeMenu();
    });
  }

  // スクロール時にヘッダーに影を追加
  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 0) {
        header.classList.add('shadow-sm');
      } else {
        header.classList.remove('shadow-sm');
      }
    });
  }
});
