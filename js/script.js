// ヘッダーのスクロール演出
const header = document.getElementById("site-header");
const onScroll = () => {
  if (!header) return;
  if (window.scrollY > 12) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
};
window.addEventListener("scroll", onScroll);
onScroll();

// モバイルメニューの開閉
const menuButton = document.getElementById("menu-button");
const mobileMenu = document.getElementById("mobile-menu");
const menuIconOpen = document.getElementById("icon-menu-open");
const menuIconClose = document.getElementById("icon-menu-close");

if (menuButton && mobileMenu) {
  menuButton.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuIconOpen?.classList.toggle("hidden", isOpen);
    menuIconClose?.classList.toggle("hidden", !isOpen);
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuIconOpen?.classList.remove("hidden");
      menuIconClose?.classList.add("hidden");
    });
  });
}

// スクロールで要素をフェードイン
const revealTargets = document.querySelectorAll(".reveal");
if (revealTargets.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealTargets.forEach((el) => observer.observe(el));
}

// お問い合わせフォーム（見た目のみ・送信はデモ動作）
const contactForm = document.getElementById("contact-form");
const contactSuccess = document.getElementById("contact-success");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    contactForm.classList.add("hidden");
    contactSuccess?.classList.remove("hidden");
  });
}

// フッターの年号を自動更新
const yearEl = document.getElementById("current-year");
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
