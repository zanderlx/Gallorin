import { horseAcquisitionDate, horseDaysOwned } from './dates.js';
import { html } from './ui.js';

export function horseOverrideValue(horse, key) {
  const [kind, name] = key.split(':');
  if (kind === 'trait') return horse.traits?.[name] || horse.traits?.[name + 's'] || [];
  if (kind === 'mutation') return horse.mutations?.[Number(name)] || null;
  if (kind === 'color') return horse.palette?.colors?.[name] || '';
  if (kind === 'skill') return horse.skills?.[name] || { level: 0, xp: 0 };
  if (key === 'description') return horse.personalityDescription ?? horse.personality?.description ?? '';
  if (key === 'birthday') return horseAcquisitionDate(horse) || horse.birthday || '';
  if (key === 'daysOwned') return horseDaysOwned(horse);
  if (key === 'mutations') return horse.mutations || [];
  return horse[key];
}
export function horseOverrideBadge(horse, key, visible) {
  return visible && Array.isArray(horse.overriddenFields) && horse.overriddenFields.includes(key)
    ? String(html`<span class="horse-override-badge">OVERRIDE</span>`)
    : '';
}
