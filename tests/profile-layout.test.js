import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeCatalog } from '../public/definitions.js';
import { createEncounters } from '../src/encounters.js';
import { profileContent } from '../public/profile.js';
import { selectProfileTab } from '../public/profile-layout.js';
import { horseHeadArt, horseArt } from '../public/art.js';
import { card } from '../public/ui.js';
const catalog = normalizeCatalog(
  JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
);
const settings = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
const horse = createEncounters(catalog, 'aetherion', 1, 0, undefined, () => 0.5)[0];
const state = { horses: [], sold: [], settings };

test('existing horse mutation cards follow current definitions without changing saved rolls', () => {
  const saved = {
    id: 'mutation-old',
    systemId: 'stable-id',
    name: 'Old Name',
    type: 'Standard',
    description: 'Old text'
  };
  const current = { ...saved, id: 'mutation-new', name: 'New Name', description: '<Updated description>' };
  const existing = { ...horse, mutations: [saved, { id: 'deleted', name: 'Deleted', description: 'Saved text' }] };
  const before = structuredClone(existing);
  for (const records of [{ horses: [existing] }, { sold: [existing] }, {}]) {
    const html = profileContent(existing, { ...state, ...records }, { catalog: { ...catalog, mutations: [current] } });
    assert.match(html, /New Name/);
    assert.match(html, /&lt;Updated description&gt;/);
    assert.doesNotMatch(html, /Old text/);
    assert.match(html, /Saved text/);
  }
  assert.deepEqual(existing, before);
});

test('mutation cards resolve local IDs and legacy names but preserve missing definitions', () => {
  const current = { id: 'local', name: 'Current', type: 'Standard', description: 'Current description' };
  for (const saved of [{ id: 'local', name: 'Before' }, 'Current', { name: 'Current', type: 'Standard' }]) {
    assert.match(
      profileContent({ ...horse, mutations: [saved] }, state, { catalog: { ...catalog, mutations: [current] } }),
      /Current description/
    );
  }
  const deleted = { id: 'deleted', name: 'Current', description: 'Preserved snapshot' };
  assert.match(
    profileContent({ ...horse, mutations: [deleted] }, state, { catalog: { ...catalog, mutations: [current] } }),
    /Preserved snapshot/
  );
});

test('horse profile separates overview from appearance and keeps unique portrait IDs', () => {
  const html = profileContent(horse, state, { catalog });
  assert.equal((html.match(/role="tab"/g) || []).length, 2);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 2);
  const overview = html.split('data-profile-panel="overview">')[1].split('data-profile-panel="appearance"')[0];
  const appearance = html.split('data-profile-panel="appearance"')[1];
  assert.match(overview, /horse-facts/);
  assert.match(overview, />Equipment<\/h3>/);
  assert.match(overview, />Skills<\/h3>/);
  assert.doesNotMatch(overview, /Equipment is not available yet|Skill training is not available yet/);
  assert.equal((overview.match(/>Lv\. 0<\/span>/g) || []).length, 5);
  assert.equal((overview.match(/>0\/125 XP<\/dd>/g) || []).length, 5);
  for (const color of ['#EF922B', '#59B653', '#5FBFF0', '#A66DE0', '#E879B1']) assert.ok(overview.includes(color));
  assert.doesNotMatch(overview, /class="color-regions"|class="horse-notes"/);
  assert.match(appearance, /class="color-regions"/);
  assert.match(appearance, />Traits<\/h3>/);
  assert.match(appearance, />Mutations<\/h3>/);
  assert.match(appearance, />Palette<\/h3>/);
  assert.equal((html.match(/viewBox="240 25 135 145"/g) || []).length, 2);
  assert.equal((html.match(/data-full-horse title="View Full Horse"/g) || []).length, 2);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  const owned = profileContent({ ...horse, notes: 'Keep this note' }, { ...state, horses: [horse] }, { catalog });
  assert.match(owned, /horse-notes-form/);
  assert.match(owned, /Keep this note/);
  assert.ok(owned.indexOf('profile-tab-rail') < owned.indexOf('profile-scroll-frame'));
  assert.ok(owned.indexOf('profile-info') < owned.indexOf('class="horse-notes"'));
  assert.ok(owned.indexOf('class="horse-notes"') < owned.indexOf('class="profile-skills"'));
  assert.match(owned, /data-action="sell"/);
  assert.match(owned, /data-action="export-horse"/);
  assert.ok(owned.indexOf('data-action="export-horse"') < owned.indexOf('data-action="sell"'));
  assert.match(owned, /title="Export Horse" aria-label="Export Horse">\s*<svg/);
  const preview = profileContent(horse, state, { catalog, importPreview: true });
  assert.match(preview, /id="import-horse-appearance"/);
  assert.match(preview, /data-action="confirm-import"/);
  assert.doesNotMatch(preview, /data-action="sell"|data-action="export-horse"/);
});

