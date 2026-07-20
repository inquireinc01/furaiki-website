// トップページ メインビジュアルの常設3行(.hero-lines)を、無数の光の粒
// (一部はラグビーボール形のアクセント粒)が周囲から集まってきて文字を
// 形作るように表示する演出。導入3行(.hero-intro)が消えるタイミング
// (css/style.css の 9.1s)に合わせて発火する。
// JS未対応・prefers-reduced-motion時は何もせず、css/style.css側の
// 通常のふわっとフェード表示(heroFinalFadeIn)がそのまま効く。
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const container = document.querySelector(".hero-lines");
  if (!container || !window.requestAnimationFrame) return;

  // 導入(.hero-intro)がふわっと消えて常設3行に切り替わるタイミングと合わせる
  const TRIGGER_DELAY_MS = 9100;
  const GATHER_DURATION_MS = 1300;
  const MAX_STAGGER_MS = 350;
  const MAX_PARTICLES = 1300;
  const BALL_RATIO = 0.07; // ラグビーボール形のアクセント粒の割合

  // CSS側の通常フェード(heroFinalFadeIn)と競合しないよう、この演出専用の
  // 表示制御に切り替える(JSが動かない/失敗した場合は元のCSSアニメーションのまま)
  container.style.animation = "none";
  container.style.opacity = "0";

  function revealPlainText() {
    // 何らかの理由で演出が組み立てられない場合の保険(必ず文字は表示する)
    container.style.transition = "opacity 0.6s ease";
    container.style.opacity = "1";
  }

  function run() {
    const lines = [...container.querySelectorAll(".hero-line")];
    if (!lines.length) {
      revealPlainText();
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvas = document.createElement("canvas");
    canvas.className = "hero-particle-canvas";
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    container.insertAdjacentElement("beforebegin", canvas);
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    // 1) 各行の実際のフォント・位置に合わせて、オフスクリーンに文字を描く
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const offCtx = off.getContext("2d");
    offCtx.scale(dpr, dpr);
    offCtx.fillStyle = "#fff";
    offCtx.textBaseline = "middle";
    offCtx.textAlign = "center";
    lines.forEach((el) => {
      const lr = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const cx = lr.left - rect.left + lr.width / 2;
      const cy = lr.top - rect.top + lr.height / 2;
      offCtx.font = cs.fontWeight + " " + parseFloat(cs.fontSize) + "px " + cs.fontFamily;
      offCtx.fillText(el.textContent, cx, cy);
    });

    // 2) 文字部分の画素をサンプリングし、粒子の目標地点にする
    let data;
    try {
      data = offCtx.getImageData(0, 0, off.width, off.height).data;
    } catch (e) {
      revealPlainText();
      canvas.remove();
      return;
    }
    const step = Math.max(2, Math.round(2 * dpr));
    const points = [];
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] > 128) {
          points.push({ x: x / dpr, y: y / dpr });
        }
      }
    }
    if (!points.length) {
      revealPlainText();
      canvas.remove();
      return;
    }

    let targets = points;
    if (targets.length > MAX_PARTICLES) {
      targets = [];
      const used = new Set();
      while (targets.length < MAX_PARTICLES) {
        const idx = Math.floor(Math.random() * points.length);
        if (!used.has(idx)) {
          used.add(idx);
          targets.push(points[idx]);
        }
      }
    }

    // 3) 粒子を生成: 大半は光の粒、一部だけラグビーボール形のアクセント
    const particles = targets.map((t) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 170;
      const isBall = Math.random() < BALL_RATIO;
      return {
        x: t.x + Math.cos(angle) * dist,
        y: t.y + Math.sin(angle) * dist,
        tx: t.x,
        ty: t.y,
        delay: Math.random() * MAX_STAGGER_MS,
        isBall: isBall,
        size: isBall ? 4 + Math.random() * 2.5 : 1 + Math.random() * 1.6,
        rot0: angle + (Math.random() - 0.5) * 1.2,
      };
    });

    canvas.style.opacity = "1";

    function drawGrain(p, x, y, eased) {
      ctx.globalAlpha = 0.2 + 0.8 * eased;
      ctx.fillStyle = "#fff8e6";
      ctx.shadowColor = "rgba(255, 224, 160, 0.9)";
      ctx.shadowBlur = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawBall(p, x, y, eased) {
      const rot = p.rot0 * (1 - eased);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.25 + 0.75 * eased;
      ctx.fillStyle = "#c98a4b";
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = Math.max(0.5, p.size * 0.12);
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.stroke();
      ctx.restore();
    }

    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      let allDone = true;
      particles.forEach((p) => {
        const t = Math.min(1, Math.max(0, (elapsed - p.delay) / GATHER_DURATION_MS));
        if (t < 1) allDone = false;
        const eased = 1 - Math.pow(1 - t, 3);
        const x = p.x + (p.tx - p.x) * eased;
        const y = p.y + (p.ty - p.y) * eased;
        if (p.isBall) {
          drawBall(p, x, y, eased);
        } else {
          drawGrain(p, x, y, eased);
        }
      });
      ctx.globalAlpha = 1;
      if (!allDone) {
        requestAnimationFrame(frame);
      } else {
        canvas.style.transition = "opacity 0.5s ease";
        canvas.style.opacity = "0";
        container.style.transition = "opacity 0.5s ease";
        container.style.opacity = "1";
        setTimeout(() => canvas.remove(), 600);
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
