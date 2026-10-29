import { bindTextButtonSounds } from './button-sounds.js';
import { regularEyes, setCosmicEyeDefinitions } from './cosmic-types.js';
import { bindEncounterCooldown } from './encounter-cooldown.js';
import { bindNavigationDisclosures } from './navigation-disclosures.js';
import { createMusicPlayer } from './music-player.js';
import { createChangelog } from './changelog-ui.js';
import { horseUpdatesPage, bindHorseUpdates } from './horse-updates.js';
import { createGoldFeedback } from './gold-feedback.js';
import { openEmojiPicker } from './emoji-picker.js';
import { createDefinitionTransfers } from './definition-transfer.js';
import { createPaletteTransfers } from './palette-transfer.js';
import { palettesManagerPage, createPaletteEditor, updatePaletteGrid } from './palettes-manager.js';
import { updateZonePalettes, syncZonePaletteChoice } from './zone-palettes.js';
import { syncZoneSelectionButtons, setZoneSelection, zoneAllSelected } from './zone-selection.js';
import { handleInvalidHex, validHex, hexInputValue, protectHexSelection } from './hex-inputs.js';
import { defaultSpawnSettings } from './spawn-config.js';
import { validateSettingsNumbers, attachSettingsNumbers } from './game-settings.js';
import { raritiesManagerPage, readRaritySettings, syncRarityControls } from './rarities-manager.js';
import { defaultRaritySettings, rarityNames, raritySettings } from './rarity-settings.js';
import { horseCardRank } from './horse-rank.js';
import { saleQuoteBreakdown } from './sale-quote.js';
import { horseSalePrice, defaultSaleModifiers } from './sale-pricing.js';
import { personalityForm, togglePersonalities } from './personalities-manager.js';
import { closePersonalityEditor } from './personality-editor.js';
import { eyesManagerPage, createEyeEditor, updateEyeGrid, labelEyeColors } from './eyes-manager.js';
import {
  mutationsManagerPage,
  createMutationEditor,
  updateMutationGrid,
  toggleMutations
} from './mutations-manager.js';
import { readTraitsForm, traitRow, syncTraitRows, keepTraitArrowOnLine } from './traits-editor.js';
import {
  speciesManagerPage,
  syncSpeciesControls,
  updateSpeciesSort,
  speciesDeleteConfirmation
} from './species-manager.js';
import { createHorseTransfers } from './horse-transfer-ui.js';
import { startHorseRename } from './horse-inline-name.js';
import { createHorseDialogs } from './horse-dialogs.js';
import { icon, sidebar, navigationSection, escapeHTML as e, number, setHTML, appendHTML, raw } from './ui.js';
import {
  wildPage,
  stablePage,
  collectionCards,
  settingsPage,
  editModePage,
  savesPage,
  plannedPage,
  routeTitle
} from './pages.js';
import { profileContent } from './profile.js';
import { bindProfileTabs, selectProfileTab } from './profile-layout.js';
import { bindHorseArtViewer } from './horse-art-viewer.js';
import { displayBirthday, horseAcquisitionDate } from './dates.js';
import { locationsFor, newZoneDraft, randomZone, validateZone } from './zones.js';
import {
  zoneEditorPage,
  zoneEditorForm,
  createZoneEditor,
  syncZoneEditor,
  updateZoneSpecies,
  applyZonePreset
} from './zone-editor.js';
import { draftDefinition, validateDefinition } from './definitions.js';
import {
  editorRoutes,
  libraryEditorPage,
  readDefinitionForm,
  colorControl,
  applyWebsiteTheme
} from './library-editor.js';
import { createCopyEditor } from './copy-editor.js';
import { keeperPage, avatarSVG } from './keeper.js';
import { roadmapPage } from './roadmap.js';
import { trackForms, updateFormState, formSignature, formBaseline, restoreBaseline } from './form-state.js';

let state,
  catalog,
  defaults,
  appVersion,
  busy = false;
let stableGridColumns = 5;
let selectedSpeciesId,
  speciesTab = 'overview',
  speciesSort = 'rarity',
  speciesSortDirection = 'asc';
let route = location.hash.slice(1) || 'wilds/aetherion';
let routeVersion = 0,
  pendingDeletion;
const openGroups = new Set();
const $ = selector => document.querySelector(selector);
const main = $('#main');
const musicPlayer = createMusicPlayer({
  notify,
  getLocations: () => (catalog && state ? locationsFor(catalog, state) : [])
});
bindTextButtonSounds(
  document,
  () => musicPlayer.playEvent('effect/button-click'),
  error => notify(error.message, true)
);
const openChangelog = createChangelog({
  loadSource: async () => (await request('/api/changelog')).changelog,
  getVersion: () => appVersion
});
document.addEventListener('click', event => {
  if (event.target.closest('#sidebar-changelog')) void openChangelog();
});
bindProfileTabs();
const horseArtViewer = bindHorseArtViewer();
const profile = $('#profile');
const confirmation = $('#confirm');
const personalityCreation = document.createElement('dialog');
personalityCreation.className = 'personality-creation-dialog';
personalityCreation.setAttribute('aria-label', 'Create Personality');
document.body.append(personalityCreation);
personalityCreation.addEventListener('close', () => {
  if (!personalityCreation.open) personalityCreation.replaceChildren();
});
personalityCreation.addEventListener('cancel', event => {
  event.preventDefault();
  closePersonalityEditor(personalityCreation.querySelector('form'), () => personalityCreation.close());
});
const eyeEditor = createEyeEditor(
  draft => libraryEditorPage('eyes', catalog, state, draft),
  () => regularEyes(catalog.eyes)
);
const definitionTransfers = Object.fromEntries(
  ['eyes', 'mutations'].map(kind => [
    kind,
    createDefinitionTransfers(kind, {
      getCatalog: () => catalog,
      openDraft: draft => showDefinition(kind, draft),
      notify
    })
  ])
);
const paletteTransfers = createPaletteTransfers({
  getCatalog: () => catalog,
  openDraft: draft => showDefinition('palettes', { ...draft, imported: true }),
  notify
});
const paletteEditor = createPaletteEditor(draft => libraryEditorPage('palettes', catalog, state, draft));
const mutationEditor = createMutationEditor(draft => libraryEditorPage('mutations', catalog, state, draft));
const zoneEditor = createZoneEditor(draft => zoneEditorForm(catalog, draft));
const copyEditor = createCopyEditor({ getState: () => state, getRoute: () => route, save: action, notify });

bindHorseUpdates({
  root: main,
  getState: () => state,
  getCatalog: () => catalog,
  preview: payload => request('/api/action', { type: 'preview-horse-updates', payload }),
  apply: payload => action('apply-horse-updates', payload),
  enable: enabled => action('horse-updates-enabled', { enabled }),
  onApplied: () => render(),
  notify
});

