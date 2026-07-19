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
    recent: "images/gallery/recent",
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
  const RECENT_DAYS = 95; // 3ヶ月+若干の余裕
  const RECENT_EMPTY_MESSAGE =
    "直近3ヶ月以内の活動写真はまだ登録されていません。" +
    "活動のたびに images/gallery/recent フォルダへ写真を追加してください。";
  const DEFAULT_EMPTY_MESSAGE =
    "このカテゴリの写真はまだ登録されていません。images/gallery/ 内の対応フォルダに写真を追加すると表示されます。";

  const ACTIVE_CLASS = ["border-[#c8102e]", "text-white", "bg-[#c8102e]"];
  const INACTIVE_CLASS = ["border-gray-200", "text-gray-600", "bg-white"];

  function setActiveTab(tab) {
    tabsWrap.querySelectorAll(".gallery-tab").forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.remove(...ACTIVE_CLASS, ...INACTIVE_CLASS);
      btn.classList.add(...(isActive ? ACTIVE_CLASS : INACTIVE_CLASS));
    });
  }

  function renderGallery(urls, emptyMessage) {
    grid.textContent = "";
    if (emptyNote) {
      emptyNote.classList.toggle("hidden", urls.length > 0);
      if (emptyMessage) emptyNote.textContent = emptyMessage;
    }
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

  // 「直近の活動」タブ: 各写真のExif撮影日を読み取り、
  // 3ヶ月以内のものだけを新しい順に並べる。撮影日が読めない写真は
  // 除外せず一覧の末尾にファイル名順で残す(誤って消えるより安全)。
  function loadRecentTab(urls) {
    if (typeof window.readExifDate !== "function") {
      renderGallery(urls, RECENT_EMPTY_MESSAGE); // 読み取り機能が無ければそのまま表示
      return;
    }
    const now = Date.now();
    const limitMs = RECENT_DAYS * 24 * 60 * 60 * 1000;

    Promise.all(urls.map((url) => window.readExifDate(url).catch(() => null))).then(
      (dates) => {
        const withDate = [];
        const withoutDate = [];
        urls.forEach((url, i) => {
          const d = dates[i];
          if (d && now - d.getTime() <= limitMs) {
            withDate.push({ url, time: d.getTime() });
          } else if (!d) {
            withoutDate.push(url);
          }
          // 撮影日が読めて、かつ3ヶ月より古い場合は表示しない
        });
        withDate.sort((a, b) => b.time - a.time); // 新しい順
        const ordered = withDate.map((x) => x.url).concat(withoutDate);
        renderGallery(ordered, RECENT_EMPTY_MESSAGE);
      }
    );
  }

  function loadTab(tab) {
    setActiveTab(tab);
    const emptyMessage = tab === "recent" ? RECENT_EMPTY_MESSAGE : DEFAULT_EMPTY_MESSAGE;
    listImages(FOLDERS[tab] || FOLDERS.all).then((urls) => {
      if (urls === null) {
        renderGallery(tab === "all" ? ALL_FALLBACK : [], emptyMessage);
        return;
      }
      if (tab === "recent") {
        loadRecentTab(urls);
        return;
      }
      renderGallery(urls, emptyMessage);
    });
  }

  tabsWrap.querySelectorAll(".gallery-tab").forEach((btn) => {
    btn.addEventListener("click", () => loadTab(btn.dataset.tab));
  });

  loadTab("recent");
})();
