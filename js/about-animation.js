document.addEventListener('DOMContentLoaded', function() {
  // ギャラリーアイテムのスクロール時アニメーション
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (galleryItems.length > 0) {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // 各要素に異なるディレイを設定
          const delay = index * 100; // 100ms ずつディレイ
          setTimeout(() => {
            entry.target.classList.add('in-view');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    galleryItems.forEach(item => {
      observer.observe(item);
    });
  }

  // スクロール時にヘッダーに影を追加
  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 0) {
        header.classList.add('shadow-sm');
      } else {
        header.classList.remove('shadow-sm');
      }
    });
  }
});
