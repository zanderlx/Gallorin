import { html } from './ui.js';
import { icon } from './ui.js';
import { saleHistoryTable } from './economy.js';
import { saleModifiers, saleModifierFields } from './sale-pricing.js';

function settingForm(state, economy = false, catalog) {
  const s = state.settings;
  const id = economy ? 'economy' : 'settings';
  return `<form id="${id}-form" class="panel" novalidate>
  ${
    economy
      ? `<label class="setting-row"><span><strong>Current Gold</strong><small>Your saved balance, shown in the header.</small></span><input name="gold" type="number" min="0" max="1000000000" step="1" value="${state.gold}" required></label>
  <label class="setting-row"><span><strong>Base Horse Price</strong><small>Base price before feature bonuses and multipliers.</small></span><input name="sellingPrice" type="number" min="0" max="1000000" value="${s.sellingPrice}" required></label>
  <h3 class="sale-modifiers-heading">Sale Price Modifiers</h3><p class="sale-price-formula">(Base Price + Trait Bonuses + Mutation Bonuses + Skill Bonuses + Wing Bonuses) × Special Multiplier</p>
  ${saleModifierFields.map(([key, label, description]) => `<label class="setting-row"><span><strong>${label}</strong><small>${description}</small></span><input name="saleModifier:${key}" type="number" min="0" max="${key.endsWith('Bonus') ? 1000000 : 1000}" step="${key.endsWith('Bonus') ? 1 : '0.1'}" value="${saleModifiers(s)[key]}" required></label>`).join('')}
`
      : `<label class="setting-row"><span><strong>Horses Per Search</strong><small>How many companions appear in a new clearing (1–12).</small></span><input name="horsesPerSearch" type="number" min="1" max="12" value="${s.horsesPerSearch}" required></label>
  <label class="setting-row"><span><strong>Enable Search Cooldown</strong><small>Wait between searches. Tamed or sold horses are still replaced.</small></span><input class="toggle" name="searchCooldownEnabled" type="checkbox" ${s.searchCooldownEnabled ? 'checked' : ''}></label>
  <label class="setting-row"><span><strong>Search Cooldown (Seconds)</strong><small>Delay between searches across all zones (1–86400 seconds).</small></span><input name="searchCooldownSeconds" type="number" min="1" max="86400" step="1" value="${s.searchCooldownSeconds ?? 90}" required></label>
  <label class="setting-row"><span><strong>Stable Capacity</strong><small>Maximum companions when the limit is enabled.</small></span><input name="stableCapacity" type="number" min="1" max="10000" value="${s.stableCapacity}" required></label>
  <label class="setting-row"><span><strong>Ignore Stable Capacity</strong><small>Allow new horses beyond the stable limit.</small></span><input class="toggle" name="ignoreStableLimit" type="checkbox" ${s.ignoreStableLimit ? 'checked' : ''}></label>
  <label class="setting-row"><span><strong>Override Horse Data</strong><small>Enable the Edit tab on horses in My Horses.</small></span><input class="toggle" name="horseUpdatesEnabled" type="checkbox" ${s.horseUpdatesEnabled ? 'checked' : ''}></label>`
  }
  <div id="${id}-status" role="status" class="form-status"></div><div class="form-actions"><button class="button primary" type="submit">${icon('check')} Save Settings</button><button class="button secondary" type="reset">Cancel Changes</button><button class="text-button" type="button" data-action="defaults">Load Defaults</button></div></form>`;
}

// Validate before converting values: Number('') would otherwise silently become zero.
export function validateSettingsNumbers(form) {
  for (const input of form.querySelectorAll('input[type="number"]')) {
    if (input.value.trim() && Number.isFinite(input.valueAsNumber) && input.validity.valid) continue;
    input.focus();
    const label = input.closest('label')?.querySelector('strong')?.textContent || 'Value';
    throw new Error(`${label}: ${input.validationMessage || 'Enter a valid number.'}`);
  }
}

function safelyChecked(state) {
  return state.settings.providedHorseArtwork ? 'checked' : '';
}

export function gameSettingsPage(state, catalog) {
  return `<div class="settings-section-heading"><h1>Encounter & Stable Settings</h1></div>
  ${html`<label class="setting-row panel"><span><strong>Use Provided SVG Artwork</strong><small>Switch instantly between the original supplied artwork and the current trait-based model.</small></span><input class="toggle" id="provided-horse-artwork" type="checkbox" ${safelyChecked(state)}></label>`}
  ${settingForm(state, false, catalog)}
  <section class="economy-settings" aria-labelledby="economy-heading"><h2 id="economy-heading">Economy Settings</h2>
  ${settingForm(state, true)}</section>${saleHistoryTable(state)}`;
}

// Keep label clicks from opening numeric editing; steppers live inside the field.
export function attachSettingsNumbers(root) {
  for (const input of root.querySelectorAll(':is(#settings-form,#economy-form) input[type="number"]')) {
    if (input.closest('.settings-number')) continue;
    const label = input.closest('label');
    const name = label.querySelector('strong').textContent;
    input.setAttribute('aria-label', name);
    const field = document.createElement('span');
    field.className = 'settings-number';
    input.before(field);
    field.append(input);
    const fitValue = () => field.style.setProperty('--number-digits', Math.max(3, input.value.length));
    fitValue();
    input.addEventListener('input', fitValue);
    const controls = document.createElement('span');
    controls.className = 'settings-number-steps';
    for (const [direction, text] of [
      [1, 'Increase'],
      [-1, 'Decrease']
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = direction === 1 ? '▴' : '▾';
      button.setAttribute('aria-label', text + ' ' + name);
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => {
        input.focus();
        if (direction === 1) input.stepUp();
        else input.stepDown();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      controls.append(button);
    }
    field.append(controls);
    label.addEventListener('click', event => {
      if (!field.contains(event.target)) event.preventDefault();
    });
    input.addEventListener('wheel', event => event.preventDefault(), { passive: false });
  }
}
