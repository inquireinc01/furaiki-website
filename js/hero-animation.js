document.addEventListener('DOMContentLoaded', function() {
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');

  if (!heroTitle) return;

  const delay = 80;
  const text = heroTitle.textContent;
  heroTitle.textContent = '';

  text.split('').forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.animationDelay = (index * delay) + 'ms';
    heroTitle.appendChild(span);
  });

  if (!heroSubtitle) return;

  // サブタイトルもタイトルに続けて1文字ずつ左から浮かび上がらせる
  const subText = heroSubtitle.textContent;
  const subStart = text.length * delay;
  const subDelay = 40;
  heroSubtitle.textContent = '';

  subText.split('').forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? ' ' : char;
    span.style.animationDelay = (subStart + index * subDelay) + 'ms';
    heroSubtitle.appendChild(span);
  });

  // タイトル「災害ラガーボランティア」と同じ横幅になるようフォントサイズを調整
  function matchWidth() {
    heroSubtitle.style.fontSize = '';
    const titleW = heroTitle.getBoundingClientRect().width;
    const subW = heroSubtitle.getBoundingClientRect().width;
    if (titleW > 0 && subW > 0) {
      const current = parseFloat(getComputedStyle(heroSubtitle).fontSize);
      heroSubtitle.style.fontSize = (current * titleW / subW) + 'px';
    }
  }
  matchWidth();
  window.addEventListener('resize', matchWidth);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(matchWidth);
  }
});
