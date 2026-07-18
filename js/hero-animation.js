document.addEventListener('DOMContentLoaded', function() {
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const heroIntro = document.getElementById('heroIntro');
  const heroFinal = document.getElementById('heroFinal');
  const heroFinalTitle = document.getElementById('heroFinalTitle');

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

  // 最終タイトル「フライキプロジェクト」は導入テキストを覆うサイズに調整し、
  // 最終サブタイトルはそのタイトルと同じ横幅に合わせる
  function fitFinalTitle() {
    if (!heroFinalTitle) return;
    heroFinalTitle.style.fontSize = '';
    const introW = heroIntro.getBoundingClientRect().width;
    const target = Math.min(introW * 1.15, window.innerWidth * 0.92);
    const curW = heroFinalTitle.getBoundingClientRect().width;
    if (target > 0 && curW > 0) {
      const current = parseFloat(getComputedStyle(heroFinalTitle).fontSize);
      heroFinalTitle.style.fontSize = (current * target / curW) + 'px';
    }
    const finalSub = heroFinal.querySelector('.hero-final-subtitle');
    if (finalSub) {
      finalSub.style.fontSize = '';
      const titleW = heroFinalTitle.getBoundingClientRect().width;
      const subW = finalSub.getBoundingClientRect().width;
      if (titleW > 0 && subW > 0) {
        const cur = parseFloat(getComputedStyle(finalSub).fontSize);
        finalSub.style.fontSize = (cur * titleW / subW) + 'px';
      }
    }
  }

  function layout() {
    matchWidth();
    fitFinalTitle();
  }
  layout();
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layout);
  }

  // 演出シーケンス:
  //   導入(1文字ずつ)が終わったら、導入をフェードアウトしつつ
  //   「フライキプロジェクト」を覆いかぶせてフェードイン、最後に説明文をフェードイン
  if (!heroIntro || !heroFinal) return;
  const introDone = subStart + subText.length * subDelay + 600; // 導入の表示完了時刻
  setTimeout(() => {
    heroIntro.classList.add('is-hidden');
    heroFinal.classList.add('is-visible');
  }, introDone + 800);
  setTimeout(() => {
    heroFinal.classList.add('show-sub');
  }, introDone + 3800);
});
