document.addEventListener('DOMContentLoaded', function() {
  const heroTitle = document.getElementById('heroTitle');

  if (!heroTitle) return;

  const text = heroTitle.textContent;
  heroTitle.textContent = '';

  const delay = 80;

  text.split('').forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.animationDelay = (index * delay) + 'ms';
    heroTitle.appendChild(span);
  });
});
