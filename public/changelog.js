export const changelogCategories = ['Added', 'Updated', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function parseChangelog(source) {
  if (typeof source !== 'string') throw new Error('Changelog must be text.');
  const entries = [];
  let entry, section, phase, group;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^## \[([^\]]+)\] - (?:(.+) - )?(\S+)$/.exec(line);
    if (heading) {
      const [, version, title, date] = heading;
      if (!versionPattern.test(version) || entries.some(e => e.version === version))
        throw new Error('Invalid or duplicate changelog version.');
      if (
        date !== 'Unreleased' &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date)
      )
        throw new Error('Invalid changelog date.');
      entry = { version, title: title || null, date, summary: [], sections: [], timeline: [] };
      entries.push(entry);
      section = null;
      phase = null;
      group = null;
      continue;
    }
    if (!entry || !line) continue;
    if (line.startsWith('### Timeline: ')) {
      phase = line.slice('### Timeline: '.length).trim();
      if (!phase || entry.timeline.includes(phase)) throw new Error('Invalid or duplicate timeline section.');
      entry.timeline.push(phase);
      section = null;
      continue;
    }
    if (line.startsWith('### ') || line.startsWith('#### ')) {
      const nested = line.startsWith('#### ');
      if (nested && !phase) throw new Error('Nested changelog sections need a timeline.');
      if (!nested) phase = null;
      const name = line.slice(nested ? 5 : 4);
      if (
        !changelogCategories.includes(name) ||
        entry.sections.some(s => s.name === name && (s.phase || null) === (phase || null))
      )
        throw new Error('Invalid or duplicate changelog section.');
      section = { name, items: [], ...(phase ? { phase } : {}) };
      entry.sections.push(section);
      group = null;
      continue;
    }
    if (line.startsWith('- ')) {
      if (!section) throw new Error('Changes need a category.');
      const feature = /^- \*\*(.+)\*\*$/.exec(line);
      if (feature && !/^\s/.test(raw)) {
        if (section.items.length && !section.groups) throw new Error('Keep feature groups separate from flat changes.');
        section.groups ||= [];
        if (section.groups.some(item => item.name === feature[1])) throw new Error('Duplicate feature group.');
        group = { name: feature[1], items: [] };
        section.groups.push(group);
        continue;
      }
      if (/^\s{2,}- /.test(raw)) {
        if (!group) throw new Error('Indented changes need a feature group.');
        group.items.push(line.slice(2));
      } else if (section.groups) throw new Error('Indent changes beneath their feature group.');
      section.items.push(line.slice(2));
      continue;
    }
    if (line.startsWith('#')) throw new Error('Invalid changelog heading.');
    if (section) throw new Error('Use one bullet per change.');
    entry.summary.push(line);
  }
  if (!entries.length) throw new Error('No changelog entries.');
  for (const value of entries)
    if ((!value.title && !value.summary.length) || !value.sections.some(s => s.items.length))
      throw new Error('Each release needs a summary and changes.');
  for (const value of entries)
    if (value.timeline.some(phase => !value.sections.some(s => s.phase === phase && s.items.length)))
      throw new Error('Empty timeline section.');
  for (const value of entries)
    for (const category of value.sections)
      if (category.groups?.some(group => !group.items.length)) throw new Error('Empty feature group.');
  return entries;
}
export function releaseMarkdown(entry, date = entry.date) {
  let phase = null;
  const sections = entry.sections
    .filter(s => s.items.length)
    .map(section => {
      let heading = '';
      if (section.phase && section.phase !== phase) heading = '### Timeline: ' + section.phase + '\n\n';
      phase = section.phase || null;
      return (
        heading +
        (phase ? '#### ' : '### ') +
        section.name +
        '\n\n' +
        (section.groups
          ? section.groups
              .map(group => '- **' + group.name + '**\n' + group.items.map(text => '  - ' + text).join('\n'))
              .join('\n\n')
          : section.items.map(text => '- ' + text).join('\n'))
      );
    })
    .join('\n\n');
  return (
    '## [' +
    entry.version +
    '] - ' +
    (entry.title ? entry.title + ' - ' : '') +
    date +
    '\n\n' +
    (entry.summary.length ? entry.summary.join('\n\n') + '\n\n' : '') +
    sections +
    '\n'
  );
}
export function releaseTitle(entry) {
  return 'Gallorin v' + entry.version + (entry.title ? ': ' + entry.title : '');
}
