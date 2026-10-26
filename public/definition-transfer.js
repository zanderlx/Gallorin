import { validateDefinition } from './definitions.js';
const names = { eyes: 'Eye Color', mutations: 'Mutation' };
export function createDefinitionDocument(kind, entry) {
  if (!names[kind]) throw new Error('Unsupported definition type.');
  const value = validateDefinition(kind, entry);
  delete value.systemId;
  return { format: `aetherion-${kind}`, version: 1, definition: value };
}
export function readDefinitionDocument(kind, document, catalog) {
  if (
    !names[kind] ||
    !document ||
    document.format !== `aetherion-${kind}` ||
    document.version !== 1 ||
    !document.definition ||
    typeof document.definition !== 'object' ||
    Array.isArray(document.definition)
  )
    throw new Error(`Choose an Gallorin ${names[kind] || 'definition'} JSON file (version 1).`);
  const input = { ...document.definition };
  delete input.systemId;
  const value = validateDefinition(kind, input);
  delete value.systemId;
  if (kind === 'eyes' && value.cosmicType) {
    const existing = catalog.eyes.find(eye => eye.cosmicType === value.cosmicType);
    return { ...value, ...(existing ? { id: existing.id } : {}) };
  }
  const base = value.name.slice(0, 65);
  let suffix = 1;
  while (catalog[kind].some(entry => entry.name.toLowerCase() === value.name.toLowerCase()))
    value.name = `${base} imported${suffix++ === 1 ? '' : ` ${suffix - 1}`}`;
  return value;
}
export function createDefinitionTransfers(kind, { getCatalog, openDraft, notify }) {
  let picker,
    loading = false;
  return {
    importDefinition() {
      if (loading) return;
      if (!picker) {
        picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = '.json,application/json';
        picker.hidden = true;
        picker.setAttribute('aria-label', `Import ${names[kind]} JSON`);
        document.body.append(picker);
        picker.addEventListener('change', async () => {
          const file = picker.files[0];
          if (!file || loading) return;
          loading = true;
          try {
            if (file.size > 262144) throw new Error('Definition files must be 256 KB or smaller.');
            let data;
            try {
              data = JSON.parse(await file.text());
            } catch {
              throw new Error('This file is not valid JSON.');
            }
            openDraft({ ...readDefinitionDocument(kind, data, getCatalog()), imported: true });
            notify(`Review the imported ${names[kind].toLowerCase()}, then Save to add it.`);
          } catch (error) {
            notify(error.message, true);
          } finally {
            loading = false;
            picker.value = '';
          }
        });
      }
      picker.value = '';
      picker.click();
    },
    exportDefinition(id) {
      const entry = getCatalog()[kind].find(entry => entry.id === id);
      if (!entry) throw new Error(`${names[kind]} not found.`);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(createDefinitionDocument(kind, entry), null, 2) + '\n'], { type: 'application/json' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `gallorin-${kind}-${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(`${names[kind]} exported.`);
    }
  };
}
