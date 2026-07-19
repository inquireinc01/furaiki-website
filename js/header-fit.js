// ヘッダーのナビ表示切替(固定の画面幅ではなく、実際に収まるかどうかで判定する)。
// nav/寄付ボタンは初期状態で visibility:hidden + position:absolute にしてあり、
// レイアウトに影響を与えずに「表示したら何pxになるか」を常に測定できる。
// 収まる場合だけ通常表示に切り替え、ハンバーガーメニューを隠す。
(function () {
  const header = document.getElementById("site-header");
  const nav = document.getElementById("desktopNav");
  const donate = document.getElementById("desktopDonate");
  const hamburger = document.getElementById("menu-button");
  const logo = document.querySelector("#site-header .logo-badge");
  const mobileMenu = document.getElementById("mobile-menu");
  if (!header || !nav || !donate || !hamburger || !logo) return;

  const row = header.querySelector(".relative.flex.items-center.justify-between");
  if (!row) return;

  const CTA_GAP = 16; // CTAエリア内 gap-4
  const SAFETY = 32; // 余裕分
  const LOGO_WIDTH_FALLBACK = 168; // sm以上でのバッジ幅。ロゴがdisplay:noneの間の代替値

  function fits() {
    // 768px未満はロゴ自体が(スマホ専用デザインのため)display:noneになり
    // getBoundingClientRect() が 0 を返すので、実測できない場合は既定値で補う
    const logoW = logo.getBoundingClientRect().width || LOGO_WIDTH_FALLBACK;
    const available = row.clientWidth;
    const need = logoW + nav.scrollWidth + donate.scrollWidth + CTA_GAP * 2 + SAFETY;
    return need <= available;
  }

  function showFull() {
    nav.style.position = "";
    nav.style.left = "";
    donate.style.position = "";
    donate.style.left = "";
    hamburger.style.display = "none";
  }

  function showCompact() {
    // visibility:hidden だけだと、position:absolute の要素が「本来あったはずの位置」に
    // 応じて documentElement の scrollWidth を広げ、横スクロールが発生することがあるため、
    // 画面外(左に-9999px)へ物理的に追い出して測定専用にする
    nav.style.position = "absolute";
    nav.style.left = "-9999px";
    donate.style.position = "absolute";
    donate.style.left = "-9999px";
    hamburger.style.display = "";
  }

  function update() {
    // 判定は常に「画面外に置いた自然な幅」を基準にするため、一旦測定用の状態へ戻す
    const wasFull = !nav.style.position;
    if (wasFull) {
      nav.style.position = "absolute";
      nav.style.left = "-9999px";
      donate.style.position = "absolute";
      donate.style.left = "-9999px";
    }
    const ok = fits();
    if (ok) {
      showFull();
    } else {
      showCompact();
      // 表示方式が切り替わったらメニューを閉じておく(開いたままだと見た目が崩れるため)
      if (mobileMenu && !mobileMenu.classList.contains("hidden")) {
        mobileMenu.classList.add("hidden");
        hamburger.setAttribute("aria-expanded", "false");
      }
    }
  }

  showCompact();
  update();

  // requestAnimationFrame はバックグラウンドタブで実行が止まる(可視化されるまで
  // 発火しない)ため、フォント読み込み後などの再判定漏れを防ぐ目的では使わず、
  // setTimeoutによる簡単な間引きのみ行う。
  let timer = null;
  function scheduleUpdate() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(update, 80);
  }

  window.addEventListener("resize", scheduleUpdate);
  if (window.ResizeObserver) {
    new ResizeObserver(scheduleUpdate).observe(row);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(update);
  }
  // 念のため、読み込み完了直後にもう一度判定し直す(フォントスワップ等に対応)
  window.addEventListener("load", update);
})();