const profileCopyEditor = createCopyEditor({
  getState: () => state,
  getRoute: () => 'horse/profile',
  save: action,
  notify,
  includeChrome: false,
  getValues: () => {
    const horse = findHorse(profile.dataset.horseId);
    return horse
      ? {
          horseName: horse.name || horse.species,
          species: horse.species,
          gender: horse.gender,
          birthday: horseAcquisitionDate(horse) ? displayBirthday(horseAcquisitionDate(horse)) : 'Not caught yet',
          personality: horse.personality.name,
          personalityDescription: horse.personality.description,
          specialSpawn: horse.specialSpawn || 'No special spawn'
        }
      : {};
  }
});
const horseDialogs = createHorseDialogs({
  getState: () => state,
  getCatalog: () => catalog,
  findHorse,
  save: action,
  notify,
  onSaved: async (id, kind) => {
    if (kind === 'catch') {
      profile.close();
      render();
      main.focus({ preventScroll: true });
    } else {
      render();
      inspect(id);
    }
  }
});
const horseTransfers = createHorseTransfers({
  getCatalog: () => catalog,
  getState: () => state,
  save: action,
  notify,
  onImported: () => {
    render();
  }
});
async function request(path, body) {
  const response = await fetch(
    path,
    body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to save. Please try again.');
  return result;
}
const showGoldChange = createGoldFeedback();
const updateEncounterCooldown = bindEncounterCooldown(
  () => state,
  () => {
    void musicPlayer.playEvent('effect/respawn-ready').catch(error => notify(error.message, true));
  }
);
async function action(type, payload) {
  const result = await request('/api/action', { type, payload });
  const goldChange = result.state.gold - state.gold;
  const previousState = state;
  state = result.state;
  updateEncounterCooldown();
  if (route.startsWith('wilds/'))
    void musicPlayer
      .spawnEffects(previousState, state, route.split('/')[1])
      .catch(error => notify(error.message, true));
  if (type === 'sell') void musicPlayer.playEvent('effect/horse-sold').catch(error => notify(error.message, true));
  showGoldChange(goldChange);
  if (result.catalog) catalog = result.catalog;
  return state;
}
function notify(message, error = false) {
  const toast = document.createElement('div');
  toast.className = `notification-toast ${error ? 'error' : ''}`;
  toast.textContent = message;
  toast.setAttribute('role', error ? 'alert' : 'status');
  $('#toast').append(toast);
  setTimeout(() => toast.remove(), error ? 8000 : 4500);
}
function renderChrome() {
  const navigationScroll = $('#sidebar nav')?.scrollTop ?? 0;
  for (const details of $('#sidebar').querySelectorAll('details')) {
    if (details.dataset.navExpanded ? details.dataset.navExpanded === 'true' : details.open)
      openGroups.add(details.dataset.group);
    else openGroups.delete(details.dataset.group);
  }
  setCosmicEyeDefinitions(catalog.eyes);
  applyWebsiteTheme(catalog, state);
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  $('#sidebar').innerHTML = sidebar(route, state, openGroups, catalog, appVersion);
  bindNavigationDisclosures($('#sidebar'), {
    onChange: (group, open) => (open ? openGroups.add(group) : openGroups.delete(group)),
    onWildsOpen: () => {
      location.hash = 'wilds/aetherion';
    }
  });
  // The nav element is replaced above; keep the player's place in the sidebar.
  $('#sidebar nav').scrollTop = navigationScroll;
  const section = navigationSection(route);
  const sectionName = state.pageCopy?.site?.[`group-${section.title.toLowerCase()}`] ?? section.title;
  const definitionKind =
    route === 'dev/rarities' ? 'rarities' : route === 'dev/traits' ? 'species' : editorRoutes[route.split('/')[1]];
  const definitionPath = section.title === 'Compendium' && definitionKind ? `data/config/${definitionKind}.json` : '';
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  $('#topbar').innerHTML =
    `<div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="Open navigation" aria-expanded="${document.body.classList.contains('nav-open')}">${icon('menu')}</button>${icon(section.icon)}<span>${e(sectionName)}</span><span class="crumb-separator">/</span><strong>${e(routeTitle(route, locationsFor(catalog, state)))}</strong>${definitionPath ? `<span class="breadcrumb-path" title="${e(definitionPath)}">— ${e(definitionPath)}</span>` : ''}</div><div class="header-right"><div class="gold-balance" role="group" aria-label="Current gold balance">${icon('coin')}<strong>${number(state.gold)}</strong><span>GOLD</span></div><a href="#dev/profile" class="keeper-avatar" aria-label="Open my profile">${avatarSVG(state.keeper?.avatarSeed ?? 11)}</a></div>`;
}
function pageContent(pageRoute, pageState = state) {
  const state = pageState;
  const [section, page] = pageRoute.split('/');
  const route = pageRoute;
  const locations = locationsFor(catalog, state);
  if (section === 'wilds' && locations.some(l => l.id === page && l.enabled))
    return wildPage(
      locations.find(l => l.id === page),
      state,
      locations,
      catalog
    );
  else if (route === 'stable/breeding') return plannedPage(route, state);
  else if (section === 'stable') return stablePage(page, state, catalog);
  else if (route === 'dev/settings' || route === 'dev/economy') return settingsPage(state, catalog);
  else if (route === 'dev/saves') return savesPage(state);
  else if (route === 'dev/roadmap') return roadmapPage();
  else if (route === 'dev/music') return musicPlayer.page();
  else if (route === 'dev/profile') return keeperPage(state);
  else if (route === 'dev/horse-updates') return horseUpdatesPage(state, catalog);
  else if (route === 'dev/edit-mode') return editModePage(state);
  else if (route === 'dev/locations' || route === 'dev/atmospheres') return zoneEditorPage(catalog, state);
  else if (section === 'dev' && page === 'rarities') return raritiesManagerPage(catalog);
  else if (section === 'dev' && page === 'eyes') return eyesManagerPage(catalog);
  else if (section === 'dev' && page === 'colors') return palettesManagerPage(catalog);
  else if (section === 'dev' && page === 'mutations') return mutationsManagerPage(catalog);
  else if (section === 'dev' && page === 'species')
    return speciesManagerPage(
      catalog,
      state,
      catalog.species.find(s => s.id === selectedSpeciesId),
      speciesTab,
      speciesSort,
      speciesSortDirection
    );
  else if (section === 'dev' && Object.hasOwn(editorRoutes, page))
    return libraryEditorPage(editorRoutes[page], catalog, state);
  else return plannedPage(route, state);
}
function render() {
  renderChrome();
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  main.innerHTML = pageContent(route);
  updateEncounterCooldown();
  if (route === 'dev/music') musicPlayer.bind(main);
  void musicPlayer.route(route).then(() => {
    if (route === 'dev/music') {
      // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
      main.innerHTML = musicPlayer.page();
      musicPlayer.bind(main);
    }
  });
  if ($('#horse-grid-size')) {
    $('#horse-grid-size').value = String(stableGridColumns);
    $('#horse-grid-size').setAttribute('aria-valuetext', `${stableGridColumns} horses per row`);
    $('#horse-grid-value').textContent = stableGridColumns;
    $('#horse-grid-size')
      .closest('.stable-grid-slider')
      .style.setProperty('--grid-position', `${((stableGridColumns - 3) / 3) * 100}%`);
    $('#collection-grid').style.setProperty('--stable-grid-columns', stableGridColumns);
  }
  document.title = `Gallorin v${appVersion} · ${routeTitle(route, locationsFor(catalog, state))}`;
  copyEditor.attach(main);
  attachSettingsNumbers(main);
  trackForms(main);
}
async function navigate({ initializeNavigation = false } = {}) {
  const version = ++routeVersion;
  route = location.hash.slice(1) || 'wilds/aetherion';
  if (
    route.startsWith('wilds/') &&
    !locationsFor(catalog, state).some(zone => zone.enabled && route === `wilds/${zone.id}`)
  ) {
    const available = locationsFor(catalog, state).find(zone => zone.enabled);
    route = available ? `wilds/${available.id}` : 'stable/all';
    history.replaceState(null, '', `#${route}`);
  }
  const movedRoutes = {
    'dev/traits': 'dev/species',
    'dev/editor': 'dev/roadmap',
    'dev/generator': 'dev/roadmap',
    'dev/spawn': 'dev/roadmap',
    'dev/economy': 'dev/settings',
    'stable/favorites': 'stable/all',
    'breeding/stable': 'stable/breeding',
    'breeding/history': 'stable/all',
    'stable/sold': 'stable/all'
  };
  if (movedRoutes[route]) {
    route = movedRoutes[route];
    history.replaceState(null, '', '#' + route);
  }
  if (navigationSection(route).title === 'Developer Settings' && state.settings.developerSettingsVisible !== true) {
    route = 'dev/profile';
    history.replaceState(null, '', '#' + route);
  }
  if (initializeNavigation) {
    openGroups.clear();
    openGroups.add(navigationSection(route).title);
  }
  closeMenu();
  if (profile.open) profile.close();
  if (confirmation.open) confirmation.close();
  copyEditor.close();
  profileCopyEditor.close();
  horseDialogs.close();
  horseArtViewer.close();
  eyeEditor.dialog.close();
  mutationEditor.dialog.close();
  paletteEditor.dialog.close();
  zoneEditor.close();
  try {
    if (
      route.startsWith('wilds/') &&
      !state.encounters[route.split('/')[1]] &&
      locationsFor(catalog, state).some(l => l.id === route.split('/')[1] && l.enabled)
    )
      await action('visit', { locationId: route.split('/')[1] });
    if (version !== routeVersion) return;
    render();
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  } catch (error) {
    notify(error.message, true);
  }
}
function findHorse(id) {
  return [...state.horses, ...state.sold, ...Object.values(state.encounters).flat()].find(h => h.id === id);
}
function readZoneForm(form) {
  const values = new FormData(form);
  return {
    id: form.dataset.id || undefined,
    name: values.get('name'),
    subtitle: locationsFor(catalog, state).find(l => l.id === form.dataset.id)?.subtitle || '',
    description: values.get('description'),
    atmosphere: values.get('atmosphere'),
    appearance: { tint: values.get('color:zone-tint') },
    creatures: values.getAll('speciesPool').map(name => {
      const sp = catalog.species.find(s => s.name === name);
      return { speciesId: sp.id, weight: Number(values.get(`weight:${sp.id}`)) };
    }),
    tags: String(values.get('tags') || '')
      .split(/\r?\n/)
      .map(tag => tag.trim())
      .filter(Boolean),
    enabled: form.elements.enabled.checked,
    speciesPool: values.getAll('speciesPool'),
    palettePool: values.getAll('palettePool')
  };
}
function showZoneDraft(draft) {
  zoneEditor.open(draft);
  trackForms(zoneEditor.dialog);
  if (!draft.id && draft.name) restoreBaseline($('#zone-form'), 'unsaved-generated-draft');
  $('#zone-form input[name="name"]').focus({ preventScroll: true });
}
function showDefinition(kind, draft) {
  if (kind === 'species') {
    showSpecies(draft, draft.id ? speciesTab : 'overview');
    return;
  }
  if (kind === 'palettes') {
    paletteEditor.open(draft);
    trackForms(paletteEditor.dialog);
    if (!draft.id && draft.name)
      restoreBaseline(paletteEditor.dialog.querySelector('#definition-form'), 'new-palette-copy');
    return;
  }
  if (kind === 'mutations') {
    mutationEditor.open(draft);
    trackForms(mutationEditor.dialog);
    if (draft?.imported) restoreBaseline(mutationEditor.dialog.querySelector('#definition-form'), 'imported-mutation');
    return;
  }
  if (kind === 'personalities') {
    render();
    personalityCreation.setAttribute('aria-label', draft.id ? 'Edit Personality' : 'Create Personality');
    // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
    personalityCreation.innerHTML = personalityForm(draft);
    if (!personalityCreation.open) personalityCreation.showModal();
    trackForms(personalityCreation);
    personalityCreation.querySelector('[name=name]').focus();
    return;
  }
  if (kind === 'eyes') {
    eyeEditor.open(draft);
    trackForms(eyeEditor.dialog);
    if (!draft?.id && draft?.name) restoreBaseline(eyeEditor.dialog.querySelector('#definition-form'), 'new-eye-draft');
    return;
  }
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  main.innerHTML = libraryEditorPage(kind, catalog, state, draft);
  copyEditor.attach(main);
  trackForms(main);
  if (!draft.id && draft.name) restoreBaseline($('#definition-form'), 'unsaved-duplicate-draft');
  $('#definition-form input[name="name"]')?.focus({ preventScroll: true });
}
function showSpecies(draft, tab = speciesTab) {
  const listScroll = main.querySelector('.species-manager .definition-list')?.scrollTop ?? 0;
  selectedSpeciesId = draft?.id;
  speciesTab = tab;
  setHTML(main, raw(speciesManagerPage(catalog, state, draft, tab, speciesSort, speciesSortDirection)));
  copyEditor.attach(main);
  trackForms(main);
  if (draft && !draft.id && draft.name) restoreBaseline($('#definition-form'), 'unsaved-species-draft');
  syncSpeciesControls(main);
  main.querySelector('.species-manager .definition-list').scrollTop = listScroll;
}
function inspect(id) {
  const horse = findHorse(id);
  if (!horse) return;
  const currentTab =
    profile.dataset.horseId === id
      ? profile.querySelector('[data-profile-tab][aria-selected="true"]')?.dataset.profileTab
      : 'overview';
  profile.dataset.horseId = id;
  const rankColor = raritySettings(catalog).colors[horseCardRank(horse, catalog).key];
  // Reapply on every horse so an unranked profile cannot inherit the previous border.
  profile.toggleAttribute('data-rarity-border', Boolean(rankColor));
  if (rankColor) profile.style.setProperty('--profile-rarity-color', rankColor);
  else profile.style.removeProperty('--profile-rarity-color');
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  profile.innerHTML = profileContent(horse, state, { catalog });
  selectProfileTab(profile, currentTab || 'overview');
  profileCopyEditor.attach(profile);
  trackForms(profile);
  if (!profile.open) profile.showModal();
}
function closeMenu() {
  document.body.classList.remove('nav-open');
  $('.workspace').inert = false;
  if (matchMedia('(max-width: 900px)').matches) $('#sidebar').inert = true;
  $('.mobile-menu')?.setAttribute('aria-expanded', 'false');
}
function syncResponsiveMenu() {
  const mobile = matchMedia('(max-width: 900px)').matches;
  const opened = document.body.classList.contains('nav-open');
  $('#sidebar').inert = mobile && !opened;
  $('.workspace').inert = mobile && opened;
}
function askToSell(id) {
  confirmation.classList.remove('eye-delete-confirm');
  const horse = findHorse(id);
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  confirmation.innerHTML = `<div class="dialog-top"><button class="icon-button" data-action="cancel-sell" aria-label="Cancel sale">${icon('close')}</button></div><h2 id="confirm-title">Sell ${e(horse.name || horse.species)}?</h2><p>You’ll receive <strong>${number(horseSalePrice(horse, state.settings).total)} gold</strong>. This horse will leave your care, and its full profile will be kept in your sold-horse history.</p>${saleQuoteBreakdown(horseSalePrice(horse, state.settings))}<div class="form-actions"><button class="button secondary" data-action="cancel-sell" autofocus>Keep this horse</button><button class="button primary" data-action="confirm-sell" data-id="${id}">Sell horse</button></div>`;
  confirmation.showModal();
}
function updateAvatarPreview() {
  const form = $('#keeper-form');
  if (!form) return;
  const seed = Number(form.elements.avatarSeed.value);
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  $('#keeper-preview').innerHTML = avatarSVG(seed);
  form
    .querySelectorAll('[data-seed]')
    .forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.seed) === seed)));
  updateFormState(form);
}
function askToDelete(type, payload, name, detail, verb = type === 'delete-profile' ? 'Reset' : 'Delete') {
  pendingDeletion = { type, payload };
  confirmation.classList.toggle(
    'eye-delete-confirm',
    type === 'delete-definition' && ['eyes', 'mutations', 'palettes', 'species'].includes(payload.kind)
  );
  if (type === 'delete-definition' && payload.kind === 'species') {
    setHTML(confirmation, speciesDeleteConfirmation(name));
    confirmation.showModal();
    return;
  }
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  confirmation.innerHTML = `<div class="dialog-top"><h2 id="confirm-title">${verb} ${e(name)}?</h2></div><p class="delete-warning">${e(detail)} This is saved immediately. The previous save is kept in your backup folder.</p><div class="form-actions"><button class="button secondary" data-action="cancel-delete" autofocus>${verb === 'Release' ? 'No' : 'Keep It'}</button><button class="button primary" data-action="confirm-delete">${verb === 'Release' ? 'Yes' : `Confirm ${verb}`}</button></div>`;
  confirmation.showModal();
}
function updateStableSort(direction = $('[data-action="sort-direction"]')?.dataset.direction) {
  const toggle = $('[data-action="sort-direction"]');
  toggle.dataset.direction = direction;
  const label = direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  $('#collection-grid').innerHTML = collectionCards(
    route.split('/')[1],
    state,
    $('#horse-search').value,
    $('#horse-sort').value,
    catalog,
    direction
  );
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || busy) return;
  const { action: intent, id } = button.dataset;
  if (intent === 'species-sort-direction') {
    speciesSortDirection = button.dataset.direction === 'asc' ? 'desc' : 'asc';
    button.dataset.direction = speciesSortDirection;
    updateSpeciesSort(main);
    return;
  }
  if (intent === 'species-tab') {
    const species = catalog.species.find(s => s.id === main.querySelector('.species-manager').dataset.speciesId);
    showSpecies(species, button.dataset.tab);
    main.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
    return;
  }
  if (intent === 'species-open-zone') {
    history.pushState(null, '', '#dev/locations');
    await navigate();
    showZoneDraft(locationsFor(catalog, state).find(z => z.id === id));
    return;
  }
  if (['toggle-mutation', 'toggle-all-mutations', 'toggle-mutation-section'].includes(intent))
    return toggleMutations(main, button);
  if (['toggle-personality', 'toggle-all-personalities'].includes(intent)) return togglePersonalities(main, button);
  if (intent === 'cancel-definition-import') return button.closest('dialog')?.close();
  if (intent === 'import-definition') return definitionTransfers[button.dataset.kind]?.importDefinition();
  if (intent === 'export-definition') {
    try {
      definitionTransfers[button.dataset.kind]?.exportDefinition(id);
    } catch (error) {
      notify(error.message, true);
    }
    return;
  }
  if (intent === 'import-palette') return paletteTransfers.importPalette();
  if (intent === 'export-palette') {
    try {
      paletteTransfers.exportPalette(id);
    } catch (error) {
      notify(error.message, true);
    }
    return;
  }
  if (intent === 'choose-personality-emoji') {
    const input = button.closest('form').elements.emoji;
    openEmojiPicker({
      value: input.value,
      onSelect: emoji => {
        input.value = emoji;
        button.textContent = emoji;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    return;
  }
  if (intent === 'sort-direction') {
    updateStableSort(button.dataset.direction === 'asc' ? 'desc' : 'asc');
    return;
  }
  if (intent === 'eye-sort-direction') {
    button.dataset.direction = button.dataset.direction === 'asc' ? 'desc' : 'asc';
    updateEyeGrid(main, catalog);
    return;
  }
  if (intent === 'palette-sort-direction') {
    button.dataset.direction = button.dataset.direction === 'asc' ? 'desc' : 'asc';
    updatePaletteGrid(main, catalog);
    return;
  }
  if (intent === 'zone-toggle-all') {
    const form = button.closest('form');
    setZoneSelection(form, button.dataset.pool, !zoneAllSelected(form, button.dataset.pool));
    if (form.id === 'species-palettes-form') {
      updateZonePalettes(form, catalog);
      syncZoneSelectionButtons(form);
      syncSpeciesControls(main);
    } else syncZoneEditor(form, catalog, readZoneForm(form));
    updateFormState(form);
    return;
  }
  if (intent === 'zone-palette-sort-direction') {
    button.dataset.direction = button.dataset.direction === 'asc' ? 'desc' : 'asc';
    updateZonePalettes(button.closest('form'), catalog);
    return;
  }
  if (intent === 'zone-species-sort-direction') {
    button.dataset.direction = button.dataset.direction === 'asc' ? 'desc' : 'asc';
    updateZoneSpecies($('#zone-form'), catalog);
    return;
  }
  if (intent === 'mutation-sort-direction') {
    button.dataset.direction = button.dataset.direction === 'asc' ? 'desc' : 'asc';
    updateMutationGrid(main, catalog);
    return;
  }
  if (intent === 'choose-avatar') {
    $('#keeper-form').elements.avatarSeed.value = button.dataset.seed;
    updateAvatarPreview();
    return;
  }
  if (intent === 'cancel-delete') {
    pendingDeletion = null;
    confirmation.close();
    return;
  }
  if (intent === 'delete-profile')
    return askToDelete(
      'delete-profile',
      {},
      'Profile',
      'Reset your display name, About Me, and avatar. Horses and progress stay unchanged.'
    );
  if (intent === 'delete-horse') {
    const owned = state.horses.some(h => h.id === id);
    if (!owned && !state.sold.some(h => h.id === id)) return;
    return askToDelete(
      'delete-horse',
      { id },
      findHorse(id)?.name || findHorse(id)?.species || 'Horse',
      owned
        ? 'Release this horse from your stable. Releasing gives no gold.'
        : 'Remove this horse from the sold archive. This does not reverse the sale.',
      owned ? 'Release' : 'Delete'
    );
  }
  if (intent === 'delete-zone')
    return askToDelete(
      'delete-zone',
      { id },
      locationsFor(catalog, state).find(z => z.id === id)?.name || 'Zone',
      'Remove this zone and its wild encounters. Collected horses and sold records stay unchanged.'
    );
  if (intent === 'delete-definition') {
    const kind = button.dataset.kind;
    if (kind === 'palettes')
      return askToDelete(
        'delete-definition',
        { kind, id },
        catalog.palettes.find(p => p.id === id)?.name || 'Palette',
        'Remove this palette from future use. Matching zone pools are updated; zones with empty pools close.'
      );
    if (kind === 'mutations')
      return askToDelete(
        'delete-definition',
        { kind, id },
        catalog.mutations.find(m => m.id === id)?.name || 'Mutation',
        'Remove this mutation from future spawns. Existing horses keep their saved mutations.'
      );
    if (kind === 'eyes')
      return askToDelete(
        'delete-definition',
        { kind, id },
        catalog.eyes.find(eye => eye.id === id)?.name || 'Eye Color',
        catalog.eyes.find(eye => eye.id === id)?.cosmicType
          ? 'Reset this Cosmic artwork eye color to its default. Generated Eye Color traits stay unchanged.'
          : 'Remove this eye color from future spawns. Existing horses keep their saved eye colors.'
      );
    return askToDelete(
      'delete-definition',
      { kind, id },
      catalog[kind].find(d => d.id === id)?.name || 'Entry',
      'Remove this option from future use. Existing horse details stay unchanged. Matching zone pools are updated; zones with empty pools close. Deleted atmospheres use a remaining atmosphere, item themes are cleared, and a deleted active website theme returns to Original.'
    );
  }
  if (intent === 'import-horse') return horseTransfers.importHorse();
  if (intent === 'export-horse') return horseTransfers.exportHorse(id);
  if (intent === 'catch') return horseDialogs.open(id, 'catch');
  if (intent === 'edit-horse-text') {
    const form = profile.querySelector('#' + button.dataset.form);
    if (!form) return;
    button.hidden = true;
    form.hidden = false;
    form.querySelector('textarea').focus();
    return;
  }
  if (intent === 'rename-horse')
    return startHorseRename(button, { horse: findHorse(id), save: action, onSaved: render, notify });
  if (intent === 'add-skill-xp') return horseDialogs.open(id, 'skill', button.dataset.skill);
  if (intent === 'edit-horse-field') return horseDialogs.open(id, 'field', button.dataset.field);
  if (intent === 'inspect') return inspect(id);
  if (intent === 'close-profile') return profile.close();
  if (intent === 'cancel-sell') return confirmation.close();
  if (intent === 'sell') return askToSell(id);
  if (intent === 'new-zone') return showZoneDraft(newZoneDraft());
  if (intent === 'edit-zone') return showZoneDraft(locationsFor(catalog, state).find(l => l.id === id));
  if (intent === 'default-rarity-colors') {
    const form = $('#rarity-settings-form');
    for (const key of Object.keys(rarityNames)) {
      form.elements.namedItem(`enabled:${key}`).checked = !!defaultRaritySettings.colors[key];
      form.elements.namedItem(`glow:${key}`).checked = defaultRaritySettings.glow[key];
      const color = defaultRaritySettings.colors[key] || '#8D949E';
      form.elements.namedItem(`color:${key}`).value = color;
      form.querySelector(`[data-color-picker="${key}"]`).value = color;
    }
    syncRarityControls(form);
    updateFormState(form);
    return;
  }
  if (intent === 'close-personality-editor')
    return closePersonalityEditor($('#definition-form'), () => {
      if (personalityCreation.open) personalityCreation.close();
      else render();
    });
  if (intent === 'new-definition') return showDefinition(button.dataset.kind, draftDefinition(button.dataset.kind));
  if (intent === 'edit-definition')
    return showDefinition(
      button.dataset.kind,
      catalog[button.dataset.kind].find(d => d.id === id)
    );
  if (intent === 'duplicate-definition') {
    const kind = button.dataset.kind,
      copy = structuredClone(catalog[kind].find(d => d.id === id));
    delete copy.id;
    let suffix = 1,
      name = `${copy.name.slice(0, 65)} copy`;
    while (catalog[kind].some(d => d.name.toLowerCase() === name.toLowerCase()))
      name = `${copy.name.slice(0, 65)} copy ${++suffix}`;
    copy.name = name;
    if (copy.systemId) {
      const base = copy.systemId.slice(0, 85);
      let suffix = 1,
        id = `${base}-copy`;
      while (catalog[kind].some(d => d.systemId === id)) id = `${base}-copy-${++suffix}`;
      copy.systemId = id;
    }
    return showDefinition(kind, copy);
  }
  if (intent === 'add-trait-category') {
    appendHTML($('#trait-rows'), raw(traitRow()));
    syncTraitRows(main);
    $('#trait-rows').lastElementChild.querySelector('input').focus();
    updateFormState($('#traits-form') || $('#definition-form'));
    syncSpeciesControls(main);
    return;
  }
  if (intent === 'add-eye-color') {
    const rows = [...$('#eye-color-rows').children];
    if (rows.length >= 6) return notify('You can combine up to six eye colors.', true);
    const key = crypto.randomUUID();
    // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
    $('#eye-color-rows').insertAdjacentHTML(
      'beforeend',
      `<div class="eye-color-row">${colorControl(key, '#8A689E', 'Additional eye color')}<button class="text-button" type="button" data-action="remove-eye-color">Remove color</button></div>`
    );
    updateFormState($('#traits-form') || $('#definition-form'));
    return;
  }
  if (intent === 'remove-eye-color') {
    if ($('#eye-color-rows').querySelectorAll('.eye-color-row').length === 1) return;
    button.closest('.eye-color-row').remove();
    const tile = $('#eye-color-rows').querySelector('.eye-add-tile');
    if (tile) tile.hidden = false;
    labelEyeColors($('#eye-color-rows'));
    updateFormState($('#traits-form') || $('#definition-form'));
    return;
  }
  if (intent === 'random-zone') {
    const editingId = $('#zone-form').dataset.id;
    const baseline = formBaseline($('#zone-form'));
    showZoneDraft({ ...randomZone(catalog, locationsFor(catalog, state)), ...(editingId ? { id: editingId } : {}) });
    restoreBaseline($('#zone-form'), baseline);
    $('#zone-status').textContent = 'A new idea is ready. Adjust anything you like, then save your zone.';
    return;
  }
  if (intent === 'menu') {
    const opened = document.body.classList.toggle('nav-open');
    syncResponsiveMenu();
    button.setAttribute('aria-expanded', String(opened));
    if (opened) $('#sidebar a').focus();
    return;
  }
  if (intent === 'defaults') {
    const form = button.closest('form');
    for (const [name, value] of Object.entries(defaults)) {
      const input = form.elements.namedItem(name);
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value;
    }
    if (form.id === 'settings-form')
      form.elements.ALLOW_DUPLICATE_MUTATIONS.checked = defaultSpawnSettings.ALLOW_DUPLICATE_MUTATIONS;
    if (form.id === 'economy-form')
      for (const [key, value] of Object.entries(defaults.saleModifiers || defaultSaleModifiers))
        form.elements.namedItem(`saleModifier:${key}`).value = value;
    updateFormState(form);
    form.querySelector('[role=status]').textContent =
      'Defaults loaded into the form. Save settings to apply, or cancel to keep your current values.';
    return;
  }
  busy = true;
  // The busy guard blocks duplicate searches without flashing the cooldown styling.
  button.disabled = intent !== 'search';
  try {
    if (intent === 'confirm-delete') {
      if (!pendingDeletion) return;
      await action(pendingDeletion.type, pendingDeletion.payload);
      personalityCreation.close();
      eyeEditor.dialog.close();
      mutationEditor.dialog.close();
      paletteEditor.dialog.close();
      zoneEditor.close();
      pendingDeletion = null;
      confirmation.close();
      profile.close();
      render();
      notify('Removed and saved.');
    } else if (intent === 'toggle-copy-mode') {
      await action('developer-edit-mode', { enabled: !state.settings.developerEditMode });
      render();
      if (profile.open) inspect(profile.dataset.horseId);
      notify(
        state.settings.developerEditMode
          ? 'Edit mode enabled. Use the pencils beside page text.'
          : 'Edit mode closed. Unsaved drafts remain available until you reload.'
      );
    } else if (intent === 'apply-theme' || intent === 'theme-mode') {
      await action('website-theme', {
        id: intent === 'theme-mode' ? state.settings.websiteTheme || 'default' : id,
        mode: intent === 'theme-mode' ? button.dataset.mode : state.settings.websiteThemeMode || 'dark'
      });
      render();
      (intent === 'theme-mode'
        ? main.querySelector(`[data-action="theme-mode"][data-mode="${button.dataset.mode}"]`)
        : main.querySelector(`[data-action="apply-theme"][data-id="${id}"]`)
      )?.focus({ preventScroll: true });
      notify('Your website theme is saved.');
    } else if (intent === 'search') {
      await action('search', { locationId: route.split('/')[1] });
      render();
      main.querySelector('[data-action="search"]')?.focus({ preventScroll: true });
    } else if (intent === 'confirm-sell') {
      await action('sell', { id });
      horseDialogs.close();
      confirmation.close();
      profile.close();
      render();
      main.focus({ preventScroll: true });
    } else if (intent === 'favorite') {
      const search = $('#horse-search')?.value || '';
      const sort = $('#horse-sort')?.value || 'recent';
      const direction = $('[data-action="sort-direction"]')?.dataset.direction;
      await action('favorite', { id });
      render();
      if ($('#horse-search')) {
        $('#horse-search').value = search;
        $('#horse-sort').value = sort;
        updateStableSort(direction);
      }
      if (profile.open) {
        inspect(id);
        profile.querySelector('[data-action="favorite"]')?.focus();
      } else main.querySelector(`[data-action="favorite"][data-id="${id}"]`)?.focus({ preventScroll: true });
      notify(findHorse(id).favorite ? 'A special place in your heart.' : 'Removed from favorites.');
    } else if (intent === 'open-local-save') {
      await window.desktopMenu.openLocalSave();
    } else if (intent === 'backup') {
      await action('backup');
      render();
      notify('A dated backup was saved in data/backups.');
    }
  } catch (error) {
    notify(error.message, true);
  } finally {
    busy = false;
    button.disabled = false;
  }
});
const horseTextForms = '#horse-description-form,#horse-notes-form';
function closeHorseText(form) {
  form.hidden = true;
  const display = profile.querySelector(`[data-form="${form.id}"]`);
  if (display) display.hidden = false;
}
function savedHorseText(form) {
  const input = form.querySelector('textarea');
  input.defaultValue = input.value;
  restoreBaseline(form, formSignature(form));
  const display = profile.querySelector(`[data-form="${form.id}"]`);
  display.replaceChildren();
  if (input.value.trim()) display.textContent = input.value;
  else {
    const placeholder = document.createElement('span');
    placeholder.className = 'muted empty-horse-notes';
    placeholder.textContent = form.id === 'horse-notes-form' ? 'Click to add notes' : 'Click to add a description';
    display.append(placeholder);
  }
  closeHorseText(form);
}
function finishHorseText(form) {
  if (!form?.isConnected || form.hidden || busy) return;
  if (formSignature(form) === formBaseline(form)) closeHorseText(form);
  else form.requestSubmit();
}
profile.addEventListener('focusout', event => {
  const form = event.target.closest(horseTextForms);
  if (form)
    setTimeout(() => {
      if (!form.contains(document.activeElement)) finishHorseText(form);
    }, 0);
});
profile.addEventListener('keydown', event => {
  const form = event.target.closest(horseTextForms);
  if (form && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    finishHorseText(form);
  }
});
document.addEventListener('invalid', handleInvalidHex, true);
document.addEventListener('select', event => protectHexSelection(event.target), true);
document.addEventListener('selectionchange', () => protectHexSelection(document.activeElement));
document.addEventListener('submit', async event => {
  const form = event.target;
  if (
    ![
      'horse-description-form',
      'horse-notes-form',
      'keeper-form',
      'spawn-settings-form',
      'gold-form',
      'economy-form',
      'settings-form',
      'zone-form',
      'definition-form',
      'traits-form',
      'species-palettes-form',
      'rarity-settings-form'
    ].includes(form.id)
  )
    return;
  event.preventDefault();
  if (
    form.id === 'definition-form' &&
    form.dataset.kind === 'palettes' &&
    form.dataset.id &&
    formSignature(form) === formBaseline(form)
  ) {
    paletteEditor.dialog.close();
    return;
  }
  if (busy) return;
  busy = true;
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    if (['economy-form', 'settings-form'].includes(form.id)) validateSettingsNumbers(form);
    const values = Object.fromEntries(new FormData(form));
    if (form.id === 'rarity-settings-form') {
      await action('rarity-settings', readRaritySettings(form));
      render();
      notify('Rarity colors saved.');
    } else if (form.id === 'species-palettes-form') {
      const species = catalog.species.find(s => s.id === form.dataset.id);
      const palettePool = [...form.querySelectorAll('[name="palettePool"]:checked')].map(input => input.value);
      await action('save-definition', { kind: 'species', id: species.id, values: { ...species, palettePool } });
      showSpecies(
        catalog.species.find(s => s.id === species.id),
        'palettes'
      );
      notify('Species palettes saved.');
    } else if (form.id === 'traits-form') {
      const payload = readTraitsForm(form);
      await action('save-traits', payload);
      showSpecies(
        catalog.species.find(s => s.id === payload.id),
        'traits'
      );
      notify('Traits saved.');
    } else if (form.id === 'spawn-settings-form') {
      await action('spawn-settings', { ALLOW_DUPLICATE_MUTATIONS: form.elements.ALLOW_DUPLICATE_MUTATIONS.checked });
      render();
      notify('Spawning configuration saved.');
    } else if (form.id === 'horse-description-form') {
      await action('horse-description', { id: form.dataset.id, description: values.description });
      savedHorseText(form);
      notify('Description saved.');
    } else if (form.id === 'horse-notes-form') {
      await action('horse-notes', { id: form.dataset.id, notes: values.notes });
      savedHorseText(form);
      notify('Horse notes saved.');
    } else if (form.id === 'keeper-form') {
      await action('save-profile', { name: values.name, about: values.about, avatarSeed: Number(values.avatarSeed) });
      render();
      notify('Profile saved.');
    } else if (form.id === 'economy-form') {
      await action('economy-settings', {
        gold: Number(values.gold),
        sellingPrice: Number(values.sellingPrice),
        saleModifiers: Object.fromEntries(
          Object.keys(defaultSaleModifiers).map(key => [key, Number(values[`saleModifier:${key}`])])
        )
      });
      render();
      notify('Saved successfully.');
    } else if (form.id === 'gold-form') {
      await action('current-gold', { gold: Number(values.gold) });
      render();
      notify('Current gold balance saved.');
    } else if (form.id === 'definition-form') {
      const payload = readDefinitionForm(form);
      if (payload.kind === 'species') {
        payload.values.traits ??= catalog.species.find(s => s.id === payload.id)?.traits || {};
        payload.values.attributes ??= catalog.species.find(s => s.id === payload.id)?.attributes || {};
      }
      validateDefinition(payload.kind, payload.values);
      await action('save-definition', payload);
      renderChrome();
      const saved = catalog[payload.kind].find(d =>
        payload.id
          ? d.id === payload.id
          : d.name === payload.values.name.trim() &&
            (payload.kind !== 'mutations' || d.type === payload.values.type.trim())
      );
      if (payload.kind === 'eyes') {
        eyeEditor.dialog.close();
        render();
      } else if (payload.kind === 'palettes') {
        paletteEditor.dialog.close();
        render();
      } else if (payload.kind === 'mutations') {
        mutationEditor.dialog.close();
        paletteEditor.dialog.close();
        render();
      } else if (payload.kind === 'personalities') {
        personalityCreation.close();
        render();
      } else showDefinition(payload.kind, saved);
      if ($('#definition-status'))
        $('#definition-status').textContent =
          payload.kind === 'siteThemes'
            ? 'Theme saved. Select it above to apply it to the website.'
            : payload.kind === 'atmospheres'
              ? 'Atmosphere saved. Choose it in a zone to use it.'
              : ['items', 'themes'].includes(payload.kind)
                ? 'Definition saved. Gameplay effects and rewards remain planned.'
                : 'Saved to the local configuration files. Future spawns use this definition.';
      notify('Your new possibilities are saved.');
    } else if (form.id === 'zone-form') {
      const draft = readZoneForm(form);
      validateZone(draft, catalog);
      await action('save-zone', draft);
      renderChrome();
      zoneEditor.close();
      render();
      notify('Zone saved.');
    } else if (form.id === 'settings-form') {
      await action('settings', {
        searchCooldownEnabled: form.elements.searchCooldownEnabled.checked,
        searchCooldownSeconds: Number(values.searchCooldownSeconds),
        horsesPerSearch: Number(values.horsesPerSearch ?? state.settings.horsesPerSearch),
        sellingPrice: Number(values.sellingPrice ?? state.settings.sellingPrice),
        startingGold: Number(values.startingGold ?? state.settings.startingGold),
        stableCapacity: Number(values.stableCapacity ?? state.settings.stableCapacity),
        ignoreStableLimit: form.elements.ignoreStableLimit?.checked ?? state.settings.ignoreStableLimit,
        ALLOW_DUPLICATE_MUTATIONS: form.elements.ALLOW_DUPLICATE_MUTATIONS.checked
      });
      render();
      notify('Saved successfully.');
    }
  } catch (error) {
    if (form.id === 'zone-form' && $('#zone-status')) $('#zone-status').textContent = error.message;
    if (form.id === 'definition-form' && $('#definition-status')) $('#definition-status').textContent = error.message;
    notify(error.message, true);
  } finally {
    busy = false;
    if (submit) submit.disabled = false;
  }
});
document.addEventListener('input', event => {
  if (event.target.closest('#trait-rows')) syncTraitRows(main);
  if (event.target.id === 'horse-grid-size') {
    const count = Number(event.target.value);
    if ([3, 4, 5, 6].includes(count)) {
      stableGridColumns = count;
      $('#horse-grid-value').textContent = count;
      event.target.closest('.stable-grid-slider').style.setProperty('--grid-position', `${((count - 3) / 3) * 100}%`);
      event.target.setAttribute('aria-valuetext', `${count} horses per row`);
      $('#collection-grid').style.setProperty('--stable-grid-columns', count);
    }
  }

  if (event.target.matches('[data-color-picker]')) {
    event.target.closest('.color-inputs').querySelector('[data-color-hex]').value = event.target.value.toUpperCase();
  }
  if (event.target.matches('[data-color-hex]')) {
    const field = event.target;
    const start = field.selectionStart;
    const caret = hexInputValue(field.value.slice(0, start)).length;
    field.value = hexInputValue(field.value);
    field.setSelectionRange(caret, caret);
    if (validHex(event.target.value))
      event.target.closest('.color-inputs').querySelector('[data-color-picker]').value = event.target.value;
  }
  if (event.target.form?.id === 'rarity-settings-form') syncRarityControls(event.target.form);
  if (event.target.matches('[data-zone-palette-choice]')) syncZonePaletteChoice(event.target.form, event.target);
  if (event.target.form?.id === 'species-palettes-form') syncZoneSelectionButtons(event.target.form);
  updateFormState(event.target.form);
  syncSpeciesControls(main);
  if (event.target.id === 'eye-search') updateEyeGrid(main, catalog);
  if (event.target.id === 'definition-search') {
    const query = event.target.value.trim().toLowerCase();
    let matches = 0;
    for (const item of main.querySelectorAll('.definition-list-item')) {
      item.hidden = !item.dataset.search.includes(query);
      if (!item.hidden) matches++;
    }
    $('#definition-no-results').hidden = matches > 0;
  }
  if (event.target.closest('#zone-form')) syncZoneEditor($('#zone-form'), catalog, readZoneForm($('#zone-form')));
  if (event.target.id === 'zone-species-search') updateZoneSpecies($('#zone-form'), catalog);
  if (event.target.id === 'zone-palette-search') updateZonePalettes(event.target.form, catalog);
  if (event.target.id === 'horse-search') updateStableSort();
  if (event.target.id === 'palette-search') updatePaletteGrid(main, catalog);
  if (event.target.id === 'mutation-search') updateMutationGrid(main, catalog);
});
document.addEventListener('change', async event => {
  if (event.target.id === 'zone-palette-sort')
    event.target.form.querySelector('[data-action="zone-palette-sort-direction"]').dataset.direction = 'asc';
  if (['zone-palette-type', 'zone-palette-sort'].includes(event.target.id))
    updateZonePalettes(event.target.form, catalog);
  if (event.target.id === 'zone-species-sort')
    $('#zone-form [data-action="zone-species-sort-direction"]').dataset.direction =
      event.target.value === 'weight' ? 'desc' : 'asc';
  if (['zone-species-rarity', 'zone-species-sort'].includes(event.target.id))
    updateZoneSpecies($('#zone-form'), catalog);
  if (
    event.target.form?.id === 'zone-form' &&
    event.target.name?.startsWith('weight:') &&
    $('#zone-species-sort').value === 'weight'
  )
    updateZoneSpecies(event.target.form, catalog);
  if (event.target.form?.id === 'zone-form' && event.target.name === 'atmosphere') {
    applyZonePreset(event.target.form, catalog);
    syncZoneEditor(event.target.form, catalog, readZoneForm(event.target.form));
    updateFormState(event.target.form);
  }
  if (event.target.id === 'species-sort') {
    speciesSort = event.target.value;
    selectedSpeciesId = main.querySelector('.species-manager').dataset.speciesId || undefined;
    updateSpeciesSort(main);
    return;
  }
  if (event.target.matches('[data-disable-developer-settings]') && event.target.checked) {
    event.target.disabled = true;
    try {
      await action('disable-developer-settings');
      openGroups.delete('Developer Settings');
      render();
    } catch (error) {
      event.target.checked = false;
      event.target.disabled = false;
      notify(error.message, true);
    }
    return;
  }
  if (event.target.id === 'palette-sort')
    main.querySelector('[data-action="palette-sort-direction"]').dataset.direction = 'asc';
  if (['palette-group', 'palette-sort', 'palette-scope'].includes(event.target.id)) updatePaletteGrid(main, catalog);
  if (event.target.id === 'mutation-sort')
    main.querySelector('[data-action="mutation-sort-direction"]').dataset.direction =
      event.target.value === 'weight' ? 'desc' : 'asc';
  if (['mutation-type', 'mutation-sort', 'mutation-weights'].includes(event.target.id))
    updateMutationGrid(main, catalog);
  if (event.target.id === 'eye-sort')
    main.querySelector('[data-action="eye-sort-direction"]').dataset.direction = 'asc';
  if (['eye-rarity', 'eye-sort', 'eye-percent'].includes(event.target.id)) updateEyeGrid(main, catalog);
  if (event.target.form?.id === 'rarity-settings-form') syncRarityControls(event.target.form);
  updateFormState(event.target.form);
  syncSpeciesControls(main);
  if (event.target.id === 'horse-sort')
    updateStableSort(['recent', 'rarity', 'favorites'].includes(event.target.value) ? 'desc' : 'asc');
});
document.addEventListener('reset', event => {
  if (event.target.id === 'species-palettes-form') {
    event.preventDefault();
    showSpecies(
      catalog.species.find(s => s.id === event.target.dataset.id),
      'palettes'
    );
    return;
  }
  if (event.target.id === 'traits-form') {
    event.preventDefault();
    showSpecies(
      catalog.species.find(s => s.id === event.target.dataset.id),
      'traits'
    );
    return;
  }
  if (['horse-description-form', 'horse-notes-form'].includes(event.target.id)) {
    event.target.hidden = true;
    profile.querySelector(`[data-form="${event.target.id}"]`).hidden = false;
  }
  setTimeout(() => {
    if (event.target.id === 'rarity-settings-form') syncRarityControls(event.target);
    updateFormState(event.target);
    if (event.target.id === 'keeper-form') updateAvatarPreview();
  }, 0);
  if (['settings-form', 'economy-form'].includes(event.target.id))
    event.target.querySelector('[role=status]').textContent = '';
  if (event.target.id === 'zone-form') {
    event.preventDefault();
    showZoneDraft(locationsFor(catalog, state).find(l => l.id === event.target.dataset.id) || newZoneDraft());
  }
  if (event.target.id === 'definition-form') {
    event.preventDefault();
    const kind = event.target.dataset.kind;
    showDefinition(kind, catalog[kind].find(d => d.id === event.target.dataset.id) || draftDefinition(kind));
  }
});
$('.scrim').addEventListener('click', closeMenu);
document.addEventListener('keydown', event => {
  keepTraitArrowOnLine(event);
  if (
    event.target.matches('[data-action="species-tab"]') &&
    ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
  ) {
    const tabs = [...main.querySelectorAll('[data-action="species-tab"]:not(:disabled)')];
    const index = tabs.indexOf(event.target);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    event.preventDefault();
    tabs[next]?.click();
    return;
  }
  if (event.key === 'Tab' && document.body.classList.contains('nav-open') && matchMedia('(max-width: 900px)').matches) {
    const focusable = [...$('#sidebar').querySelectorAll('a, summary')].filter(el => el.getClientRects().length);
    const first = focusable[0],
      last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
    closeMenu();
    $('.mobile-menu').focus();
  }
});
for (const dialog of [profile, confirmation])
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    )
      dialog.close();
  });
