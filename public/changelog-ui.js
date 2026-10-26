import { parseChangelog } from './changelog.js';
export function createChangelog({ loadSource, getVersion }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'changelog-dialog';
  dialog.setAttribute('aria-labelledby', 'changelog-title');
  dialog.innerHTML =
    '<header class="changelog-header"><h2 id="changelog-title">Changelog</h2><button type="button" data-close-changelog aria-label="Close changelog">×</button></header><div class="changelog-content" tabindex="0"></div>';
  document.body.append(dialog);
  const body = dialog.querySelector('.changelog-content');
  let loaded = false;
  const appendText = (parent, tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    parent.append(node);
    return node;
  };
  const open = async () => {
    dialog.showModal();
    if (loaded) return;
    body.textContent = 'Loading changelog…';
    try {
      const [source, version] = await Promise.all([loadSource(), getVersion()]);
      const entries = parseChangelog(source);
      body.replaceChildren();
      for (const entry of entries) {
        const section = document.createElement('section');
        section.className = 'changelog-release';
        const heading = appendText(section, 'h3', 'v' + entry.version + (entry.title ? ' - ' + entry.title : ''));
        if (entry.version === version)
          appendText(heading, 'span', entry.date === 'Unreleased' ? 'Upcoming' : 'Current', 'changelog-badge');
        const date = appendText(
          section,
          entry.date === 'Unreleased' ? 'span' : 'time',
          entry.date === 'Unreleased' ? 'Unreleased' : entry.date,
          'changelog-date'
        );
        if (entry.date !== 'Unreleased') date.dateTime = entry.date;
        entry.summary.forEach(text => appendText(section, 'p', text));
        let phase = null;
        for (const category of entry.sections) {
          if (!category.items.length) continue;
          if (category.phase && category.phase !== phase)
            appendText(section, 'h4', category.phase, 'changelog-timeline-title');
          phase = category.phase || null;
          appendText(section, phase ? 'h5' : 'h4', category.name);
          const list = document.createElement('ul');
          if (category.groups) {
            for (const group of category.groups) {
              const item = document.createElement('li');
              appendText(item, 'strong', group.name);
              const changes = document.createElement('ul');
              group.items.forEach(text => appendText(changes, 'li', text));
              item.append(changes);
              list.append(item);
            }
          } else category.items.forEach(text => appendText(list, 'li', text));
          section.append(list);
        }
        body.append(section);
      }
      loaded = true;
    } catch {
      body.textContent = 'Could not load the changelog. Close and reopen this window to retry.';
    }
  };
  dialog.querySelector('[data-close-changelog]').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
  return open;
}
