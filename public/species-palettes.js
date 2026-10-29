import { html } from './ui.js';
import { zonePalettePicker } from './zone-palettes.js';
import { speciesPaletteNames } from './species-palette-rules.js';

export function speciesPalettesPanel(species, catalog) {
  return html`<form id="species-palettes-form" class="panel" data-id="${species.id}"><div class="panel-heading"><h2>${species.name} Palettes</h2></div><p>These palettes apply in every zone. Each zone adds its own selected palettes.</p>${zonePalettePicker(catalog, speciesPaletteNames(species, catalog))}<div class="form-actions"><button class="button primary" type="submit">Save Palettes</button><button class="button secondary" type="reset">Cancel Changes</button></div></form>`;
}
