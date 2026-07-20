// トップページのメインビジュアル(クロスフェード・スライドショー)
// images/hero/ フォルダ内の画像を自動で読み込んで、1枚ずつふわっと
// 切り替えて表示する。画像一覧はまず同一オリジンの静的ファイル list.json を
// 読む(「サイトを更新.bat」が生成)。これによりGitHub APIのレート制限
// (1時間60回/IP)で画像が消える問題を避ける。表示順はファイル名の昇順。
//
// 以前は全画像を横に2周分並べて流しっぱなしにする方式だったが、
// メインビジュアルを最後まで眺め続ける人は少ない一方、その方式だと
// 全画像(×2周分)を最初にまとめて読み込む必要があり通信量が重かった。
// 現在は「今表示している1枚」と「次に出す1枚」だけを読み込む
// 順次読み込み方式にして、通信量を大きく抑えている。
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
  const SLIDE_INTERVAL_MS = 6000; // 1枚あたりの表示時間
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

    // 1枚だけなら、切り替え不要の静止画として軽量版を表示
    if (urls.length === 1) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = withWidth(urls[0], SRCSET_WIDTHS[1]);
      img.srcset = buildSrcset(urls[0]);
      img.sizes = "100vw";
      img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;";
      container.appendChild(img);
      return;
    }

    const slides = urls.map((url, i) => {
      const slide = document.createElement("div");
      slide.className = "hero-slide" + (i === 0 ? " is-active" : "");
      const img = document.createElement("img");
      img.alt = "";
      img.sizes = "100vw";
      if (i === 0) {
        // 最初の1枚だけは初期表示に必要なので即読み込み
        img.src = withWidth(url, SRCSET_WIDTHS[1]);
        img.srcset = buildSrcset(url);
      } else {
        // 残りは出番が来る直前まで読み込みを遅らせる(初期表示を重くしない)
        img.dataset.src = withWidth(url, SRCSET_WIDTHS[1]);
        img.dataset.srcset = buildSrcset(url);
      }
      slide.appendChild(img);
      container.appendChild(slide);
      return slide;
    });

    function preload(index) {
      const img = slides[index].querySelector("img");
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.srcset = img.dataset.srcset;
        delete img.dataset.src;
        delete img.dataset.srcset;
      }
    }

    // 動きを抑える設定のブラウザでは自動切り替えをせず、1枚目のみ表示する
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let current = 0;
    let paused = false;

    // 次に出す1枚だけを先読みしておく(表示直前に読み込み始めると
    // 間に合わず一瞬透けて見えるため、切り替わった直後に前倒しで読み込む)
    preload(1 % slides.length);

    function advance() {
      if (paused) return;
      const next = (current + 1) % slides.length;
      slides[current].classList.remove("is-active");
      slides[next].classList.add("is-active");
      current = next;
      preload((current + 1) % slides.length);
    }

    setInterval(advance, SLIDE_INTERVAL_MS);

    // 画面外にスクロールしている間は自動切り替え・先読みを止め、
    // 無駄な通信・描画を避ける
    const heroSection = container.closest(".hero-fullscreen");
    if (heroSection && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            paused = !entry.isIntersecting;
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
