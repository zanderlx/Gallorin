import { escapeHTML as e, heading } from './ui.js';
export const avatarColors = [
  { seed: 11, name: 'Gold' },
  { seed: 27, name: 'Sage' },
  { seed: 42, name: 'Rose' },
  { seed: 68, name: 'Orchid' },
  { seed: 93, name: 'Mint' },
  { seed: 125, name: 'Sky' },
  { seed: 187, name: 'Lemon' },
  { seed: 254, name: 'Indigo' },
  { seed: 2, name: 'Violet' },
  { seed: 4, name: 'Teal' },
  { seed: 8, name: 'Coral' },
  { seed: 13, name: 'Berry' }
];
export const avatarPresets = avatarColors.map(color => color.seed);
export function avatarSVG(seed = 11) {
  const hue = (seed * 137) % 360;
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Horsekeeper avatar"><rect width="100" height="100" rx="50" fill="hsl(${hue} 35% 25%)"/><circle cx="50" cy="50" r="43" fill="none" stroke="hsl(${hue} 55% 75%)" stroke-width="2"/><path d="M27 80Q35 61 34 44L43 23 49 36 59 20 62 38 76 55Q82 66 70 69L56 62 55 80Z" fill="hsl(${(hue + 35) % 360} 60% 83%)"/><path d="M43 30Q26 37 26 65L35 58 32 78 44 69 47 42" fill="hsl(${hue} 48% 52%)"/><circle cx="60" cy="48" r="3" fill="#231e29"/><path d="m76 23 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fff5d5"/></svg>`;
}
export function validateKeeper(input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 60)
    throw new Error('Use a profile name of 1–60 characters.');
  if (typeof input.about !== 'string' || input.about.length > 2000)
    throw new Error('About Me must be 2,000 characters or fewer.');
  if (!Number.isInteger(input.avatarSeed) || input.avatarSeed < 0 || input.avatarSeed > 1000000000)
    throw new Error('Choose a valid avatar.');
  return { name: input.name.trim(), about: input.about, avatarSeed: input.avatarSeed };
}
export function keeperPage(state) {
  const keeper = state.keeper || { name: 'Horsekeeper', about: '', avatarSeed: 11 };
  return `${heading('YOUR CORNER OF THE WORLD', 'My Profile', 'A little introduction to the keeper of this sanctuary.')}
  <form id="keeper-form" class="panel"><div class="keeper-intro"><div id="keeper-preview" class="keeper-picture">${avatarSVG(keeper.avatarSeed)}</div><div><h2>${e(keeper.name)}</h2><p>${state.horses.length} companions · ${state.gold.toLocaleString()} gold</p></div></div>
  <label class="zone-field">Display name<input name="name" value="${e(keeper.name)}" maxlength="60" required></label>
  <label class="zone-field">About Me<textarea name="about" maxlength="2000" rows="5" placeholder="Your favorite horses, a little lore, or something about you…">${e(keeper.about)}</textarea></label>
  <fieldset class="zone-pool"><legend>Profile Picture</legend><p>Choose a color for your horse crest. Your selection is saved with your profile.</p><input type="hidden" name="avatarSeed" value="${keeper.avatarSeed}"><div class="avatar-options">${(avatarPresets.includes(keeper.avatarSeed) ? avatarColors : [...avatarColors, { seed: keeper.avatarSeed, name: 'Saved Color' }]).map(({ seed, name }) => `<button type="button" class="avatar-choice" data-action="choose-avatar" data-seed="${seed}" aria-label="${e(name)} avatar" title="${e(name)}" aria-pressed="${seed === keeper.avatarSeed}">${avatarSVG(seed)}</button>`).join('')}</div></fieldset>
  ${state.settings?.developerSettingsVisible === true ? '<label class="setting-row keeper-developer-toggle"><span>Disable Dev Settings</span><input type="checkbox" class="toggle" data-disable-developer-settings></label>' : ''}
  <div class="form-actions"><button class="button primary" type="submit">Save Profile</button><button class="button secondary" type="reset">Cancel Changes</button></div></form>`;
}
