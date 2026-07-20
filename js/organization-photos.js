// 団体概要ページ: 「これまでの活動実績」の横並び写真(images/org-highlights/)
// kamaishi.jpg / noto.jpg が存在する場合のみ表示する(無ければ何も出さない)。
(function () {
  const wrap = document.getElementById("orgHighlights");
  if (!wrap) return;

  const CANDIDATES = [
    { file: "images/org-highlights/kamaishi.jpg", caption: "2019年 ラグビーW杯釜石開催 スタジアムでのフライキ掲揚" },
    { file: "images/org-highlights/noto.jpg", caption: "能登の被災地での瓦礫撤去活動" },
  ];

  // srcset用の軽量版(-480w/-800w)は tools/prepare_photos.py が生成する
  // (images/org-highlights の縮小設定=1600pxがフルサイズの実寸)。
  const SRCSET_WIDTHS = [480, 800];
  const FULL_WIDTH_HINT = 1600;
  function withWidth(url, w) {
    return url.replace(/(\.[a-z0-9]+)$/i, "-" + w + "w$1");
  }
  function buildSrcset(url) {
    return SRCSET_WIDTHS.map((w) => withWidth(url, w) + " " + w + "w")
      .concat([url + " " + FULL_WIDTH_HINT + "w"])
      .join(", ");
  }

  Promise.all(
    CANDIDATES.map(
      (c) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(c);
          img.onerror = () => resolve(null);
          img.src = c.file;
        })
    )
  ).then((results) => {
    results.filter(Boolean).forEach((c) => {
      const fig = document.createElement("figure");
      fig.className = "rounded-lg overflow-hidden reveal";
      const img = document.createElement("img");
      img.src = withWidth(c.file, SRCSET_WIDTHS[0]);
      img.srcset = buildSrcset(c.file);
      img.sizes = "(min-width: 640px) 50vw, 100vw";
      img.alt = c.caption;
      img.loading = "lazy";
      img.className = "w-full h-48 object-cover";
      const caption = document.createElement("figcaption");
      caption.className = "text-xs text-gray-500 mt-2";
      caption.textContent = c.caption;
      fig.appendChild(img);
      fig.appendChild(caption);
      wrap.appendChild(fig);
    });
  });
})();
