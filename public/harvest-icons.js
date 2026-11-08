import { html } from './ui.js';
import { harvestItems } from './harvest-rewards.js';

export function harvestIcon(id) {
  const item = harvestItems.find(item => item.id === id);
  if (!item) return null;
  if (item.emoji) return html`<span>${item.emoji}</span>`;
  const color = item.color;
  const shape =
    item.shape === 'apple'
      ? html`<path d="M16 9C2 0 1 19 6 27q4 6 10 2 6 4 10-2C32 19 30 0 16 9Z" fill="${color}"/><path d="M16 10q-2-6 1-9" fill="none" stroke="#865e43" stroke-width="2"/><path d="M17 7Q20 0 28 3 24 10 17 7" fill="#78ae59"/>`
      : item.shape === 'carrot'
        ? html`<path d="M12 11 5 29Q4 31 7 29L23 17Q25 12 20 10Z" fill="${color}"/><path d="m18 11 1-8m1 8 7-6m-7 8 10-1" stroke="#71ac54" stroke-width="3"/><path d="m12 17 4 2m-7 4 3 1" stroke="#79584a" opacity=".4"/>`
        : item.shape === 'pansy'
          ? html`<ellipse cx="10" cy="10" rx="7" ry="8" fill="${color}"/><ellipse cx="22" cy="10" rx="7" ry="8" fill="${color}"/><ellipse cx="8" cy="20" rx="7" ry="6" fill="${color}"/><ellipse cx="24" cy="20" rx="7" ry="6" fill="${color}"/><ellipse cx="16" cy="24" rx="9" ry="7" fill="${color}"/><path d="m8 15 8 5 8-5-5 11h-6Z" fill="#4e2d6b"/><circle cx="16" cy="18" r="3" fill="#ffdc61"/>`
          : item.shape === 'lily'
            ? html`<path d="m16 17-5-15 8 4 1 9 10-9-2 12-9 3 7 9-12-4-2-8L2 24l2-11 10 2Z" fill="${color}"/><path d="m16 17-1 8m1-8 8 1m-8-1-6-7" stroke="#f9dc70" stroke-width="2"/><circle cx="16" cy="17" r="3" fill="#76522f"/>`
            : item.shape === 'berry'
              ? html`<path d="M5 11Q16 4 27 11Q29 19 16 30 3 20 5 11Z" fill="${color}"/><path d="m16 11-9-7 9 3 8-5-3 7 7 1Z" fill="#69a34c"/>${[
                  [10, 14],
                  [20, 14],
                  [15, 18],
                  [22, 19],
                  [10, 20],
                  [16, 25]
                ].map(([x, y]) => html`<ellipse cx="${x}" cy="${y}" rx="1" ry="1.5" fill="#c45158"/>`)}`
              : html`<path d="M16 8C2 0-3 24 10 29q6 4 13 0C36 21 30 0 16 8Z" fill="${color}"/><path d="M16 9q-4 9 0 17" fill="none" stroke="#d78099" stroke-width="1.5"/><path d="M16 8Q17 0 28 3 25 11 16 8" fill="#78ae59"/>`;
  return html`<svg class="harvest-icon" viewBox="0 0 32 32" aria-hidden="true">${shape}</svg>`;
}
