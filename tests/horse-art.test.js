import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { horseArt, horseHeadArt, legacyHorseArt, legacyHorseHeadArt } from '../public/art.js';
import { horseArtBackground, horseArtAccents } from '../public/horse-art-background.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const horse = { id: 'art-test', species: 'Unicorn', palette: catalog.palettes[0], eye: { colors: ['#123456'] } };

test('active artwork faces right, maps every channel, preserves source masks and never changes the horse', () => {
  const before = structuredClone(horse);
  for (const palette of catalog.palettes.filter(p => p.complete && Object.keys(p.colors).length === 9)) {
    const svg = horseArt({ ...horse, palette });
    assert.match(svg, /data-horse-model="layered" transform="translate\(467 0\) scale\(-.43 .43\)"/);
    assert.doesNotMatch(svg, /__COLOR__|__PREFIX__|undefined|placeholder artwork/);
    for (const [channel, color] of Object.entries({ ...palette.colors, Eye: '#123456' })) {
      const groups = [
        ...svg.matchAll(new RegExp(`<g data-layer="[^"]+" data-channel="${channel}"[^>]*>([\\s\\S]*?)</g>`, 'g'))
      ];
      assert.equal(groups.length, channel === 'Hair' ? 2 : 1, `${palette.name}: ${channel}`);
      for (const [, group] of groups) assert.ok(group.includes(`fill="${color}"`));
    }
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const reference of svg.matchAll(/(?:href="#|url\(#)([^")]+)/g)) assert.ok(ids.includes(reference[1]));
  }
  assert.deepEqual(horse, before);
  assert.doesNotMatch(horseArt({ ...horse, species: 'Arabian' }), /data-layer="keratin"/);
  assert.match(horseHeadArt(horse), /viewBox="270 10 145 170"/);
});

test('Keratin traits show palette-colored artwork on every species in full-body and headshot views', () => {
  for (const species of ['Arabian', 'Anticorn', 'Hauntmare']) {
    const record = { ...horse, species, traits: { Keratin: ['Dragon Horns'] } };
    const before = structuredClone(record);
    for (const render of [horseArt, horseHeadArt]) {
      const svg = render(record);
      const keratin = svg.match(/<g data-trait-category="Keratin"[^>]*>([\s\S]*?)<\/g>/);
      assert.ok(keratin, species);
      assert.ok(keratin[1].includes(`fill="${record.palette.colors.Keratin}"`));
    }
    assert.deepEqual(record, before);
  }
  for (const Keratin of [undefined, [], ['None'], ['Awaiting species data'], ['', null, 'None']]) {
    for (const render of [horseArt, horseHeadArt])
      assert.doesNotMatch(render({ ...horse, species: 'Arabian', traits: { Keratin } }), /data-layer="keratin"/);
  }
  assert.doesNotMatch(
    horseArt({ ...horse, traits: { Keratin: [] } }),
    /data-layer="keratin"|data-trait-category="Keratin"/
  );
});

test('legacy full-body and headshot renderers remain callable with their original geometry', () => {
  assert.match(legacyHorseArt(horse), /viewBox="0 0 460 310"/);
  assert.match(legacyHorseArt(horse), /placeholder artwork/);
  assert.match(legacyHorseArt(horse), /rx="3" ry="2.5" fill="#123456"/);
  assert.match(legacyHorseHeadArt(horse), /viewBox="240 25 135 145"/);
  assert.doesNotMatch(legacyHorseArt(horse), /data-horse-model/);
});

test('active background scenery, accents and palette tint match the legacy renderer', () => {
  const coat = horse.palette.colors['Coat Top'];
  const legacy = legacyHorseArt(horse);
  const background = String(horseArtBackground(coat, 'harttest'));
  const compact = value => value.replace(/\s+/g, '');
  const scenery = background.slice(background.indexOf('<rect'));
  assert.ok(compact(legacy).includes(compact(scenery)));
  assert.ok(compact(legacy).includes(compact(String(horseArtAccents(coat)))));
  assert.match(background, new RegExp(`<stop stop-color="${coat}" stop-opacity=".22"`));
  const changed = String(horseArtBackground('#ABCDEF', 'harttest'));
  assert.equal(changed, background.replaceAll(coat, '#ABCDEF'));
});
