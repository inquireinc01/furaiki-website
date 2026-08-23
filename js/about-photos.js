// 活動報告ページ(about.html)の写真自動読み込み
// - メインビジュアル: images/about-hero/ の先頭画像(ファイル名順)を背景に使用
// - フォトギャラリー: カテゴリタブごとに images/gallery/ 配下のフォルダを表示
// 画像一覧はGitHub APIから取得し、失敗時はフォールバックの既定画像を使う。
(function () {
  const REPO_API =
    "https://api.github.com/repos/inquireinc01/furaiki-website/contents/";

  // 英語版(en/about.html)は1階層下にあるため、images/ への相対パスがずれる。
  // <html data-base="../"> を基点にして組み立てる(日本語版では空文字)。
  const EN = document.documentElement.lang === "en";
  const BASE = document.documentElement.dataset.base || "";

  // srcset用の軽量版(-480w/-800w)は tools/prepare_photos.py が生成する
  // (元画像と同じフォルダに追加生成)。フルサイズの実寸はギャラリー系
  // フォルダの縮小設定(1600px)に合わせている。画面幅に応じて、
  // ブラウザが自動でこの中から最適な軽さの画像を選んでくれる。
  const SRCSET_WIDTHS = [480, 800];
  const FULL_WIDTH_HINT = 1600;
  const GALLERY_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

  function withWidth(url, w) {
    return url.replace(/(\.[a-z0-9]+)$/i, "-" + w + "w$1");
  }

  function buildSrcset(url) {
    const parts = SRCSET_WIDTHS.map((w) => withWidth(url, w) + " " + w + "w");
    parts.push(url + " " + FULL_WIDTH_HINT + "w");
    return parts.join(", ");
  }

  // ファイル名(yyyymmddhhmmss…)の降順=新着順で並べる。
  // folder はリポジトリ上のパス(images/gallery 等)。表示に使うURLだけ BASE を前置する。
  function toUrls(folder, names) {
    return names
      .filter((n) => /\.(jpe?g|png|webp|gif)$/i.test(n))
      .sort((a, b) => b.localeCompare(a, "ja"))
      .map((n) => BASE + folder + "/" + encodeURIComponent(n));
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
    return fetch(BASE + folder + "/list.json", { cache: "no-store" })
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
      const list = urls && urls.length ? urls : [BASE + "images/banner-record1.jpg"];
      heroBg.style.backgroundImage = "url('" + list[0] + "')";
    });
  }

  // ===== 活動記録ギャラリー =====
  // images/gallery/index.json(tools/prepare_photos.py が生成)を1本読むだけ。
  // 活動1回=1フォルダで、フォルダごとに見出し(回・期間・場所)を付けて並べる。
  const grid = document.getElementById("galleryGrid");
  const filterWrap = document.getElementById("galleryTabs");
  const emptyNote = document.getElementById("galleryEmptyNote");
  if (!grid || !filterWrap) return;

  const RECENT_DAYS = 95; // 3ヶ月+若干の余裕
  const PHOTO_ALT = EN ? "Photos from our activities " : "活動報告の様子";

  // 定款 第5条(事業の種類)に対応する。番号は info.txt の「事業:」で指定する。
  const PROGRAMS = {
    "1": EN ? "Volunteer dispatch" : "災害ボランティア派遣",
    "2": EN ? "Recovery & emotional support" : "復興・心のケア支援",
    "3": EN ? "Furaiki flag outreach" : "応援フライキ普及",
    "4": EN ? "Volunteer platform" : "ボランティア基盤づくり",
    "5": EN ? "Other" : "その他",
  };
  const AREA_EN = { "能登": "Noto", "熊本": "Kumamoto", "岩手": "Iwate", "広報": "Outreach" };
  const T = {
    all: EN ? "All" : "すべて",
    recent: EN ? "Last 3 months" : "直近3ヶ月",
    area: EN ? "Area" : "地域",
    year: EN ? "Year" : "年",
    program: EN ? "Programme" : "事業",
    empty: EN
      ? "No activities match this filter yet."
      : "この条件に当てはまる活動記録はまだありません。",
    photos: EN ? " photos" : "枚",
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    return EN
      ? MONTHS[+m[2] - 1] + " " + +m[3] + ", " + m[1]
      : m[1] + "年" + +m[2] + "月" + +m[3] + "日";
  }

  // 「2026-08-22〜2026-08-24」→「2026年8月22日〜24日」。同じ月なら後半を短く出す。
  function fmtPeriod(period) {
    const parts = String(period || "").split(/[〜~]/);
    if (parts.length < 2) return fmtDate(parts[0]);
    const a = parts[0].trim();
    const b = parts[1].trim();
    if (a.slice(0, 7) === b.slice(0, 7)) {
      const d2 = +b.slice(8, 10);
      // 英語は「August 22–24, 2026」、日本語は「2026年8月22日〜24日」
      if (EN) {
        return MONTHS[+a.slice(5, 7) - 1] + " " + +a.slice(8, 10) + "–" + d2 + ", " + a.slice(0, 4);
      }
      return fmtDate(a) + "〜" + d2 + "日";
    }
    return fmtDate(a) + (EN ? " – " : "〜") + fmtDate(b);
  }

  function chip(label, value, group) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gallery-chip";
    b.dataset.group = group;
    b.dataset.value = value;
    b.textContent = label;
    return b;
  }

  function photoCard(url, i) {
    const item = document.createElement("div");
    item.className = "gallery-item group overflow-hidden rounded-lg";
    item.style.transitionDelay = (i % 3) * 100 + "ms";

    const wrapper = document.createElement("div");
    wrapper.className = "gallery-image-wrapper relative bg-gray-300 aspect-[4/3]";

    const img = document.createElement("img");
    img.src = withWidth(url, SRCSET_WIDTHS[0]);
    img.srcset = buildSrcset(url);
    img.sizes = GALLERY_SIZES;
    img.alt = PHOTO_ALT + (i + 1);
    img.loading = "lazy";
    img.className = "gallery-image w-full h-full object-cover";

    const overlay = document.createElement("div");
    overlay.className =
      "gallery-overlay absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300";

    wrapper.appendChild(img);
    wrapper.appendChild(overlay);
    item.appendChild(wrapper);
    return item;
  }

  function pick(act, key) {
    // 英語版は「場所EN」等があればそれを使い、無ければ日本語を出さない
    if (EN) return act[key + "En"] || "";
    return act[key] || "";
  }

  function activityBlock(act) {
    const sec = document.createElement("section");
    // reveal は写真カード側だけに付ける。まとまり全体に付けると、
    // 監視対象外のため opacity:0 のまま何も見えなくなる
    sec.className = "activity";

    const head = document.createElement("div");
    head.className = "activity-head";

    if (act.round) {
      const badge = document.createElement("span");
      badge.className = "activity-round";
      badge.textContent = EN ? "#" + act.round.replace(/[^0-9]/g, "") : act.round;
      head.appendChild(badge);
    }

    const h3 = document.createElement("h3");
    h3.className = "activity-title";
    h3.textContent = pick(act, "place") || (EN ? AREA_EN[act.area] || act.area : act.area);
    head.appendChild(h3);

    const meta = document.createElement("p");
    meta.className = "activity-meta";
    const bits = [fmtPeriod(act.period)];
    const disaster = pick(act, "disaster");
    if (disaster) bits.push(disaster);
    bits.push(act.photos.length + T.photos);
    meta.textContent = bits.join(EN ? " · " : "　・　");
    head.appendChild(meta);

    const work = pick(act, "work");
    if (work) {
      const p = document.createElement("p");
      p.className = "activity-work";
      p.textContent = work;
      head.appendChild(p);
    }

    const tags = document.createElement("p");
    tags.className = "activity-tags";
    (act.cats || []).forEach((c) => {
      if (!PROGRAMS[c]) return;
      const s = document.createElement("span");
      s.textContent = PROGRAMS[c];
      tags.appendChild(s);
    });
    if (tags.childNodes.length) head.appendChild(tags);

    sec.appendChild(head);

    const g = document.createElement("div");
    g.className = "gallery-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6";
    act.photos.forEach((name, i) => {
      g.appendChild(photoCard(BASE + "images/gallery/" + act.dir + "/" + encodeURIComponent(name), i));
    });
    sec.appendChild(g);
    return sec;
  }

  const state = { area: "", year: "", program: "", recent: false };
  let ACTIVITIES = [];

  function matches(act) {
    if (state.area && act.area !== state.area) return false;
    if (state.year && String(act.start).slice(0, 4) !== state.year) return false;
    if (state.program && (act.cats || []).indexOf(state.program) < 0) return false;
    if (state.recent) {
      const t = Date.parse(act.start);
      if (isNaN(t) || Date.now() - t > RECENT_DAYS * 864e5) return false;
    }
    return true;
  }

  function render() {
    grid.textContent = "";
    const list = ACTIVITIES.filter(matches);
    if (emptyNote) {
      emptyNote.classList.toggle("hidden", list.length > 0);
      emptyNote.textContent = T.empty;
    }
    list.forEach((act) => grid.appendChild(activityBlock(act)));

    if (!("IntersectionObserver" in window)) {
      grid.querySelectorAll(".gallery-item, .activity").forEach((el) => el.classList.add("in-view"));
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

  function syncChips() {
    filterWrap.querySelectorAll(".gallery-chip").forEach((b) => {
      const g = b.dataset.group;
      const on =
        g === "reset"
          ? !state.area && !state.year && !state.program && !state.recent
          : g === "recent"
          ? state.recent
          : state[g] === b.dataset.value;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function buildFilters() {
    filterWrap.textContent = "";

    const row1 = document.createElement("div");
    row1.className = "gallery-chip-row";
    const all = chip(T.all, "", "reset");
    const rec = chip(T.recent, "", "recent");
    row1.appendChild(all);
    row1.appendChild(rec);
    filterWrap.appendChild(row1);

    function group(key, label, values, labeller) {
      if (values.length < 2) return;
      const row = document.createElement("div");
      row.className = "gallery-chip-row";
      const cap = document.createElement("span");
      cap.className = "gallery-chip-label";
      cap.textContent = label;
      row.appendChild(cap);
      values.forEach((v) => row.appendChild(chip(labeller(v), v, key)));
      filterWrap.appendChild(row);
    }

    const areas = [];
    const years = [];
    const programs = [];
    ACTIVITIES.forEach((a) => {
      if (a.area && areas.indexOf(a.area) < 0) areas.push(a.area);
      const y = String(a.start).slice(0, 4);
      if (y && years.indexOf(y) < 0) years.push(y);
      (a.cats || []).forEach((c) => {
        if (PROGRAMS[c] && programs.indexOf(c) < 0) programs.push(c);
      });
    });
    years.sort().reverse();
    programs.sort();

    group("area", T.area, areas, (v) => (EN ? AREA_EN[v] || v : v));
    group("year", T.year, years, (v) => (EN ? v : v + "年"));
    group("program", T.program, programs, (v) => PROGRAMS[v]);

    filterWrap.addEventListener("click", (e) => {
      const b = e.target.closest(".gallery-chip");
      if (!b) return;
      const g = b.dataset.group;
      if (g === "reset") {
        state.area = state.year = state.program = "";
        state.recent = false;
      } else if (g === "recent") {
        state.recent = !state.recent;
      } else {
        state[g] = state[g] === b.dataset.value ? "" : b.dataset.value;
      }
      syncChips();
      render();
    });
    syncChips();
  }

  fetch(BASE + "images/gallery/index.json", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : []))
    .then((list) => {
      ACTIVITIES = Array.isArray(list) ? list : [];
      buildFilters();
      render();
    })
    .catch(() => {
      ACTIVITIES = [];
      render();
    });
})();
