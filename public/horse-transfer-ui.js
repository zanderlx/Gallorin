import { createHorseDocument, readHorseDocument } from './horse-transfer.js';
import { profileContent } from './profile.js';

export function createHorseTransfers({ getCatalog, getState, save, notify, onImported }) {
  let picker,
    importing = false;
  let pendingDocument,
    previewDialog,
    saving = false;
  function showImportPreview(document, horse) {
    pendingDocument = document;
    if (!previewDialog) {
      previewDialog = window.document.createElement('dialog');
      previewDialog.className = 'horse-import-preview';
      previewDialog.setAttribute('aria-labelledby', 'import-preview-title');
      window.document.body.append(previewDialog);
      previewDialog.addEventListener('close', () => {
        pendingDocument = null;
        previewDialog.replaceChildren();
      });
      previewDialog.addEventListener('cancel', event => {
        if (saving) event.preventDefault();
      });
      previewDialog.addEventListener('click', async event => {
        const intent = event.target.closest('[data-action]')?.dataset.action;
        if (!intent) return;
        event.stopPropagation();
        if (saving) return;
        if (intent === 'cancel-import' || intent === 'close-profile') return previewDialog.close();
        if (intent !== 'confirm-import' || !pendingDocument) return;
        saving = true;
        previewDialog.querySelectorAll('button').forEach(button => {
          button.disabled = true;
        });
        try {
          const state = await save('import-horse', pendingDocument);
          previewDialog.close();
          onImported(state.horses.at(-1).id);
          notify('Horse imported to My Horses.');
        } catch (error) {
          notify(error.message, true);
        } finally {
          saving = false;
          previewDialog.querySelectorAll('button').forEach(button => {
            button.disabled = false;
          });
        }
      });
    }
    const state = getState();
    // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
    previewDialog.innerHTML = profileContent(
      { ...horse, id: 'import-preview' },
      { ...state, horses: [], sold: [], settings: { ...state.settings, developerEditMode: false } },
      { importPreview: true, catalog: getCatalog?.() }
    ).replace('id="profile-title"', 'id="import-preview-title"');
    previewDialog.showModal();
  }
  function importHorse() {
    if (importing || pendingDocument) return;
    if (!picker) {
      picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = '.json,application/json';
      picker.hidden = true;
      picker.setAttribute('aria-label', 'Import horse JSON');
      document.body.append(picker);
      picker.addEventListener('change', async () => {
        const file = picker.files[0];
        if (!file || importing) return;
        importing = true;
        try {
          if (file.size > 524288) throw new Error('Horse files must be 512 KB or smaller.');
          let document;
          try {
            document = JSON.parse(await file.text());
          } catch {
            throw new Error('This file is not valid JSON.');
          }
          const horse = readHorseDocument(document);
          showImportPreview(document, horse);
        } catch (error) {
          notify(error.message, true);
        } finally {
          importing = false;
          picker.value = '';
        }
      });
    }
    picker.value = '';
    picker.click();
  }
  function exportHorse(id) {
    const horse = getState().horses.find(h => h.id === id);
    if (!horse) return;
    try {
      const document = createHorseDocument(horse);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(document, null, 2) + '\n'], { type: 'application/json' })
      );
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${(horse.name || horse.species).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60) || 'horse'}.horse.json`;
      window.document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Horse exported. Your horse stays in My Horses.');
    } catch (error) {
      notify(error.message, true);
    }
  }
  return { importHorse, exportHorse };
}
