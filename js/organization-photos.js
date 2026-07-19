// 団体概要ページ: 「これまでの活動実績」の横並び写真(images/org-highlights/)
// kamaishi.jpg / noto.jpg が存在する場合のみ表示する(無ければ何も出さない)。
(function () {
  const wrap = document.getElementById("orgHighlights");
  if (!wrap) return;

  const CANDIDATES = [
    { file: "images/org-highlights/kamaishi.jpg", caption: "2019年 ラグビーW杯釜石開催 スタジアムでのフライキ掲揚" },
    { file: "images/org-highlights/noto.jpg", caption: "能登の被災地での瓦礫撤去活動" },
  ];

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
      fig.innerHTML =
        '<img src="' + c.file + '" alt="' + c.caption + '" class="w-full h-48 object-cover" />' +
        '<figcaption class="text-xs text-gray-500 mt-2">' + c.caption + "</figcaption>";
      wrap.appendChild(fig);
    });
  });
})();
