import { horseOverrideBadge } from './horse-override-markers.js';
import { escapeHTML as e } from './ui.js';
import { copyKey } from './page-copy.js';

const categories = [
  ['Pattern', 'Patterns', 4],
  ['Paint', 'Paints', 2],
  ['Cosmetic', 'Cosmetics', 4],
  ['Keratin', 'Keratin', 1],
  ['Ears', 'Ears', 1],
  ['Whiskers', 'Whiskers', 1]
];
const valuesFor = (traits, key) => traits[key] || traits[`${key}s`] || [];
const valuesHTML = values =>
  values.length
    ? values
        .map(
          value =>
            `<span class="${/awaiting species data/i.test(value) ? 'horse-trait-none' : 'horse-trait-tag'}">${e(value)}</span>`
        )
        .join('')
    : '<span class="horse-trait-none">None</span>';

export function horseTraits(horse, editField = () => '', showOverrideBadges = false) {
  const traits = horse.traits || {};
  const badge = key => horseOverrideBadge(horse, key, showOverrideBadges);
  const swatch = (horse.eye.colors || [])
    .filter(color => /^#[0-9a-f]{6}$/i.test(color))
    .map(color => `<span style="background:${color}"></span>`)
    .join('');
  const known = new Set(['Mane', 'Tail', ...categories.flatMap(([key]) => [key, `${key}s`])]);
  const extra = Object.keys(traits)
    .filter(key => !known.has(key))
    .map(key => [key, key, null]);
  return `<dl class="horse-trait-essentials"><div><dt class="horse-eye-label"><span data-copy-key="trait.eye-color">Eye Color</span></dt><dd class="horse-eye-value"><span class="horse-eye-name">${e(horse.eye.name)}${badge('eye')}</span><span class="horse-eye-swatch" aria-hidden="true">${swatch}</span>${editField('eye')}</dd></div>${['Mane', 'Tail'].map(key => `<div><dt data-copy-key="trait.${copyKey(key)}">${key}</dt><dd>${valuesHTML(valuesFor(traits, key))}${badge('trait:' + key)}</dd></div>`).join('')}</dl><dl class="horse-trait-categories">${[
    ...categories,
    ...extra
  ]
    .map(([key, label, max]) => {
      const values = valuesFor(traits, key);
      return `<div class="horse-trait-group" data-horse-trait-category="${e(key)}"><dt><span data-copy-key="trait.${copyKey(key)}">${e(label)}</span>${max ? `<small data-copy-skip>${values.length}/${max}</small>` : ''}</dt><dd>${valuesHTML(values)}${badge('trait:' + key)}</dd></div>`;
    })
    .join('')}</dl>`;
}
