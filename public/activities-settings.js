import { html, raw, icon } from './ui.js';
import { activitySettings } from './foraging-engine.js';
export function activitiesSettingsPage(state) {
  const settings = activitySettings(state.settings.activities);
  return String(html`<div class="settings-section-heading"><h1>Wilds Foraging</h1></div>
 <form id="activities-settings-form" class="panel" novalidate>
 <label class="setting-row"><span><strong>Grid Size</strong><small>Rows and columns in the foraging board (4–16).</small></span><input type="number" name="gridSize" min="4" max="16" step="1" required value="${settings.gridSize}"></label>
 <label class="setting-row"><span><strong>Time per Ingredient</strong><small>Seconds restored per ingredient, in 0.25-second steps (0–60).</small></span><input type="number" name="secondsPerItem" min="0" max="60" step="0.25" required value="${settings.secondsPerItem}"></label>
 <label class="setting-row"><span><strong>Timer Total</strong><small>Starting time and maximum refill time in seconds (1–3600). Default: 60.</small></span><input type="number" name="totalSeconds" min="1" max="3600" step="1" required value="${settings.totalSeconds}"></label>
 <label class="setting-row"><span><strong>No Timer</strong><small>Play at your own pace and use Finish Foraging to end the round.</small></span><input class="toggle" type="checkbox" name="noTimer" ${settings.noTimer ? raw('checked') : ''}></label>
 <label class="setting-row"><span><strong>Foods per Round</strong><small>Number of randomly chosen ingredient types available in each forage (1–5).</small></span><input type="number" name="foodCount" min="1" max="5" step="1" required value="${settings.foodCount}"></label>
 <div id="activities-settings-status" role="status" class="form-status"></div><div class="form-actions"><button class="button primary" type="submit">${raw(icon('check'))} Save Settings</button><button class="button secondary" type="reset">Cancel Changes</button><button class="text-button" type="button" data-action="defaults">Load Defaults</button></div></form>`);
}
