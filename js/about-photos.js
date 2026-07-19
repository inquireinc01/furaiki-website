// 活動報告ページ(about.html)の写真自動読み込み
// - メインビジュアル: images/about-hero/ の先頭画像(ファイル名順)を背景に使用
// - フォトギャラリー: カテゴリタブごとに images/gallery/ 配下のフォルダを表示
// 画像一覧はGitHub APIから取得し、失敗時はフォールバックの既定画像を使う。
(function () {
  const REPO_API =
    "https://api.github.com/repos/inquireinc01/furaiki-website/contents/";

  function listImages(folder) {
    return fetch(REPO_API + folder + "?ref=master")
      .then((res) => {
        if (!res.ok) throw new Error("GitHub API " + res.status);
        return res.json();
      })
      .then((files) =>
        files
          .filter((f) => f.type === "file" && /\.(jpe?g|png|webp|gif)$/i.test(f.name))
          .sort((a, b) => a.name.localeCompare(b.name, "ja"))
          .map((f) => folder + "/" + encodeURIComponent(f.name))
      )
      .catch(() => null); // null = 取得失敗(フォールバックへ)
  }

  // メインビジュアル
  const heroBg = document.getElementById("aboutHeroBg");
  if (heroBg) {
    listImages("images/about-hero").then((urls) => {
      const list = urls && urls.length ? urls : ["images/banner-record1.jpg"];
      heroBg.style.backgroundImage = "url('" + list[0] + "')";
    });
  }

  // カテゴリ別フォトギャラリー
  const grid = document.getElementById("galleryGrid");
  const tabsWrap = document.getElementById("galleryTabs");
  const emptyNote = document.getElementById("galleryEmptyNote");
  if (!grid || !tabsWrap) return;

  const FOLDERS = {
    all: "images/gallery",
    "disaster-relief": "images/gallery/disaster-relief",
    "heart-flags": "images/gallery/heart-flags",
    community: "images/gallery/community",
  };
  const ALL_FALLBACK = [
    "images/gallery/01.jpg",
    "images/gallery/02.jpg",
    "images/gallery/03.jpg",
    "images/gallery/04.jpg",
  ];

  const ACTIVE_CLASS = ["border-[#c8102e]", "text-white", "bg-[#c8102e]"];
  const INACTIVE_CLASS = ["border-gray-200", "text-gray-600", "bg-white"];

  function setActiveTab(tab) {
    tabsWrap.querySelectorAll(".gallery-tab").forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.remove(...ACTIVE_CLASS, ...INACTIVE_CLASS);
      btn.classList.add(...(isActive ? ACTIVE_CLASS : INACTIVE_CLASS));
    });
  }

  function renderGallery(urls) {
    grid.textContent = "";
    if (emptyNote) emptyNote.classList.toggle("hidden", urls.length > 0);
    urls.forEach((url, i) => {
      const item = document.createElement("div");
      item.className = "gallery-item group overflow-hidden rounded-lg";
      item.style.transitionDelay = (i % 3) * 100 + "ms";
      item.innerHTML =
        '<div class="gallery-image-wrapper relative bg-gray-300 aspect-[4/3]">' +
        '<img src="' + url + '" alt="活動報告の様子' + (i + 1) + '" loading="lazy" class="gallery-image w-full h-full object-cover" />' +
        '<div class="gallery-overlay absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>' +
        "</div>";
      grid.appendChild(item);
    });

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
  }

  function loadTab(tab) {
    setActiveTab(tab);
    listImages(FOLDERS[tab] || FOLDERS.all).then((urls) => {
      if (urls === null) {
        renderGallery(tab === "all" ? ALL_FALLBACK : []);
        return;
      }
      renderGallery(urls);
    });
  }

  tabsWrap.querySelectorAll(".gallery-tab").forEach((btn) => {
    btn.addEventListener("click", () => loadTab(btn.dataset.tab));
  });

  loadTab("all");
})();
