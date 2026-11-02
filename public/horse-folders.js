import { html, raw, card, icon, setHTML } from './ui.js';
import { bindMusicDisclosures } from './music-disclosures.js';

const bindings = new WeakMap();
export function customHorseFolders(state, horses, catalog) {
  const folders = state.horseFolders || [];
  const assigned = new Set(folders.flatMap(folder => folder.horseIds));
  const groups = [
    { id: 'favorites', name: 'Favorites', horses: horses.filter(h => h.favorite) },
    ...folders.map(folder => ({
      ...folder,
      editable: true,
      horses: horses.filter(h => folder.horseIds.includes(h.id))
    })),
    { id: 'unfiled', name: 'Unfiled', horses: horses.filter(h => !h.favorite && !assigned.has(h.id)) }
  ];
  return String(
    html`<div class="horse-folders"><div class="horse-folder-toolbar"><button type="button" class="button secondary" data-music-toggle-all>Show All</button><button type="button" class="button primary" data-horse-folder-new>${raw(icon('plus'))} New Folder</button></div><div class="music-playlist-groups">${groups.map(group => html`<details class="music-group" data-music-group="${group.id}" open><summary><h2>${raw(icon(group.id === 'favorites' ? 'heart' : 'stable'))}${group.name}</h2><span class="music-group-count">${group.horses.length} horse${group.horses.length === 1 ? '' : 's'}</span><span class="music-chevron" aria-hidden="true">⌄</span></summary><div class="horse-folder-body">${group.editable ? html`<div class="horse-folder-toolbar"><button type="button" class="button secondary" data-horse-folder-edit="${group.id}">Edit Folder & Horses</button><button type="button" class="button secondary" data-horse-folder-delete="${group.id}">${raw(icon('trash'))} Delete Folder</button></div>` : ''}<div class="horse-grid">${group.horses.length ? group.horses.map(h => raw(card(h, state, 'stable', catalog))) : html`<p class="grid-empty" role="status">${group.id === 'favorites' ? 'No favorite horses match. Use a horse’s heart to add it here.' : group.id === 'unfiled' ? 'No unfiled horses match.' : 'No horses match. Edit this folder to add horses.'}</p>`}</div></div></details>`)}</div></div>`
  );
}

export function bindHorseFolders(root, services) {
  bindings.get(root)?.abort();
  const controller = new AbortController();
  bindings.set(root, controller);
  if (!root.querySelector('.horse-folders')) return;
  bindMusicDisclosures(root, controller.signal);
  const edit = folder => {
    const dialog = document.createElement('dialog');
    dialog.className = 'horse-folder-dialog';
    dialog.setAttribute('aria-labelledby', 'horse-folder-title');
    setHTML(
      dialog,
      html`<form><div class="dialog-top"><h2 id="horse-folder-title">${folder ? 'Edit Folder & Horses' : 'New Folder'}</h2></div><label>Folder name<input name="name" required maxlength="80" value="${folder?.name || ''}" autofocus></label><fieldset><legend>Horses in this folder</legend><p>A horse can belong to more than one folder.</p><div class="horse-folder-choices">${services.getState().horses.map(h => html`<label><input type="checkbox" name="horseIds" value="${h.id}" ${raw(folder?.horseIds.includes(h.id) ? 'checked' : '')}>${h.name || h.species} · ${h.species}</label>`)}</div></fieldset><p role="status"></p><div class="form-actions"><button type="button" class="button secondary" data-folder-cancel>Cancel</button><button type="submit" class="button primary">Save Folder</button></div></form>`
    );
    dialog.querySelector('[data-folder-cancel]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      event.stopPropagation();
      const submit = dialog.querySelector('[type=submit]');
      if (submit.disabled) return;
      submit.disabled = true;
      const values = new FormData(event.currentTarget);
      try {
        await services.action('save-horse-folder', {
          id: folder?.id,
          name: values.get('name'),
          horseIds: values.getAll('horseIds')
        });
        dialog.close();
        services.redraw();
      } catch (error) {
        dialog.querySelector('[role=status]').textContent = error.message;
        submit.disabled = false;
      }
    });
    document.body.append(dialog);
    dialog.showModal();
  };
  root.addEventListener(
    'click',
    event => {
      const button = event.target.closest(
        '[data-horse-folder-new],[data-horse-folder-edit],[data-horse-folder-delete]'
      );
      if (!button) return;
      const folder = services
        .getState()
        .horseFolders?.find(
          folder => folder.id === (button.dataset.horseFolderEdit || button.dataset.horseFolderDelete)
        );
      if (button.hasAttribute('data-horse-folder-delete')) {
        const dialog = document.createElement('dialog');
        dialog.setAttribute('aria-labelledby', 'delete-folder-title');
        setHTML(
          dialog,
          html`<h2 id="delete-folder-title">Delete ${folder.name}?</h2><p>All horses stay in My Horses. Only this folder is removed.</p><p role="status"></p><div class="form-actions"><button type="button" class="button secondary" data-keep-folder autofocus>Keep Folder</button><button type="button" class="button primary" data-delete-folder>Delete Folder</button></div>`
        );
        dialog.querySelector('[data-keep-folder]').onclick = () => dialog.close();
        dialog.querySelector('[data-delete-folder]').onclick = async event => {
          event.currentTarget.disabled = true;
          try {
            await services.action('delete-horse-folder', { id: folder.id });
            dialog.close();
            services.redraw();
          } catch (error) {
            dialog.querySelector('[role=status]').textContent = error.message;
            dialog.querySelector('[data-delete-folder]').disabled = false;
          }
        };
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        document.body.append(dialog);
        dialog.showModal();
      } else edit(folder);
    },
    { signal: controller.signal }
  );
}
