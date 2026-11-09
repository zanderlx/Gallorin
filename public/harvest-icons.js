import { html } from './ui.js';
import { harvestItems } from './harvest-rewards.js';

export function harvestIcon(id) {
  const item = harvestItems.find(item => item.id === id);
  if (!item) return null;
  return html`<span class="harvest-emoji" style="filter:${item.filter || 'none'}">${item.emoji}</span>`;
}
