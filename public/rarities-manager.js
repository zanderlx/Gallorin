import {icon} from './ui.js';
import {colorControl} from './library-editor.js';
import {rarityNames,raritySettings,defaultRaritySettings} from './rarity-settings.js';

export function raritiesManagerPage(catalog) {
  const {colors,glow} = raritySettings(catalog);
  return `<div class="definitions-header"><h1 class="manager-heading">Rarity Manager</h1></div><form id="rarity-settings-form"><div class="rarity-settings-grid">${Object.entries(rarityNames).map(([key,name]) => `<section class="panel rarity-settings-card"><h2>${name}</h2>${colorControl(key,colors[key] || defaultRaritySettings.colors[key] || '#8D949E',name+' color')}<label class="zone-choice"><input type="checkbox" name="enabled:${key}" ${colors[key] ? 'checked' : ''}><span>Border</span></label><label class="zone-choice"><input type="checkbox" name="glow:${key}" ${glow[key] ? 'checked' : ''} ${colors[key] ? '' : 'disabled'}><span>Glow</span></label></section>`).join('')}</div><div role="status" class="form-status"></div><div class="form-actions"><button type="submit" class="button primary">${icon('check')} Save Settings</button><button type="reset" class="button secondary">Cancel Changes</button><button type="button" class="text-button" data-action="default-rarity-colors">Restore Default Colors</button></div></form>`;
}

export function readRaritySettings(form) {
  const values = new FormData(form);
  return {version:1,colors:Object.fromEntries(Object.keys(rarityNames).map(key => [key,values.has(`enabled:${key}`) ? values.get(`color:${key}`) : null])),glow:Object.fromEntries(Object.keys(rarityNames).map(key=>[key,values.has(`enabled:${key}`)&&values.has(`glow:${key}`)]))};
}

export function syncRarityControls(form){
  if(!form)return;
  for(const border of form.querySelectorAll('input[name^="enabled:"]')){
    const glow=form.elements.namedItem('glow:'+border.name.slice('enabled:'.length));
    if(!glow)continue;
    glow.disabled=!border.checked;
    if(glow.disabled)glow.checked=false;
  }
}
