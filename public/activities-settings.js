import { html, raw } from './ui.js';
import { activitySettings } from './foraging-engine.js';
export function activitiesSettingsPage(state) {
  const settings = activitySettings(state.settings.activities);
  return String(
    html`<div class="page-heading"><h1>Activities Settings</h1></div><form id="activities-settings-form" class="panel"><h2>Wilds Foraging</h2><label>Grid size (rows and columns)<input type="number" name="gridSize" min="4" max="16" required value="${settings.gridSize}"></label><label>Seconds added per captured ingredient<input type="number" name="secondsPerItem" min="0" max="60" step="0.1" required value="${settings.secondsPerItem}"></label><label><input type="checkbox" name="noTimer" ${settings.noTimer ? raw('checked') : ''}> No timer</label><label>Random foods per round<input type="number" name="foodCount" min="1" max="5" required value="${settings.foodCount}"></label><p>Changes apply to the next forage. Timer-free rounds end with Finish Foraging.</p><button class="button primary" type="submit">Save Activities Settings</button></form>`
  );
}
