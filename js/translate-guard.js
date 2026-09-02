// ブラウザの自動翻訳(Chrome/Edge/Safari)で表示が壊れないようにするための補正。
//
// 「翻訳されたかどうか」は判定せず、実際の文字幅や文字内容を実測して必要なときだけ
// 補正する。日本語表示のままなら条件を満たさないので何も起きず、従来の見た目・
// 動作は一切変わらない。
(function () {
  const hero = document.querySelector(".hero-fullscreen");

  // ---- ① キラリと光るレイヤーの文字を本文に追随させる ----
  // .hero-intro-line / .hero-flag-shine は ::after { content: attr(data-text) } で
  // 本文と同じ文字を重ねて光らせている。翻訳エンジンは本文(テキストノード)は
  // 書き換えるが data-* 属性は書き換えないため、放置すると英文の上に日本語が
  // 重なって光り続ける。本文が変わったら data-text も揃える。
  const shineTargets = document.querySelectorAll(".hero-intro-line, .hero-flag-shine");

  // 注記など、光らせたくない子要素([data-no-shine])は重ね文字から除外する
  function shineText(el) {
    return Array.from(el.childNodes)
      .filter((n) => !(n.nodeType === 1 && n.hasAttribute("data-no-shine")))
      .map((n) => n.textContent)
      .join("")
      .trim();
  }

  function syncShineText() {
    shineTargets.forEach((el) => {
      const text = shineText(el);
      if (text && el.dataset.text !== text) el.dataset.text = text;
    });
  }

  // ---- ② 1行に収まらなくなった見出しだけ折り返しを許可する ----
  // .hero-line は日本語の字数を前提に white-space:nowrap + clamp() で
  // 「必ず1行」に調整してある。英訳すると字数が数倍になり、
  // .hero-fullscreen の overflow:hidden で左右が切れて読めなくなるため、
  // 実測してはみ出す行にだけ折り返しを許可する。
  const heroLines = document.querySelectorAll(".hero-line");

  function fitHeroLines() {
    if (!hero || !heroLines.length) return;
    // .hero-content の max-width:90% に合わせた実効幅
    const available = hero.clientWidth * 0.9;
    if (!available) return;
    heroLines.forEach((el) => {
      // 素の(折り返さない)幅で測り直すため、一旦補正を外す
      el.classList.remove("is-wrapped");
      if (el.scrollWidth > available) el.classList.add("is-wrapped");
    });
  }

  function update() {
    syncShineText();
    fitHeroLines();
  }

  update();

  let timer = null;
  function scheduleUpdate() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(update, 80);
  }

  // 翻訳は読み込み後に非同期で行われるため、本文の差し替えを監視して追随する。
  // data-text の書き換え自体は子ノードを変えないので、この監視は再帰しない。
  if (window.MutationObserver && hero) {
    new MutationObserver(scheduleUpdate).observe(hero, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
  window.addEventListener("resize", scheduleUpdate);
  // 折り返しの要否は画面幅で変わる。resize イベントを取りこぼす環境でも
  // 確実に測り直せるよう、ヒーロー自体の寸法変化も見る。
  // (補正で変わるのは中の行の幅だけで、ヒーローの寸法は変わらないため再帰しない)
  if (window.ResizeObserver && hero) new ResizeObserver(scheduleUpdate).observe(hero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  window.addEventListener("load", update);
})();
