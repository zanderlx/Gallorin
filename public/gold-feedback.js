import { number } from './ui.js';

// Kept outside the header so rendering a new balance cannot dismiss the feedback.
export function createGoldFeedback() {
  let popup, timer, animation;
  const position = () => {
    if (!popup || popup.hidden) return;
    const balance = document.querySelector('.gold-balance');
    if (!balance) {
      popup.hidden = true;
      return;
    }
    const bounds = balance.getBoundingClientRect();
    popup.style.top = bounds.bottom + 8 + 'px';
    popup.style.setProperty('--gold-travel', -bounds.height / 2 - 8 - popup.offsetHeight / 2 + 'px');
    popup.style.left =
      Math.max(8, Math.min(innerWidth - popup.offsetWidth - 8, bounds.left + (bounds.width - popup.offsetWidth) / 2)) +
      'px';
  };
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, { passive: true });
  return amount => {
    if (!Number.isFinite(amount) || amount === 0) return;
    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'gold-change';
      popup.setAttribute('role', 'status');
      popup.setAttribute('aria-live', 'polite');
      document.body.append(popup);
    }
    popup.textContent = (amount > 0 ? '+' : '−') + number(Math.abs(amount)) + ' gold';
    popup.dataset.direction = amount > 0 ? 'gain' : 'loss';
    animation?.cancel();
    popup.hidden = false;
    position();
    requestAnimationFrame(position);
    animation = popup.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        {
          opacity: 0,
          transform: matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'translateY(0)'
            : 'translateY(var(--gold-travel))'
        }
      ],
      { delay: 1500, duration: 750, easing: 'ease-in', fill: 'forwards' }
    );
    clearTimeout(timer);
    timer = setTimeout(() => {
      popup.hidden = true;
    }, 2250);
  };
}
