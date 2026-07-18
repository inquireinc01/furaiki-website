// 過去の活動ページ(about.html)の写真自動読み込み
// - メインビジュアル: images/about-hero/ の先頭画像(ファイル名順)を背景に使用
// - フォトギャラリー: images/gallery/ の全画像をファイル名順にグリッド表示
// 画像一覧はGitHub APIから取得し、失敗時はフォールバックの既定画像を使う。
(function () {
  const REPO_API =
    "https://api.github.com/repos/inquireinc01/furaiki-website/contents/";

  function listImages(folder, fallback) {
    return fetch(REPO_API + folder + "?ref=master")
      .then((res) => {
        if (!res.ok) throw new Error("GitHub API " + res.status);
        return res.json();
      })
      .then((files) => {
        const urls = files
          .filter((f) => f.type === "file" && /\.(jpe?g|png|webp|gif)$/i.test(f.name))
          .sort((a, b) => a.name.localeCompare(b.name, "ja"))
          .map((f) => folder + "/" + encodeURIComponent(f.name));
        return urls.length ? urls : fallback;
      })
      .catch(() => fallback);
  }

  // メインビジュアル
  const heroBg = document.getElementById("aboutHeroBg");
  if (heroBg) {
    listImages("images/about-hero", ["images/banner-record1.jpg"]).then((urls) => {
      heroBg.style.backgroundImage = "url('" + urls[0] + "')";
    });
  }

  // フォトギャラリー
  const grid = document.getElementById("galleryGrid");
  if (grid) {
    const FALLBACK = [
      "images/gallery/01.jpg",
      "images/gallery/02.jpg",
      "images/gallery/03.jpg",
      "images/gallery/04.jpg",
    ];
    listImages("images/gallery", FALLBACK).then((urls) => {
      urls.forEach((url, i) => {
        const item = document.createElement("div");
        item.className = "gallery-item group overflow-hidden rounded-lg";
        item.style.transitionDelay = (i % 3) * 100 + "ms";
        item.innerHTML =
          '<div class="gallery-image-wrapper relative bg-gray-300 aspect-[4/3]">' +
          '<img src="' + url + '" alt="活動の様子' + (i + 1) + '" loading="lazy" class="gallery-image w-full h-full object-cover" />' +
          '<div class="gallery-overlay absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>' +
          "</div>";
        grid.appendChild(item);
      });

      // スクロールに応じたフェード表示
      // (about-animation.js は生成前に実行されるため、ここで独自に監視する)
      if (!("IntersectionObserver" in window)) {
        grid.querySelectorAll(".gallery-item").forEach((el) => el.classList.add("in-view"));
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
      );
      grid.querySelectorAll(".gallery-item").forEach((el) => observer.observe(el));
    });
  }
})();
