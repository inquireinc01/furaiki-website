// トップページのニュース自動読み込み
// news/ フォルダ内の .txt をファイル名の降順(日付が新しい順)に表示する。
// ファイル形式: 1行目=見出し、2行目〜=本文。本文中で1行がURLだけの場合、
// その位置に「詳しく見る」リンクが挿入される(好きな位置に置ける)。
// その行がYouTubeのURLだけの場合は、リンクの代わりに動画をそのまま埋め込む
// (埋め込みたくない場合は、URLの前に一言添えるなどして「URLだけの行」に
// しなければ、文中リンクとして扱われ埋め込まれない)。
// 文中に混ざったURLも自動でリンク化される。
// 一覧はGitHub APIから取得し、失敗時は FALLBACK を表示する。
(function () {
  const API_URL =
    "https://api.github.com/repos/inquireinc01/furaiki-website/contents/news?ref=master";
  const FALLBACK = [
    {
      date: "2026年7月18日",
      title: "公式ホームページをリニューアル・LINE公式アカウント開設",
      bodyLines: [
        "NPO法人設立を機にホームページを全面リニューアルしました。あわせてLINE公式アカウントを開設し、活動情報やボランティア募集情報を配信しています。",
        "https://lin.ee/nkWK6v7",
      ],
    },
  ];

  const list = document.getElementById("newsList");
  if (!list) return;

  // メモ帳(Shift_JIS)とUTF-8のどちらで保存されたファイルでも読めるようにする
  function decodeText(buf) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch (e) {
      return new TextDecoder("shift_jis").decode(buf);
    }
  }

  function dateFromName(name) {
    const m = name.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return "";
    return m[1] + "年" + parseInt(m[2], 10) + "月" + parseInt(m[3], 10) + "日";
  }

  // youtu.be/<id> や youtube.com/watch?v=<id> から埋め込み用URLを作る。
  // YouTube以外のURLの場合は null(従来どおり「詳しく見る」リンクにする)。
  function youtubeEmbedUrl(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
    return m ? "https://www.youtube.com/embed/" + m[1] : null;
  }

  // 本文中に混ざったURLだけをリンク化し、それ以外はテキストのまま追加する
  // (innerHTML は使わず、URL部分だけ<a>要素として組み立てる)
  function appendTextWithLinks(container, text) {
    const re = /https?:\/\/[^\s]+/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) {
        container.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      const a = document.createElement("a");
      a.href = m[0];
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "text-[#c8102e] font-bold hover:underline";
      a.textContent = m[0];
      container.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      container.appendChild(document.createTextNode(text.slice(last)));
    }
  }

  function parseItem(name, text) {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) return null;
    const title = lines.shift().trim();
    return {
      date: dateFromName(name),
      title,
      bodyLines: lines.map((l) => l.trim()),
    };
  }

  function render(items) {
    list.textContent = "";
    items.forEach((item) => {
      const article = document.createElement("article");
      article.className = "flex items-start gap-4 py-6 border-b border-gray-200";

      const img = document.createElement("img");
      img.src = "images/mascot.png";
      img.alt = "";
      img.className = "h-10 w-auto shrink-0 mt-1";
      article.appendChild(img);

      const box = document.createElement("div");
      if (item.date) {
        const d = document.createElement("p");
        d.className = "text-xs text-gray-500 mb-1";
        d.textContent = item.date;
        box.appendChild(d);
      }
      const h = document.createElement("h3");
      h.className = "font-bold text-lg text-[#1e1e21]";
      h.textContent = item.title;
      box.appendChild(h);

      let p = null;
      function openParagraph() {
        p = document.createElement("p");
        p.className = "text-sm text-gray-600 mt-1 leading-relaxed";
        box.appendChild(p);
      }
      openParagraph();

      (item.bodyLines || []).forEach((line) => {
        const embedUrl = /^https?:\/\/\S+$/.test(line) ? youtubeEmbedUrl(line) : null;
        if (embedUrl) {
          // YouTubeの単独URL行は動画をそのまま埋め込む
          const wrap = document.createElement("div");
          wrap.className = "mt-3 max-w-md aspect-video rounded-lg overflow-hidden bg-black";
          const iframe = document.createElement("iframe");
          iframe.src = embedUrl;
          iframe.title = item.title;
          iframe.loading = "lazy";
          iframe.className = "w-full h-full";
          iframe.setAttribute("frameborder", "0");
          iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
          // 必要最小限の権限のみ許可(自動再生・端末センサー等は付与しない)
          iframe.setAttribute("allow", "encrypted-media; picture-in-picture; fullscreen");
          iframe.allowFullscreen = true;
          wrap.appendChild(iframe);
          box.appendChild(wrap);
          openParagraph(); // 埋め込みの後に続く行のため、新しい段落を始める
          return;
        }
        if (p.childNodes.length) p.appendChild(document.createElement("br"));
        if (/^https?:\/\/\S+$/.test(line)) {
          // 単独URL行(YouTube以外)は「詳しく見る」リンクにする(本文中の好きな位置に置ける)
          const a = document.createElement("a");
          a.href = line;
          a.target = "_blank";
          a.rel = "noopener";
          a.className = "inline-block mt-1 font-bold text-[#c8102e] hover:underline";
          a.textContent = "詳しく見る →";
          p.appendChild(a);
        } else {
          appendTextWithLinks(p, line);
        }
      });
      if (!p.childNodes.length) p.remove();
      article.appendChild(box);
      list.appendChild(article);
    });
  }

  function isNewsTxt(name) {
    return /\.txt$/i.test(name) && !/^readme/i.test(name);
  }

  // まず同一オリジンの静的な一覧(news/list.json)を読む。GitHub APIの
  // レート制限に左右されず確実に読める。無い場合のみ API にフォールバック。
  function fromManifest() {
    return fetch("news/list.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((names) => (Array.isArray(names) ? names.filter(isNewsTxt) : null))
      .catch(() => null);
  }

  function fromApi() {
    return fetch(API_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((files) =>
        Array.isArray(files)
          ? files.filter((f) => f.type === "file" && isNewsTxt(f.name)).map((f) => f.name)
          : null
      )
      .catch(() => null);
  }

  fromManifest()
    .then((names) => (names && names.length ? names : fromApi()))
    .then((names) => {
      if (!names || !names.length) return null;
      const ordered = names.slice().sort((a, b) => b.localeCompare(a, "ja"));
      return Promise.all(
        ordered.map((name) =>
          fetch("news/" + encodeURIComponent(name))
            .then((r) => r.arrayBuffer())
            .then((buf) => parseItem(name, decodeText(buf)))
        )
      );
    })
    .then((items) => {
      const valid = (items || []).filter(Boolean);
      render(valid.length ? valid : FALLBACK);
    })
    .catch(() => render(FALLBACK));
})();
