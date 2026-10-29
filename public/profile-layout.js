import { horseOverrideBadge } from './horse-override-markers.js';
import { horseHeadArt } from './art.js';
import { icon } from './ui.js';
import { readHorseSkills, skillProgress, skillXPRequirements } from './skill-progress.js';

const equipmentSlots = ['Hat', 'Mouth', 'Bridle', 'Saddle', 'Sock', 'Side', 'Tail', 'Flair'];
const skillDefinitions = [
  ['Agility', 'agility', '#EF922B'],
  ['Strength', 'strength', '#59B653'],
  ['Jump', 'jump', '#5FBFF0'],
  ['Bond', 'heart', '#A66DE0'],
  ['Wing', 'wing', '#E879B1']
];
function portrait(horse, suffix) {
  const art = horseHeadArt({ ...horse, id: `${horse.id}-${suffix}` }, true);
  return `<button type="button" class="profile-portrait" data-full-horse title="View Full Horse" aria-label="View full horse illustration">${art}</button>`;
}
function equipment() {
  return `<section class="profile-equipment"><h3>Equipment</h3><dl>${equipmentSlots.map(slot => `<div><span class="equipment-slot" aria-hidden="true">${icon('bag')}</span><div><dt>${slot}</dt><dd>Not equipped</dd></div></div>`).join('')}</dl></section>`;
}
function skills(horse, editable, showOverrideBadges) {
  const values = readHorseSkills(horse.skills);
  return `<section class="profile-skills"><h3>Skills</h3><dl>${skillDefinitions
    .map(([name, symbol, color]) => {
      const progress = skillProgress(values[name.toLowerCase()]);
      return `<div style="--skill-color:${color}"><dt>${icon(symbol)}<span>${name}${horseOverrideBadge(horse, 'skill:' + name.toLowerCase(), showOverrideBadges)}</span></dt><dd class="skill-level-bar" style="--skill-progress:${progress.percent}%" aria-label="${name} ${progress.maxed ? 'maximum level' : `level ${progress.level}`}"><span>${progress.maxed ? 'MAX' : `Lv. ${progress.level}`}</span></dd><dd class="skill-xp">${editable && !progress.maxed ? `<button class="skill-xp-edit" data-action="add-skill-xp" data-id="${horse.id}" data-skill="${name.toLowerCase()}" title="Add ${name} XP" aria-label="Add ${name} XP">+</button>` : ''}${progress.xp}/${progress.maxed ? skillXPRequirements[10] : progress.xpNeeded} XP</dd></div>`;
    })
    .join('')}</dl></section>`;
}
export function profileLayout(
  horse,
  {
    header,
    info,
    notes,
    colors,
    traits,
    mutations,
    actions,
    importPreview,
    editableSkills = false,
    overrideContent,
    showOverrideBadges = false
  }
) {
  const prefix = importPreview ? 'import-horse' : 'horse-profile';
  return `<div class="horse-profile-book">
    <div class="profile-tab-rail" role="tablist" aria-label="Horse profile pages" aria-orientation="vertical" data-copy-skip>
      <button type="button" role="tab" id="${prefix}-overview-tab" aria-controls="${prefix}-overview" aria-selected="true" data-profile-tab="overview" title="Horse Information">${icon('stable')}<span>Info</span></button>
      <button type="button" role="tab" id="${prefix}-appearance-tab" aria-controls="${prefix}-appearance" aria-selected="false" tabindex="-1" data-profile-tab="appearance" title="Colors, Traits & Mutations">${icon('spark')}<span>Traits</span></button>
      ${overrideContent ? `<button type="button" role="tab" id="${prefix}-overrides-tab" aria-controls="${prefix}-overrides" aria-selected="false" tabindex="-1" data-profile-tab="overrides" title="Edit Horse Data">${icon('edit')}<span>Edit</span></button>` : ''}
    </div>
    <div class="profile-scroll-frame">${header}<div class="horse-profile-shell"><section class="profile-tab-panel" id="${prefix}-overview" role="tabpanel" aria-labelledby="${prefix}-overview-tab" data-profile-panel="overview">
      <div class="profile-grid profile-overview-top">${portrait(horse, 'overview')}<div class="profile-info">${info}</div></div>
      <div class="profile-overview-bottom">${equipment()}<div class="profile-notes-skills">${notes}${skills(horse, editableSkills, showOverrideBadges)}</div></div>
    </section>
    <section class="profile-tab-panel" id="${prefix}-appearance" role="tabpanel" aria-labelledby="${prefix}-appearance-tab" data-profile-panel="appearance" hidden inert>
      <div class="profile-grid profile-appearance-top">${portrait(horse, 'appearance')}<div class="profile-palette">${colors}</div></div>
      <div class="profile-lower"><section class="profile-traits"><h3>Traits</h3>${traits}</section><section class="profile-mutations">${mutations}</section></div>
    </section>
    ${overrideContent ? `<section class="profile-tab-panel profile-overrides-panel" id="${prefix}-overrides" role="tabpanel" aria-labelledby="${prefix}-overrides-tab" data-profile-panel="overrides" hidden inert>${overrideContent}</section>` : ''}
  </div>${actions}</div></div>`;
}

export function selectProfileTab(root, key, { focus = false } = {}) {
  const tabs = [...root.querySelectorAll('[data-profile-tab]')];
  if (!tabs.some(tab => tab.dataset.profileTab === key)) return;
  for (const tab of tabs) {
    const active = tab.dataset.profileTab === key;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  }
  for (const panel of root.querySelectorAll('[data-profile-panel]')) {
    panel.hidden = panel.dataset.profilePanel !== key;
    panel.inert = panel.hidden;
  }
}
export function bindProfileTabs() {
  document.addEventListener('click', event => {
    const tab = event.target.closest('[data-profile-tab]');
    if (tab) selectProfileTab(tab.closest('.horse-profile-book'), tab.dataset.profileTab);
  });
  document.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-profile-tab]');
    if (!tab || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const root = tab.closest('.horse-profile-book'),
      tabs = [...root.querySelectorAll('[data-profile-tab]')];
    const index = tabs.indexOf(tab),
      previous = ['ArrowUp', 'ArrowLeft'].includes(event.key);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (previous ? -1 : 1) + tabs.length) % tabs.length;
    selectProfileTab(root, tabs[next].dataset.profileTab, { focus: true });
  });
}
