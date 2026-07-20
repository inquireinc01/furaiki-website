// 活動報告ページ(about.html)の写真自動読み込み
// - メインビジュアル: images/about-hero/ の先頭画像(ファイル名順)を背景に使用
// - フォトギャラリー: カテゴリタブごとに images/gallery/ 配下のフォルダを表示
// 画像一覧はGitHub APIから取得し、失敗時はフォールバックの既定画像を使う。
(function () {
  const REPO_API =
    "https://api.github.com/repos/inquireinc01/furaiki-website/contents/";

  // ファイル名(yyyymmddhhmmss…)の降順=新着順で並べる。
  function toUrls(folder, names) {
    return names
      .filter((n) => /\.(jpe?g|png|webp|gif)$/i.test(n))
      .sort((a, b) => b.localeCompare(a, "ja"))
      .map((n) => folder + "/" + encodeURIComponent(n));
  }

  // ファイル名の先頭 yyyymmddhhmmss から撮影日時を取り出す(無ければ null)。
  function dateFromName(url) {
    const name = decodeURIComponent(url.split("/").pop());
    const m = name.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    return isNaN(d.getTime()) ? null : d;
  }

  // 予備手段: GitHub API(list.json が読めない場合のみ)
  function listImagesFromApi(folder) {
    return fetch(REPO_API + folder + "?ref=master")
      .then((res) => {
        if (!res.ok) throw new Error("GitHub API " + res.status);
        return res.json();
      })
      .then((files) =>
        toUrls(folder, files.filter((f) => f.type === "file").map((f) => f.name))
      )
      .catch(() => null); // null = 取得失敗(フォールバックへ)
  }

  // まず同一オリジンの静的な一覧(list.json)を読む。GitHub APIのレート制限に
  // 左右されず確実に読めるため、通常はこちらだけで完結する。
  // 空配列([])はそのフォルダに写真が無いことを示す(nullとは区別する)。
  function listImages(folder) {
    return fetch(folder + "/list.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((names) =>
        Array.isArray(names) ? toUrls(folder, names) : listImagesFromApi(folder)
      )
      .catch(() => listImagesFromApi(folder));
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
    "disaster-relief": "images/gallery/saigaifukkou",
    "heart-flags": "images/gallery/heartrugby",
    community: "images/gallery/community",
  };
  // 「すべて」タブは、カテゴリ別サブフォルダ + gallery直下の写真をすべて集約して
  // 表示する。写真をサブフォルダに振り分けても「すべて」で一覧できるようにするため。
  const ALL_SOURCE_FOLDERS = [
    "images/gallery",
    "images/gallery/saigaifukkou",
    "images/gallery/heartrugby",
    "images/gallery/community",
    "images/gallery/recent",
  ];

  // 全フォルダの写真を集約。ファイル名(撮影日時)の降順=新着順で並べ、同名は重複排除。
  function listAllImages() {
    return Promise.all(
      ALL_SOURCE_FOLDERS.map((f) => listImages(f).then((u) => u || []))
    ).then((lists) => {
      // 重複排除はフルパス(url)で行う。撮影日時ファイル名は別フォルダ間で
      // 同名になり得る(別の写真)ため、ファイル名だけで排除すると取りこぼす。
      const seen = new Set();
      const combined = [];
      lists.forEach((urls) => {
        urls.forEach((url) => {
          if (!seen.has(url)) {
            seen.add(url);
            combined.push(url);
          }
        });
      });
      combined.sort((a, b) =>
        b.split("/").pop().localeCompare(a.split("/").pop(), "ja")
      );
      return combined;
    });
  }
  // list.json が全滅した場合のみ使う予備(通常は到達しない)。存在しない名前を
  // 並べると壊れた画像が出るため、空にして「準備中」メッセージを表示させる。
  const ALL_FALLBACK = [];
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
      // 支援技術に現在選択中のフィルターを伝える
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function renderGallery(urls, emptyMessage) {
    grid.textContent = "";
    if (emptyNote) {
      emptyNote.classList.toggle("hidden", urls.length > 0);
      if (emptyMessage) emptyNote.textContent = emptyMessage;
    }
    urls.forEach((url, i) => {
      // innerHTML でのHTML組み立ては避け、DOM APIで生成する
      // (URL由来の文字列を属性に安全に入れ、エスケープ漏れによるリスクを排除)
      const item = document.createElement("div");
      item.className = "gallery-item group overflow-hidden rounded-lg";
      item.style.transitionDelay = (i % 3) * 100 + "ms";

      const wrapper = document.createElement("div");
      wrapper.className = "gallery-image-wrapper relative bg-gray-300 aspect-[4/3]";

      const img = document.createElement("img");
      img.src = url;
      img.alt = "活動報告の様子" + (i + 1);
      img.loading = "lazy";
      img.className = "gallery-image w-full h-full object-cover";

      const overlay = document.createElement("div");
      overlay.className =
        "gallery-overlay absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300";

      wrapper.appendChild(img);
      wrapper.appendChild(overlay);
      item.appendChild(wrapper);
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

  // 「直近の活動」タブ: ファイル名の撮影日時から3ヶ月以内の写真を新しい順に表示。
  // ファイル名に日時が無い写真だけ、従来どおりExif(readExifDate)で補完判定する。
  function loadRecent(urls, emptyMessage) {
    const now = Date.now();
    const limitMs = RECENT_DAYS * 24 * 60 * 60 * 1000;
    const dated = []; // {url, time}
    const needExif = []; // ファイル名から日時が取れなかったもの

    urls.forEach((url) => {
      const d = dateFromName(url);
      if (d) dated.push({ url, time: d.getTime() });
      else needExif.push(url);
    });

    function finish() {
      const recent = dated
        .filter((x) => now - x.time <= limitMs)
        .sort((a, b) => b.time - a.time) // 新しい順
        .map((x) => x.url);
      renderGallery(recent, emptyMessage);
    }

    if (!needExif.length || typeof window.readExifDate !== "function") {
      finish();
      return;
    }
    Promise.all(needExif.map((u) => window.readExifDate(u).catch(() => null))).then(
      (dates) => {
        needExif.forEach((u, i) => {
          if (dates[i]) dated.push({ url: u, time: dates[i].getTime() });
        });
        finish();
      }
    );
  }

  function loadTab(tab) {
    setActiveTab(tab);
    const emptyMessage = tab === "recent" ? RECENT_EMPTY_MESSAGE : DEFAULT_EMPTY_MESSAGE;

    // 「すべて」は全カテゴリを集約(新着順)して表示
    if (tab === "all") {
      listAllImages().then((urls) => {
        renderGallery(urls.length ? urls : ALL_FALLBACK, emptyMessage);
      });
      return;
    }

    listImages(FOLDERS[tab] || FOLDERS.all).then((urls) => {
      if (urls === null) {
        renderGallery([], emptyMessage);
        return;
      }
      if (tab === "recent") {
        loadRecent(urls, emptyMessage);
        return;
      }
      renderGallery(urls, emptyMessage); // urls は既に新着順(降順)
    });
  }

  tabsWrap.querySelectorAll(".gallery-tab").forEach((btn) => {
    btn.addEventListener("click", () => loadTab(btn.dataset.tab));
  });

  loadTab("all");
})();
