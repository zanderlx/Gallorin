import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseChangelog, releaseMarkdown, releaseTitle } from '../public/changelog.js';
import { validateRelease, assertReleaseReady } from '../scripts/release-notes.js';
const source = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const baseline = parseChangelog(source)
  .filter(e => e.version === '1.0.0' || e.version.startsWith('0.'))
  .map(e => releaseMarkdown(e))
  .join('\n');
test('changelog preserves 0.x history and keeps the next Gallorin release at 1.0.0', () => {
  const entries = parseChangelog(source);
  assert.equal(entries[0].version, pkg.version);
  assert.equal(entries.find(e => e.version === '1.0.0').title, 'The Symphony of the Wilds');
  assert.deepEqual(
    entries.filter(e => e.version.startsWith('0.')).map(e => e.version),
    ['0.7.0', '0.6.0', '0.5.0', '0.4.0', '0.3.0', '0.2.0', '0.1.0']
  );
  assert.ok(entries.filter(e => e.version.startsWith('0.')).every(e => e.title === 'Aetherion (Legacy)'));
});
test('single-release notes contain only the chosen release and its categories', () => {
  const current = parseChangelog(source).find(e => e.version === '1.0.0');
  const notes = releaseMarkdown(current, '2026-10-23');
  assert.match(notes, /^## \[1\.0\.0\] - The Symphony of the Wilds - 2026-10-23/);
  assert.match(notes, /### Added/);
  assert.match(notes, /### Changed/);
  assert.match(notes, /### Fixed/);
  assert.ok(!notes.includes('## [0.9.0]'));
  assert.equal(releaseTitle(current), 'Gallorin v1.0.0: The Symphony of the Wilds');
});
test('changelog validation rejects duplicate versions, invalid dates and categories', () => {
  assert.throws(() => parseChangelog(source + '\n## [1.0.0] - Unreleased'), /duplicate/);
  assert.throws(() => parseChangelog(source.replace('2026-10-23', '2026-02-30')), /date/);
  assert.throws(() => parseChangelog(source.replace('### Added', '### Typo')), /section/);
  assert.throws(() => parseChangelog('No release headings'), /entries/);
  const safe = parseChangelog('## [1.0.0] - Unreleased\nTitle\n### Added\n- <img src=x onerror=alert(1)>');
  assert.equal(safe[0].sections[0].items[0], '<img src=x onerror=alert(1)>');
});
test('release checks fail when package, changelog, lockfile, README, or banner diverge', async () => {
  const files = {
    'package.json': JSON.stringify({ version: '1.0.0' }),
    'package-lock.json': JSON.stringify({ version: '1.0.0', packages: { '': { version: '1.0.0' } } }),
    'CHANGELOG.md': baseline,
    'README.md': 'Gallorin v1.0.0',
    'docs/assets/gallorin-banner.svg': 'VERSION 1.0.0'
  };
  const check = values => validateRelease(async path => values[path]);
  assert.equal((await check(files)).current.version, '1.0.0');
  for (const [file, value] of [
    ['package.json', JSON.stringify({ version: '1.1.0' })],
    ['package-lock.json', JSON.stringify({ version: '2.0.0', packages: { '': { version: '2.0.0' } } })],
    ['README.md', 'Gallorin v2.0.0'],
    ['docs/assets/gallorin-banner.svg', 'VERSION 2.0.0']
  ])
    await assert.rejects(check({ ...files, [file]: value }));
  assert.throws(() => assertReleaseReady({ date: 'Unreleased' }), /Finalize/);
  assert.doesNotThrow(() => assertReleaseReady({ date: '2026-10-23' }));
});

test('named release headings keep legacy titles clean and retain old-format parsing support', () => {
  const entries = parseChangelog(source);
  assert.equal(entries.find(e => e.version === '1.0.0').title, 'The Symphony of the Wilds');
  assert.ok(
    entries
      .filter(e => e.version.startsWith('0.'))
      .every(e => e.title === 'Aetherion (Legacy)' && !e.summary.some(text => text.includes('originally')))
  );
  const first = entries.find(e => e.version === '1.0.0');
  assert.ok(
    first.sections.some(section => section.items.some(text => text.includes('Horse Updates (work in progress)')))
  );
  const old = parseChangelog('## [0.1.0] - 2026-10-20\nAetherion (Legacy)\n### Added\n- Collection');
  assert.equal(old[0].summary[0], 'Aetherion (Legacy)');
});

test('Gallorin 1.0.0 merges desktop, music, then Gallorin changes in chronological order', () => {
  const entries = parseChangelog(source),
    current = entries.find(e => e.version === '1.0.0');
  assert.ok(!entries.some(e => ['0.8.0', '0.9.0'].includes(e.version)));
  assert.deepEqual(current.timeline, []);
  assert.deepEqual(
    current.sections.map(section => section.name),
    ['Added', 'Changed', 'Fixed']
  );
  const notes = releaseMarkdown(current);
  assert.ok(notes.indexOf('Windows desktop installer') < notes.indexOf('Woodland title screen'));
  assert.ok(notes.indexOf('Woodland title screen') < notes.indexOf('New Gallorin logo'));
  assert.deepEqual(parseChangelog(notes)[0].sections, current.sections);
});
test('untitled patch releases keep summaries out of release names', () => {
  const entry = parseChangelog(
    '## [1.1.1] - Unreleased\nMusic improvements.\n### Fixed\n- Confirm playlist removal.'
  )[0];
  assert.equal(entry.title, null);
  assert.equal(releaseTitle(entry), 'Gallorin v1.1.1');
  assert.match(releaseMarkdown(entry), /^## \[1\.1\.1\] - Unreleased\n\nMusic improvements\./);
});

test('Updated categories retain indented feature groups in release notes', () => {
  const source =
    '## [1.2.0] - Unreleased\nUpdates in development.\n### Added\n- **Wilds**\n  - Search cooldown.\n\n- **Audio**\n  - Sound events.\n### Updated\n- **Compendium**\n  - Rarity controls.';
  const entry = parseChangelog(source)[0];
  assert.deepEqual(entry.sections[0].groups, [
    { name: 'Wilds', items: ['Search cooldown.'] },
    { name: 'Audio', items: ['Sound events.'] }
  ]);
  assert.deepEqual(entry.sections[0].items, ['Search cooldown.', 'Sound events.']);
  assert.deepEqual(parseChangelog(releaseMarkdown(entry))[0], entry);
  assert.throws(
    () => parseChangelog('## [1.2.0] - Unreleased\nSummary\n### Added\n  - Orphaned change.'),
    /feature group/
  );
});
