import { html, raw, card, icon, setHTML } from './ui.js';
import { folderHorseIds } from './horse-folder-order.js';
import { bindHorseFolderDragging } from './horse-folder-drag.js';
import { bindMusicDisclosures } from './music-disclosures.js';

const bindings = new WeakMap();
export function customHorseFolders(state, horses, catalog) {
  const folders = state.horseFolders || [];
  const matching = new Map(horses.map(horse => [horse.id, horse]));
  const groups = [
    { id: 'favorites', name: 'Favorites' },
    ...folders.map(folder => ({ ...folder, editable: true })),
    { id: 'unfiled', name: 'All Horses' }
  ].map(group => ({
    ...group,
    horses: folderHorseIds(state, group.id)
      .filter(id => matching.has(id))
      .map(id => matching.get(id))
  }));
  return String(
    html`<div class="horse-folders"><div class="horse-folder-toolbar"><button type="button" class="button secondary" data-music-toggle-all>Show All</button><button type="button" class="button primary" data-horse-folder-new>${raw(icon('plus'))} New Folder</button></div><p class="horse-folder-hint">Drag onto a horse to swap, or between horses to reorder. Drop into another folder to move.</p><p class="horse-folder-drop-status" role="status"></p><div class="music-playlist-groups">${groups.map(group => html`<details class="music-group" data-music-group="${group.id}"${raw(group.id === 'favorites' ? ' open' : '')}><summary><h2>${raw(icon(group.id === 'favorites' ? 'heart' : 'stable'))}${group.name}</h2>${group.editable ? html`<span class="horse-folder-actions"><button type="button" class="icon-button" data-horse-folder-edit="${group.id}" title="Rename folder" aria-label="Rename ${group.name}">${raw(icon('edit'))}</button><button type="button" class="icon-button" data-horse-folder-delete="${group.id}" title="Delete folder" aria-label="Delete ${group.name}">${raw(icon('trash'))}</button></span>` : ''}<span class="music-group-count">${group.horses.length} horse${group.horses.length === 1 ? '' : 's'}</span><span class="music-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></summary><div class="horse-folder-body"><div class="horse-grid">${group.horses.length ? group.horses.map(h => html`<div class="horse-folder-card" draggable="true" data-folder-horse="${h.id}">${raw(card(h, state, 'stable', catalog))}</div>`) : html`<p class="grid-empty" role="status">No horses in this folder</p>`}</div></div></details>`)}</div></div>`
  );
}

export function bindHorseFolders(root, services) {
  bindings.get(root)?.abort();
  const controller = new AbortController();
  bindings.set(root, controller);
  if (!root.querySelector('.horse-folders')) return;
  bindMusicDisclosures(root, controller.signal);
  bindHorseFolderDragging(root, services, controller.signal);
  const edit = folder => {
    const dialog = document.createElement('dialog');
    dialog.className = 'horse-folder-dialog';
    dialog.setAttribute('aria-labelledby', 'horse-folder-title');
    setHTML(
      dialog,
      html`<form><div class="dialog-top"><h2 id="horse-folder-title">${folder ? 'Rename Folder' : 'New Folder'}</h2></div><div class="horse-folder-form-body"><label class="horse-folder-name">Folder name<input name="name" required maxlength="80" value="${folder?.name || ''}" autofocus></label><p role="status"></p><div class="form-actions"><button type="button" class="button secondary" data-folder-cancel>Cancel</button><button type="submit" class="button primary">${folder ? 'Save Folder' : 'Create Folder'}</button></div></div></form>`
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
          horseIds: folder?.horseIds || []
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
      event.preventDefault();
      event.stopPropagation();
      const folder = services
        .getState()
        .horseFolders?.find(
          folder => folder.id === (button.dataset.horseFolderEdit || button.dataset.horseFolderDelete)
        );
      if (button.hasAttribute('data-horse-folder-delete')) {
        const dialog = document.createElement('dialog');
        dialog.className = 'horse-folder-dialog';
        dialog.setAttribute('aria-labelledby', 'delete-folder-title');
        setHTML(
          dialog,
          html`<div class="dialog-top"><h2 id="delete-folder-title">Delete ${folder.name}?</h2></div><div class="horse-folder-form-body"><p>Only this folder is deleted. Your horses stay in Stables. Horses without another folder return to All Horses.</p><p role="status"></p><div class="form-actions"><button type="button" class="button secondary" data-keep-folder autofocus>Keep Folder</button><button type="button" class="button primary" data-delete-folder>Delete Folder</button></div></div>`
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
    { signal: controller.signal, capture: true }
  );
}