matchMedia('(max-width: 900px)').addEventListener('change', syncResponsiveMenu);
window.addEventListener('hashchange', navigate);
try {
  ({ state, catalog, defaults, appVersion } = await request('/api/state'));
  await navigate({ initializeNavigation: true });
  syncResponsiveMenu();
} catch (error) {
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  main.innerHTML = `<section class="panel"><h1>The sanctuary couldn’t open</h1><p>${e(error.message)}</p><p>Check that the local server is running, then reload this page. Existing save files have been preserved.</p><button class="button primary" id="retry-load">Try again</button></section>`;
  $('#retry-load').addEventListener('click', () => location.reload());
}

// Save variation only after leaving a changed field, without resetting palette filters.
document.addEventListener('focusout', async event => {
  const input = event.target;
  if (input.id !== 'palette-variation') return;
  const previous = catalog.spawning?.paletteVariationPercent ?? 25;
  if (!input.value.trim() || !input.validity.valid) {
    input.value = previous;
    notify('Enter a color variation from 0 to 100%.', true);
    return;
  }
  const value = Number(input.value);
  if (value === previous) return;
  input.disabled = true;
  try {
    await action('spawn-settings', { paletteVariationPercent: value });
    notify('Color variation saved.');
  } catch (error) {
    input.value = previous;
    notify(error.message, true);
  } finally {
    input.disabled = false;
  }
});
document.addEventListener('keydown', event => {
  if (event.target.id === 'palette-variation' && event.key === 'Enter') {
    event.preventDefault();
    event.target.blur();
  }
});
