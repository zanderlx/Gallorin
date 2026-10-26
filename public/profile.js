import { profileLayout } from './profile-layout.js';
import { horseGenderIcon } from './gender-icon.js';
import { horseSalePrice } from './sale-pricing.js';
import { horseCardRank } from './horse-rank.js';
import { raritySettings } from './rarity-settings.js';
import { horseTraits } from './horse-traits.js';
import { escapeHTML as e, icon, number } from './ui.js';
import { displayBirthday, horseAcquisitionDate, horseAgeLabel } from './dates.js';

export function profileContent(horse, state, { importPreview = false, catalog } = {}) {
  const rank = horseCardRank(horse, catalog);
  const rankColor = raritySettings(catalog).colors[rank.key];
  const collected = state.horses.some(h => h.id === horse.id);
  const editField = field =>
    state.settings.developerEditMode
      ? `<button class="icon-button horse-field-pencil" data-copy-skip data-action="edit-horse-field" data-id="${horse.id}" data-field="${field}" aria-label="Edit ${field}">&#9998;</button>`
      : '';
  const sold = state.sold.some(h => h.id === horse.id);
  const header = `<div class="dialog-top">${sold ? '<span class="eyebrow">FROM THE ARCHIVES</span>' : ''}<button class="icon-button" data-action="close-profile" aria-label="Close horse profile">${icon('close')}</button></div>`;
  const info = `<div class="horse-name-row" data-copy-skip><h2 id="profile-title" tabindex="0"><span class="horse-gender ${state.settings.developerEditMode ? 'is-editable' : ''}"><span class="horse-gender-label" role="img" aria-label="${horse.gender === 'Female' ? 'Female' : 'Male'}">${horseGenderIcon(horse.gender)}</span>${editField('gender')}</span>${collected ? `<button class="horse-name-text" data-action="rename-horse" data-id="${horse.id}" aria-label="Rename horse">${e(horse.name || horse.species)}</button>` : e(horse.name || horse.species)}</h2></div><p class="muted horse-species-gender" data-copy-skip><span>${e(horse.species)}</span></p>
  <dl class="horse-facts">${[
    ['Age', horseAgeLabel(horse)],
    ['Origin', horse.origin],
    ['Size', `${horse.size} (${horse.sizePercent}%)`],
    ['Birthday', horseAcquisitionDate(horse) ? displayBirthday(horseAcquisitionDate(horse)) : 'Not caught yet'],
    ['Personality', horse.personality.name],
    ['Rarity', rank.label]
  ]
    .map(
      ([label, value]) =>
        `<div><dt data-copy-key="fact.${label.toLowerCase().replaceAll(' ', '-')}">${label}</dt><dd><span${label === 'Rarity' && rankColor ? ` style="color:${rankColor}"` : ''}>${e(value)}</span>${label === 'Rarity' || label === 'Age' || (label === 'Birthday' && !horse.caughtAt) ? '' : editField(label.toLowerCase())}</dd></div>`
    )
    .join('')}</dl>`;
  const notes = `${importPreview ? `<section class="horse-notes"><h3>Notes</h3><div class="horse-text-display">${e(horse.notes || '')}</div></section>` : collected ? `<section class="horse-notes"><h3 data-copy-key="notes.heading">Notes</h3><button type="button" class="horse-text-display" data-copy-skip data-action="edit-horse-text" data-form="horse-notes-form" aria-label="Edit notes">${e(horse.notes || '') || '<span class="muted empty-horse-notes">Click to add notes</span>'}</button><form hidden id="horse-notes-form" data-id="${horse.id}" data-copy-skip><textarea aria-label="Notes" id="horse-notes" name="notes" rows="5" maxlength="4000" placeholder="Write notes about this horse...">${e(horse.notes || '')}</textarea></form></section>` : `<section class="horse-notes horse-wild-description"><h3 data-copy-key="personality.heading">Description</h3><p class="horse-text-display" data-copy-skip>${e(horse.personalityDescription ?? horse.personality.description ?? '')}</p></section>`}`;
  const colors = `<h3 class="profile-palette-heading" data-copy-key="colors.heading">Palette</h3><div class="color-regions">${Object.entries(
    horse.palette.colors
  )
    .map(
      ([name, color]) =>
        `<div><span style="background:${color}" title="${color}"></span><small>${e(name)}</small><code>${color}</code></div>`
    )
    .join('')}</div>`;
  const traits = `${horseTraits(horse, editField)}`;
  const mutations = `<div class="horse-mutations-heading"><h3>Mutations</h3></div>${`<ol class="horse-mutations mutation-slots" data-copy-skip>${Array.from(
    { length: 4 },
    (_, index) => {
      const mutation = horse.mutations?.[index];
      return `<li class="mutation-slot ${mutation ? '' : 'is-empty'}">${mutation ? `<div class="mutation-slot-text"><strong>${e(typeof mutation === 'string' ? mutation : mutation.name)}</strong>${typeof mutation === 'object' && mutation.description ? `<span class="mutation-description">: ${e(mutation.description)}</span>` : ''}</div>` : `<span class="mutation-slot-lock" role="img" aria-label="Locked mutation slot">${icon('lock')}</span>`}</li>`;
    }
  ).join('')}</ol>`}`;
  const actions = `<div class="profile-actions ${importPreview ? 'import-preview-actions' : ''}">${importPreview ? '<button type="button" class="button secondary" data-action="cancel-import">Cancel Import</button><button type="button" class="button primary" data-action="confirm-import">Import</button>' : sold ? `<span class="gold-text">Sold for ${number(horse.soldFor)} gold · ${e(new Date(horse.soldAt).toLocaleDateString())}</span>` : `${collected ? '' : `<button class="button primary" data-action="catch" data-id="${horse.id}">${icon('stable')} Tame</button>`}${collected ? `<button class="button secondary horse-export" data-action="export-horse" data-id="${horse.id}" title="Export Horse" aria-label="Export Horse">${icon('upload')}</button><button class="button secondary" data-action="sell" data-id="${horse.id}">${icon('coin')} Sell for ${number(horseSalePrice(horse, state.settings).total)} gold</button>` : ''}`}${sold ? `<button class="text-button" data-action="delete-horse" data-id="${horse.id}">Delete Horse</button>` : ''}</div>`;
  return profileLayout(horse, {
    header,
    info,
    notes,
    colors,
    traits,
    mutations,
    actions,
    importPreview,
    editableSkills: collected && !importPreview && state.settings.developerEditMode
  });
}
