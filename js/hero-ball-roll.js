// トップページ メインビジュアルの常設3行(.hero-lines)を、大きな
// ラグビーボールが左から転がってきて、通り過ぎた分だけ文字が現れる
// (ワイプ)ように表示する演出。導入3行(.hero-intro)が消えるタイミング
// (css/style.css の 9.1s)に合わせて発火する。
// JS未対応・prefers-reduced-motion時は何もせず、css/style.css側の
// 通常のふわっとフェード表示(heroFinalFadeIn)がそのまま効く。
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const container = document.querySelector(".hero-content");
  const textEl = document.querySelector(".hero-lines");
  if (!container || !textEl || !window.requestAnimationFrame) return;

  // 導入(.hero-intro)がふわっと消えて常設3行に切り替わるタイミングと合わせる
  const TRIGGER_DELAY_MS = 9100;
  const ROLL_DURATION_MS = 1600;
  const LEAD_RATIO = 0.6; // ボールの幅に対する、文字の外側での助走・抜け余白の比率

  // CSS側の通常フェード(heroFinalFadeIn)と競合しないよう、この演出専用の
  // 表示制御に切り替える(JSが動かない/失敗した場合は元のCSSアニメーションのまま)
  textEl.style.animation = "none";
  textEl.style.opacity = "0";
  textEl.style.clipPath = "inset(0 100% 0 0)";

  function revealPlainText() {
    textEl.style.clipPath = "none";
    textEl.style.transition = "opacity 0.6s ease";
    textEl.style.opacity = "1";
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function run() {
    const containerRect = container.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();
    const textLeft = textRect.left - containerRect.left;
    const textTop = textRect.top - containerRect.top;
    const textWidth = textRect.width;
    if (!textWidth) {
      revealPlainText();
      return;
    }
    const centerY = textTop + textRect.height / 2;

    const ball = document.createElement("div");
    ball.className = "hero-ball";
    container.appendChild(ball);
    const ballRect = ball.getBoundingClientRect();
    const ballWidth = ballRect.width;
    const ballHeight = ballRect.height;
    const lead = ballWidth * LEAD_RATIO;

    const startX = textLeft - ballWidth - lead;
    const endX = textLeft + textWidth + lead;
    const travel = endX - startX;
    const rotationDeg = (travel / (Math.PI * ballWidth)) * 360;

    ball.style.left = startX + "px";
    ball.style.top = centerY - ballHeight / 2 + "px";

    textEl.style.opacity = "1";

    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / ROLL_DURATION_MS);
      const eased = easeOutCubic(t);
      const dx = travel * eased;
      ball.style.transform = "translateX(" + dx + "px) rotate(" + rotationDeg * eased + "deg)";

      const ballFrontX = startX + dx + ballWidth;
      const reveal = Math.min(1, Math.max(0, (ballFrontX - textLeft) / textWidth));
      textEl.style.clipPath = "inset(0 " + (1 - reveal) * 100 + "% 0 0)";

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        textEl.style.clipPath = "none";
        ball.style.transition = "opacity 0.3s ease";
        ball.style.opacity = "0";
        setTimeout(() => ball.remove(), 400);
      }
    }
    requestAnimationFrame(frame);
  }

  function start() {
    try {
      run();
    } catch (e) {
      revealPlainText();
    }
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(start, TRIGGER_DELAY_MS));
  } else {
    setTimeout(start, TRIGGER_DELAY_MS);
  }
})();
