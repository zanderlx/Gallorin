import { html, raw, number, setHTML } from './ui.js';
import { saleModifiers, saleModifierFields } from './sale-pricing.js';
import { defaultItemSalePrices, itemSalePrices } from './item-sales.js';
import { saleHistory } from './economy.js';
import { bindMusicDisclosures } from './music-disclosures.js';

const field = (name, label, value, max = 1000000, step = 1, description = '') =>
  html`<label class="setting-row"><span><strong>${label}</strong>${description ? html`<small>${description}</small>` : ''}</span><input name="${name}" type="number" min="0" max="${max}" step="${step}" value="${value}" required></label>`;
const child = (name, content) =>
  html`<details class="music-playlist" data-playlist><summary>${name}</summary><div class="economy-section-body">${content}</div></details>`;
const section = (name, content) =>
  html`<details class="music-group" data-music-group><summary><h2>${name}</h2><button type="button" class="button secondary" data-music-toggle-folder>Show All</button><span class="music-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></summary><div class="economy-section-body">${content}</div></details>`;
const actions = () =>
  html`<div role="status" class="form-status"></div><div class="form-actions"><button type="submit" class="button primary">Save Settings</button><button type="reset" class="button secondary">Cancel Changes</button><button type="button" class="text-button" data-action="defaults">Load Defaults</button></div>`;
export function economyPage(state) {
  const modifiers = saleModifiers(state.settings),
    prices = itemSalePrices(state.settings);
  const modifierGroup = fields =>
    html`${fields.map(([key, label, description]) => field('saleModifier:' + key, label, modifiers[key], key.endsWith('Bonus') ? 1000000 : 1000, key.endsWith('Bonus') ? 1 : 0.1, description))}`;
  return String(
    html`<div class="settings-section-heading"><h1>Economy Settings</h1></div><form id="gold-form" class="panel economy-gold">${field('gold', 'Current Gold', state.gold, 1000000000)}<div class="form-actions"><button type="submit" class="button primary">Save Gold</button><button type="reset" class="button secondary">Cancel Changes</button></div></form><div class="economy-toolbar"><button type="button" class="button secondary" data-economy-show-all>Show All</button></div><div class="economy-sections">${section('Horse Sale Settings', html`<form id="economy-form" novalidate>${child('Base Horse Price', field('sellingPrice', 'Base Horse Price', state.settings.sellingPrice))}${child('Sale Bonuses', modifierGroup(saleModifierFields.filter(([key]) => key.endsWith('Bonus'))))}${child('Special Multipliers', modifierGroup(saleModifierFields.filter(([key]) => !key.endsWith('Bonus'))))}${actions()}</form>`)}${section('Item Sale Settings', html`<form id="item-sale-form">${Object.keys(defaultItemSalePrices).map(key => child(key.charAt(0).toUpperCase() + key.slice(1), field(key, key.charAt(0).toUpperCase() + key.slice(1) + ' Food Sale Price', prices[key])))}<div role="status" class="form-status"></div><div class="form-actions"><button type="submit" class="button primary">Save Settings</button><button type="reset" class="button secondary">Cancel Changes</button><button type="button" class="text-button" data-item-sale-defaults>Load Defaults</button></div></form>`)}${section('Sale History', html`<div id="economy-history">${economyHistory(state)}</div>`)}</div>`
  );
}
export function economyHistory(state, page = 1) {
  const rows = saleHistory(state),
    total = Math.max(1, Math.ceil(rows.length / 10));
  page = Math.max(1, Math.min(total, page));
  return html`<div class="sale-history-scroll"><table aria-label="Sale History"><thead><tr><th>Date</th><th>Item / Horse</th><th>Type / Species</th><th>Gold Earned</th></tr></thead><tbody>${rows.length ? rows.slice((page - 1) * 10, page * 10).map(row => html`<tr><td>${new Date(row.at).toLocaleString()}</td><td>${row.name}</td><td>${row.species}</td><td>${number(row.amount)}</td></tr>`) : html`<tr><td colspan="4">No sales yet.</td></tr>`}</tbody></table></div><div class="economy-pagination"><button type="button" class="button secondary" data-history-page="${page - 1}" ${page === 1 ? raw('disabled') : ''}>Previous</button><span role="status">Page ${page} of ${total}</span><button type="button" class="button secondary" data-history-page="${page + 1}" ${page === total ? raw('disabled') : ''}>Next</button></div>`;
}
export function bindEconomy(root, state, { action, render, notify }) {
  const controller = new AbortController();
  const { signal } = controller;
  root.addEventListener(
    'click',
    event => {
      const button = event.target.closest('[data-music-toggle-folder]');
      const folder = button?.closest('[data-music-group]');
      if (!folder || folder.querySelector('[data-playlist]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      folder.open = !folder.open;
    },
    { capture: true, signal }
  );
  bindMusicDisclosures(root, signal, { nativeSummaries: true });
  root.addEventListener(
    'invalid',
    event => {
      let details = event.target.closest('details');
      while (details) {
        details.open = true;
        details = details.parentElement?.closest('details');
      }
    },
    { capture: true, signal }
  );
  const refresh = () => {
    const button = root.querySelector('[data-economy-show-all]');
    const all = [...root.querySelectorAll('.economy-sections details')].every(details => details.open);
    button.textContent = all ? 'Hide All' : 'Show All';
    button.setAttribute('aria-expanded', String(all));
  };
  root.addEventListener('toggle', refresh, { capture: true, signal });
  root.addEventListener(
    'click',
    event => {
      if (event.target.closest('[data-economy-show-all]')) {
        const details = [...root.querySelectorAll('.economy-sections details')];
        const open = !details.every(details => details.open);
        details.forEach(details => {
          details.open = open;
        });
        refresh();
      }
      const page = event.target.closest('[data-history-page]');
      if (page)
        setHTML(root.querySelector('#economy-history'), economyHistory(state, Number(page.dataset.historyPage)));
      if (event.target.closest('[data-item-sale-defaults]')) {
        const form = root.querySelector('#item-sale-form');
        for (const [key, value] of Object.entries(defaultItemSalePrices)) form.elements.namedItem(key).value = value;
      }
    },
    { signal }
  );
  root.querySelector('#item-sale-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    if (!form.reportValidity()) return;
    const button = form.querySelector('[type=submit]');
    if (button.disabled) return;
    button.disabled = true;
    try {
      const prices = Object.fromEntries(
        Array.from(new FormData(form).entries()).map(([key, value]) => [key, Number(value)])
      );
      await action('item-sale-settings', { prices });
      render();
      notify('Item sale settings saved.');
    } catch (error) {
      notify(error.message, true);
      button.disabled = false;
    }
  });
  return () => controller.abort();
}
