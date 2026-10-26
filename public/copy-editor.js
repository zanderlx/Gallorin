import { copyKey, renderCopy, copyTokens } from './page-copy.js';

const excluded =
  '.horse-card,.horse-grid,.collection-toolbar,.stat-strip,.theme-grid,.definition-list,.definition-fields,.zone-card,.zone-preview,.profile-grid,table,.save-details,.form-status,[data-copy-ui],[data-copy-skip]';
let editorSequence = 0;
export function createCopyEditor({ getState, getRoute, save, notify, includeChrome = true, getValues = () => ({}) }) {
  const uid = 'copy-' + ++editorSequence;
  const query = selector => dialog.querySelector(selector.replaceAll('#copy-', '#' + uid + '-'));
  const drafts = new Map();
  const originalMarkup = new WeakMap();
  let fields = [],
    dialog,
    selected,
    toolbar,
    saving = false;
  const tokenValues = () => {
    const state = getState();
    return {
      sellingPrice: state.settings.sellingPrice.toLocaleString(),
      gold: state.gold.toLocaleString(),
      horseCount: state.horses.length,
      soldCount: state.sold.length,
      encounterCount: state.encounters[getRoute().split('/')[1]]?.length || 0,
      ...getValues()
    };
  };
  const saved = field => getState().pageCopy?.[field.scope]?.[field.key];
  const pending = field => drafts.get(field.scope)?.[field.key];
  const value = field => {
    const draft = pending(field);
    return draft === null ? field.original : (draft ?? saved(field) ?? field.original);
  };
  const dirtyCount = scope => Object.keys(drafts.get(scope) || {}).length;
  function paint(field) {
    if (pending(field) === null || (pending(field) === undefined && saved(field) === undefined))
      // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
      field.element.innerHTML = originalMarkup.get(field.element);
    else field.element.textContent = renderCopy(value(field), tokenValues());
    field.element.classList.toggle('copy-removed', value(field) === '' && !getState().settings.developerEditMode);
    if (!getState().settings.developerEditMode) return;
    field.element.classList.add('copy-editable');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-edit-handle';
    button.dataset.copyUi = '';
    button.textContent = '✎';
    button.setAttribute('aria-label', `Edit ${field.label}`);
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      open(field);
    });
    field.element.append(button);
  }
  function updateToolbar() {
    if (!toolbar) return;
    const count = dirtyCount(getRoute()) + dirtyCount('site');
    toolbar.querySelector('[data-copy-status]').textContent = count
      ? `${count} unsaved text change${count === 1 ? '' : 's'}`
      : 'Edit mode · use the pencil beside a text block';
    toolbar.querySelector('[data-copy-command="save"]').disabled = saving || !count;
  }
  function stage(field, text) {
    const entries = drafts.get(field.scope) || {};
    const base = saved(field);
    if (text === base || (text === null && base === undefined)) delete entries[field.key];
    else entries[field.key] = text;
    drafts.set(field.scope, entries);
    fields.filter(f => f.scope === field.scope && f.key === field.key).forEach(paint);
    updateToolbar();
  }
  async function commit(scope, entries) {
    if (!Object.keys(entries).length) return;
    await save('save-copy', { scope, entries });
    const remaining = drafts.get(scope) || {};
    for (const [key, text] of Object.entries(entries)) if (remaining[key] === text) delete remaining[key];
    drafts.set(scope, remaining);
  }
  async function savePage() {
    if (saving) return;
    saving = true;
    updateToolbar();
    try {
      for (const scope of [getRoute(), 'site']) await commit(scope, { ...(drafts.get(scope) || {}) });
      notify('Page text and shared labels saved.');
    } catch (error) {
      notify(error.message, true);
    } finally {
      saving = false;
      updateToolbar();
    }
  }
  function open(field) {
    selected = field;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = uid + '-editor-dialog';
      dialog.className = 'copy-editor-dialog';
      dialog.setAttribute('aria-labelledby', uid + '-dialog-title');
      dialog.dataset.copyUi = '';
      // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
      dialog.innerHTML = `<form id="copy-text-form"><div class="dialog-top"><h2 id="copy-dialog-title">Edit text</h2><button type="button" class="icon-button" data-copy-command="close" aria-label="Close text editor">×</button></div><div class="copy-dialog-body"><p id="copy-field-label"></p><label class="zone-field">Text<textarea id="copy-text-value" rows="7" maxlength="4000"></textarea></label><details><summary>Original wording</summary><p id="copy-original"></p></details><p class="preview-note">Plain text only. Live values: ${copyTokens.map(t => `{${t}}`).join(', ')}.</p><p class="form-status" role="status" id="copy-dialog-status"></p><div class="form-actions"><button class="button primary" type="submit">Save this section</button><button type="button" class="button secondary" data-copy-command="preview">Preview change</button><button type="button" class="text-button" data-copy-command="delete">Delete text</button><button type="button" class="text-button" data-copy-command="default">Use original wording</button><button type="button" class="text-button" data-copy-command="close">Cancel</button></div></div></form>`;
      // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
      dialog.innerHTML = dialog.innerHTML.replaceAll('id="copy-', 'id="' + uid + '-');
      document.body.append(dialog);
      query('form').addEventListener('submit', async event => {
        event.preventDefault();
        if (saving) return;
        const field = selected,
          input = query('textarea').value,
          text = input === field.original ? null : input;
        stage(field, text);
        saving = true;
        const button = query('[type=submit]');
        button.disabled = true;
        try {
          await commit(field.scope, { [field.key]: text });
          dialog.close();
          notify('Section text saved.');
        } catch (error) {
          query('#copy-dialog-status').textContent = error.message;
        } finally {
          saving = false;
          button.disabled = false;
          updateToolbar();
        }
      });
      dialog.addEventListener('click', event => {
        const command = event.target.closest('[data-copy-command]')?.dataset.copyCommand;
        if (command === 'close') dialog.close();
        if (command === 'preview') {
          const text = query('textarea').value;
          stage(selected, text === selected.original ? null : text);
          dialog.close();
        }
        if (command === 'delete') {
          query('textarea').value = '';
          query('#copy-dialog-status').textContent = 'Text cleared. Save this section or preview the deletion.';
        }
        if (command === 'default') query('textarea').value = selected.original;
      });
    }
    query('#copy-field-label').textContent =
      `${field.label}${field.scope === 'site' ? ' · shared across the website' : ' · this page only'}`;
    query('textarea').value = value(field);
    query('#copy-original').textContent = field.original;
    query('#copy-dialog-status').textContent = '';
    dialog.showModal();
    query('textarea').focus();
  }
  function attach(main) {
    toolbar = null;
    fields = [];
    main.querySelectorAll('.copy-toolbar').forEach(el => el.remove());
    const add = (element, scope, key, label) => {
      if (!element || fields.some(f => f.element === element)) return;
      // A node can survive a partial render; remember its original text, not its saved override.
      const original =
        element.dataset.copyOriginal ?? element.dataset.copyDefault ?? element.textContent.trim().replace(/\s+/g, ' ');
      if (!original) return;
      if (!originalMarkup.has(element)) originalMarkup.set(element, element.innerHTML);
      element.dataset.copyOriginal = original;
      fields.push({
        element,
        scope,
        key: key || element.dataset.copyKey || copyKey(original),
        label: label || element.dataset.copyLabel || original.slice(0, 60),
        original
      });
    };
    for (const element of main.querySelectorAll(
      '[data-copy-key],h1,h2,h3,h4,p,legend,.eyebrow,.callout,.guide-panel li,.setting-row>span>strong,.setting-row>span>small'
    )) {
      if (
        element.closest('[data-copy-skip]') ||
        (element.hidden && !element.classList.contains('copy-removed')) ||
        (!element.dataset.copyKey && element.closest(excluded)) ||
        element.querySelector('input,select,textarea,a,button:not(.copy-edit-handle)') ||
        (element.closest('#definition-form .panel-heading') && element.tagName === 'H2')
      )
        continue;
      if (element.parentElement.closest('[data-copy-key],p')) continue;
      add(element, getRoute());
    }
    if (includeChrome) {
      for (const link of document.querySelectorAll('#sidebar .nav-items a'))
        add(link.querySelector('span'), 'site', `nav-${link.hash.slice(1).replaceAll('/', '-')}`);
      for (const link of document.querySelectorAll('#sidebar .nav-section-link'))
        add(link.querySelector('span'), 'site', 'group-wilds', 'Wilds section');
      for (const details of document.querySelectorAll('#sidebar details'))
        add(
          details.querySelector('summary>span'),
          'site',
          `group-${details.dataset.group.toLowerCase().replaceAll(' ', '-')}`
        );
      document.querySelectorAll('footer>span').forEach((element, index) => add(element, 'site', `footer-${index}`));
      add(document.querySelector('.brand-title'), 'site', 'brand-title', 'Website name');
      add(document.querySelector('.brand small'), 'site', 'brand-subtitle', 'Website subtitle');
    }
    for (const field of fields) {
      field.element.classList.remove('copy-editable');
      paint(field);
    }
    if (!getState().settings.developerEditMode) return;
    toolbar = document.createElement('div');
    toolbar.className = 'copy-toolbar';
    toolbar.dataset.copyUi = '';
    // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
    toolbar.innerHTML = `<span data-copy-status role="status"></span><div><button class="button primary" data-copy-command="save">Save page</button><button class="button secondary" data-copy-command="discard">Discard drafts</button><button class="text-button" data-copy-command="restore">Restore page defaults</button><button class="text-button" data-action="toggle-copy-mode">Exit edit mode</button></div>`;
    main.prepend(toolbar);
    toolbar.addEventListener('click', event => {
      const command = event.target.closest('[data-copy-command]')?.dataset.copyCommand;
      if (command === 'save') savePage();
      if (command === 'discard') {
        drafts.delete(getRoute());
        drafts.delete('site');
        fields.forEach(paint);
        updateToolbar();
      }
      if (command === 'restore') {
        const scope = getRoute();
        drafts.set(scope, Object.fromEntries(Object.keys(getState().pageCopy?.[scope] || {}).map(key => [key, null])));
        fields.filter(f => f.scope === scope).forEach(paint);
        updateToolbar();
        notify('Original page text previewed. Save page to apply, or discard drafts.');
      }
    });
    updateToolbar();
  }
  window.addEventListener('beforeunload', event => {
    if ([...drafts.values()].some(d => Object.keys(d).length)) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  return { attach, close: () => dialog?.close() };
}
