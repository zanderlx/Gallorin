import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseChangelog, releaseMarkdown, releaseTitle } from '../public/changelog.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(resolve(root, path), 'utf8');
export async function validateRelease(readText = read) {
  const pkg = JSON.parse(await readText('package.json'));
  const lock = JSON.parse(await readText('package-lock.json'));
  const entries = parseChangelog(await readText('CHANGELOG.md'));
  if (entries[0].version !== pkg.version) throw new Error('The newest changelog entry must match package.json.');
  if (lock.version !== pkg.version || lock.packages[''].version !== pkg.version)
    throw new Error('package-lock.json version differs from package.json.');
  if (!(await readText('README.md').then(text => text.includes('Gallorin v' + pkg.version))))
    throw new Error('README version differs from package.json.');
  const banner = await readText('docs/assets/gallorin-banner.svg');
  if (!banner.includes('VERSION ' + pkg.version)) throw new Error('README banner version differs from package.json.');
  for (let i = 1; i < entries.length; i++) {
    const a = entries[i - 1].version.split('.').map(Number),
      b = entries[i].version.split('.').map(Number);
    const first = a.findIndex((value, index) => value !== b[index]);
    if (first < 0 || a[first] < b[first]) throw new Error('Changelog versions must be newest first.');
    if (entries[i].date === 'Unreleased') throw new Error('Only the newest release may be Unreleased.');
  }
  return { pkg, entries, current: entries[0] };
}
export function assertReleaseReady(entry) {
  if (entry.date === 'Unreleased')
    throw new Error(
      'Finalize the current changelog entry before releasing: node scripts/release-notes.js --finalize YYYY-MM-DD'
    );
}
async function run() {
  const { current } = await validateRelease();
  const args = process.argv.slice(2);
  if (args.includes('--finalize')) {
    const index = args.indexOf('--finalize');
    const date =
      args[index + 1] ||
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw new Error('Choose a valid YYYY-MM-DD release date.');
    if (current.date !== 'Unreleased') throw new Error('This release already has a date.');
    const source = await read('CHANGELOG.md');
    await writeFile(
      resolve(root, 'CHANGELOG.md'),
      source.replace(
        '## [' + current.version + '] - ' + (current.title ? current.title + ' - ' : '') + 'Unreleased',
        '## [' + current.version + '] - ' + (current.title ? current.title + ' - ' : '') + date
      )
    );
    console.log('Finalized ' + current.version + ' for ' + date);
    return;
  }
  if (args.includes('--release') || args.includes('--write')) assertReleaseReady(current);
  if (args.includes('--title')) {
    console.log(releaseTitle(current));
    return;
  }
  if (args.includes('--write') || args.includes('--draft')) {
    const draft = args.includes('--draft');
    const date = current.date;
    await mkdir(resolve(root, 'dist'), { recursive: true });
    const target = resolve(root, 'dist', draft ? 'release-notes-draft.md' : 'release-notes.md');
    await writeFile(target, releaseMarkdown(current, date));
    console.log(target);
    return;
  }
  console.log('Release ' + current.version + ': package, lockfile, README, banner, and changelog match.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  run().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
