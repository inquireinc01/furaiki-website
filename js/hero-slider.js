// トップページのメインビジュアル(横スクロールスライダー)
// images/hero/ フォルダ内の画像を自動で読み込んで横に流す。
// 画像一覧はGitHub APIから取得し、失敗時は FALLBACK_IMAGES を使う。
// 表示順はファイル名の昇順(01-xxx.jpg のように番号を付けると制御できる)。
(function () {
  const API_URL =
    "https://api.github.com/repos/inquireinc01/furaiki-website/contents/images/hero?ref=master";
  const FALLBACK_IMAGES = [
    "images/hero/01-main.jpg",
    "images/hero/02-rwc2019.jpg",
    "images/hero/03-group.jpg",
  ];
  // スクロール速度(1秒あたりのピクセル数)。小さいほどゆっくり。
  const SPEED_PX_PER_SEC = 42;

  const container = document.getElementById("heroSlider");
  if (!container) return;

  function isImage(name) {
    return /\.(jpe?g|png|webp|gif)$/i.test(name);
  }

  function build(urls) {
    if (!urls.length) return;

    // 1枚だけなら静止背景として表示
    if (urls.length === 1) {
      container.style.backgroundImage = "url('" + urls[0] + "')";
      return;
    }

    const track = document.createElement("div");
    track.className = "hero-track";
    const imgs = [];

    // シームレスにループさせるため同じ並びを2周分並べる
    for (let lap = 0; lap < 2; lap++) {
      urls.forEach((url) => {
        const cell = document.createElement("div");
        cell.className = "hero-cell";
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        cell.appendChild(img);
        track.appendChild(cell);
        imgs.push(img);
      });
    }

    // 写真の幅の合計から所要時間を計算し、常に一定のゆっくりした速度で流す。
    // 画像が読み込まれるたびに幅が変わるので、その都度計算し直す。
    function updateDuration() {
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0) {
        track.style.animationDuration = halfWidth / SPEED_PX_PER_SEC + "s";
      }
    }
    imgs.forEach((img) => img.addEventListener("load", updateDuration));
    window.addEventListener("resize", updateDuration);

    container.style.backgroundImage = "none";
    container.appendChild(track);
    updateDuration();

    // 画面外にスクロールしている間はアニメーションを一時停止し、
    // スクロール中の合成負荷を下げる(モバイル端末での白フラッシュ対策)。
    const heroSection = container.closest(".hero-fullscreen");
    if (heroSection && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            track.classList.toggle("is-paused", !entry.isIntersecting);
          });
        },
        { threshold: 0 }
      );
      observer.observe(heroSection);
    }
  }

  fetch(API_URL)
    .then((res) => {
      if (!res.ok) throw new Error("GitHub API " + res.status);
      return res.json();
    })
    .then((files) => {
      const urls = files
        .filter((f) => f.type === "file" && isImage(f.name))
        .sort((a, b) => a.name.localeCompare(b.name, "ja"))
        .map((f) => "images/hero/" + encodeURIComponent(f.name));
      build(urls.length ? urls : FALLBACK_IMAGES);
    })
    .catch(() => build(FALLBACK_IMAGES));
})();
