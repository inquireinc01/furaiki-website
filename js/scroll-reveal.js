// スクロールで要素が下からふわっとフェードインする演出。
// class="reveal" を付けた要素を監視し、画面に入ったら in-view を付与する。
// (CSSの .reveal / .reveal.in-view は css/style.css で定義済み)
document.addEventListener("DOMContentLoaded", function () {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in-view"));
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
    { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
});