test('preview headshots and full artwork share the same horse colors', () => {
  const full = horseArt(horse);
  const head = horseHeadArt(horse);
  assert.match(full, /viewBox="0 0 460 310"/);
  assert.equal(head, full.replace('viewBox="0 0 460 310"', 'viewBox="240 25 135 145"'));
  assert.match(card(horse, state, 'wild', catalog), /viewBox="0 0 460 310"/);
  assert.match(card(horse, { ...state, horses: [horse] }, 'stable', catalog), /viewBox="240 25 135 145"/);
});

test('switching profile tabs hides inactive content and supports focus without replacing forms', () => {
  const tabs = ['overview', 'appearance'].map(key => ({
    dataset: { profileTab: key },
    setAttribute(name, value) {
      this[name] = value;
    },
    focus() {
      this.focused = true;
    }
  }));
  const panels = ['overview', 'appearance'].map(key => ({ dataset: { profilePanel: key } }));
  const root = {
    querySelectorAll(selector) {
      return selector === '[data-profile-tab]' ? tabs : panels;
    }
  };
  selectProfileTab(root, 'appearance', { focus: true });
  assert.equal(tabs[1]['aria-selected'], 'true');
  assert.equal(tabs[1].tabIndex, 0);
  assert.equal(tabs[1].focused, true);
  assert.equal(tabs[0].tabIndex, -1);
  assert.equal(panels[0].hidden, true);
  assert.equal(panels[1].hidden, false);
  selectProfileTab(root, 'overview');
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[1].hidden, true);
});

test('each profile renders its own skill progress and maxed skills use MAX', () => {
  const trained = {
    ...horse,
    skills: {
      agility: { level: 10, xp: 34000 },
      strength: { level: 11, xp: 100 },
      jump: { level: 2, xp: 75 },
      bond: { level: 10, xp: 2345 }
    }
  };
  const html = profileContent(trained, { ...state, horses: [trained] }, { catalog });
  assert.equal((html.match(/>MAX<\/span>/g) || []).length, 2);
  assert.match(html, />75\/975 XP<\/dd>/);
  assert.match(html, />Lv\. 10<\/span>/);
  assert.match(html, />2345\/34000 XP<\/dd>/);
  assert.doesNotMatch(html, />Lv\. 11/);
  const other = profileContent(horse, state, { catalog });
  assert.equal((other.match(/>Lv\. 0<\/span>/g) || []).length, 5);
});

test('legacy edit mode never exposes skill XP controls', () => {
  const editing = { ...state, horses: [horse], settings: { ...state.settings, developerEditMode: true } };
  assert.doesNotMatch(profileContent(horse, editing, { catalog }), /data-action="add-skill-xp"/);
  assert.doesNotMatch(profileContent(horse, state, { catalog }), /data-action="add-skill-xp"/);
  assert.doesNotMatch(profileContent(horse, editing, { catalog, importPreview: true }), /data-action="add-skill-xp"/);
});

test('XP text follows level rollover and retains the completed requirement at MAX', () => {
  const trained = { ...horse, skills: { agility: { level: 0, xp: 600 }, wing: { level: 10, xp: 34000 } } };
  const html = profileContent(trained, { ...state, horses: [trained] }, { catalog });
  assert.match(html, />75\/975 XP<\/dd>/);
  assert.match(html, />34000\/34000 XP<\/dd>/);
  assert.match(html, /--skill-progress:7%/);
});
