// モバイルメニュー
document.addEventListener('DOMContentLoaded', function() {
  const menuButton = document.getElementById('menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuButton && mobileMenu) {
    // iOSでヘッダー(fixed + pointer-events:none)内の要素の描画が
    // 更新されない問題を避けるため、パネルをbody直下へ移す
    document.body.appendChild(mobileMenu);

    function openState() {
      return !mobileMenu.classList.contains('hidden');
    }

    function setMenu(open) {
      mobileMenu.classList.toggle('hidden', !open);
      menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    // タップで開閉+スライム風プルプル
    menuButton.addEventListener('click', function() {
      setMenu(!openState());
      menuButton.classList.remove('jiggling');
      void menuButton.offsetWidth; // アニメーションを最初から再生し直すためのリフロー
      menuButton.classList.add('jiggling');
    });
    menuButton.addEventListener('animationend', function() {
      menuButton.classList.remove('jiggling');
    });

    // メニュー項目をクリックしたらメニューを閉じる
    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() { setMenu(false); });
    });

    // メニューの外側をタップしたら閉じる
    document.addEventListener('click', function(e) {
      if (!openState()) return;
      if (menuButton.contains(e.target) || mobileMenu.contains(e.target)) return;
      setMenu(false);
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
