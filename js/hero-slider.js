// トップページのメインビジュアル(横スクロールスライダー)
// images/hero/ フォルダ内の画像を自動で読み込んで横に流す。
// 画像一覧はまず同一オリジンの静的ファイル list.json を読む
// (「サイトを更新.bat」が生成)。これによりGitHub APIのレート制限
// (1時間60回/IP)で画像が消える問題を避ける。表示順はファイル名の昇順。
//
// 見た目(横に流れっぱなし)は維持しつつ、読み込みの重さは以下で抑えている。
// ①srcset(-480w/-800w)で、フル画質(最大1600px)ではなく画面幅に応じた
//   軽い版を読み込む。②最初に見える1〜2枚だけ即読み込みし、残りは
//   loading="lazy"でブラウザに任せる(画面外にある間はダウンロードされず、
//   流れて近づくにつれて自動的に読み込まれる)。シームレスループ用の
//   複製(2周目)も同じURLのため、ブラウザのキャッシュで実質追加通信なしで済む。
(function () {
  const FOLDER = "images/hero";
  const MANIFEST_URL = FOLDER + "/list.json";
  const API_URL =
    "https://api.github.com/repos/inquireinc01/furaiki-website/contents/images/hero?ref=master";
  // 最終手段(list.json も API も読めなかった場合)。実在するコミット済み画像を指定。
  const FALLBACK_IMAGES = [
    "images/hero/02.jpg",
    "images/hero/03-main.jpg",
    "images/hero/IMG_4747.jpg",
  ];
  // スクロール速度(1秒あたりのピクセル数)。小さいほどゆっくり。
  const SPEED_PX_PER_SEC = 42;
  // 最初から即読み込みする枚数(画面に最初から見えている分だけで十分)。
  const EAGER_COUNT = 2;
  // srcset用の軽量版(-480w/-800w)は tools/prepare_photos.py が生成する
  // (images/hero の縮小設定=1600pxがフルサイズの実寸)。
  const SRCSET_WIDTHS = [480, 800];
  const FULL_WIDTH_HINT = 1600;

  const container = document.getElementById("heroSlider");
  if (!container) return;

  function isImage(name) {
    return /\.(jpe?g|png|webp|gif)$/i.test(name);
  }

  function toUrls(names) {
    return names
      .filter(isImage)
      .sort((a, b) => a.localeCompare(b, "ja"))
      .map((n) => FOLDER + "/" + encodeURIComponent(n));
  }

  function withWidth(url, w) {
    return url.replace(/(\.[a-z0-9]+)$/i, "-" + w + "w$1");
  }

  function buildSrcset(url) {
    return SRCSET_WIDTHS.map((w) => withWidth(url, w) + " " + w + "w")
      .concat([url + " " + FULL_WIDTH_HINT + "w"])
      .join(", ");
  }

  // 1) 静的な一覧(list.json)を優先
  function fromManifest() {
    return fetch(MANIFEST_URL, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((names) => (Array.isArray(names) && names.length ? toUrls(names) : null))
      .catch(() => null);
  }

  // 2) 予備手段: GitHub API
  function fromApi() {
    return fetch(API_URL, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((files) =>
        Array.isArray(files)
          ? toUrls(files.filter((f) => f.type === "file").map((f) => f.name))
          : null
      )
      .catch(() => null);
  }

  function build(urls) {
    if (!urls.length) return;

    // 1枚だけなら静止背景として表示(軽量版で十分)
    if (urls.length === 1) {
      container.style.backgroundImage = "none";
      const img = document.createElement("img");
      img.alt = "";
      img.sizes = "100vw";
      img.src = withWidth(urls[0], SRCSET_WIDTHS[1]);
      img.srcset = buildSrcset(urls[0]);
      img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;";
      container.appendChild(img);
      return;
    }

    const track = document.createElement("div");
    track.className = "hero-track";
    const imgs = [];
    let eagerLoaded = 0;

    // シームレスにループさせるため同じ並びを2周分並べる。
    // 2周目は1周目と同じURLなので、ブラウザのキャッシュにより
    // 実質追加の通信なしで表示できる。
    for (let lap = 0; lap < 2; lap++) {
      urls.forEach((url) => {
        const cell = document.createElement("div");
        cell.className = "hero-cell";
        const img = document.createElement("img");
        img.alt = "";
        img.sizes = "100vw";
        img.srcset = buildSrcset(url);
        img.src = withWidth(url, SRCSET_WIDTHS[1]);
        img.decoding = "async";
        // 最初に画面へ見えている分だけ即読み込みし、残りはブラウザ任せの
        // 遅延読み込みにする(横に流れて近づくにつれて自動的に読み込まれる)
        if (eagerLoaded < EAGER_COUNT) {
          eagerLoaded++;
        } else {
          img.loading = "lazy";
        }
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

  // 表示順(ファイル名順)が古いキャッシュのまま止まって見えないよう、
  // GitHub APIの応答は常に最新を取りに行く
  fromManifest()
    .then((urls) => (urls && urls.length ? urls : fromApi()))
    .then((urls) => build(urls && urls.length ? urls : FALLBACK_IMAGES))
    .catch(() => build(FALLBACK_IMAGES));
})();
