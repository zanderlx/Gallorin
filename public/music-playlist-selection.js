// All applies within one section; retain individual choices if it is unchecked again.
export function bindPlaylistSelection(table, groups) {
  const refresh = () => {
    for (const group of groups) {
      const all = table.querySelector('[data-playlist-choice="' + group.id + '"]');
      if (!all) continue;
      for (const row of table.querySelectorAll('[data-playlist-section="' + group.id + '"]')) {
        const input = row.querySelector('[data-playlist-choice]');
        if (input === all) continue;
        if (all.checked) {
          if (!Object.hasOwn(input.dataset, 'individualChoice')) input.dataset.individualChoice = String(input.checked);
          input.checked = false;
          input.disabled = true;
          row.setAttribute('aria-disabled', 'true');
          row.title = 'Included by All ' + group.name;
        } else {
          if (Object.hasOwn(input.dataset, 'individualChoice')) {
            input.checked = input.dataset.individualChoice === 'true';
            delete input.dataset.individualChoice;
          }
          input.disabled = false;
          row.removeAttribute('aria-disabled');
          row.removeAttribute('title');
        }
      }
    }
  };
  table.addEventListener('change', refresh);
  refresh();
  return refresh;
}
