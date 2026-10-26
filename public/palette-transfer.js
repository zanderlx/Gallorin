import { validateDefinition } from './definitions.js';

// One portable JSON document represents one palette; local IDs are regenerated.
export function createPaletteDocument(palette) {
  const values = validateDefinition('palettes', palette);
  delete values.systemId;
  return { format: 'aetherion-palette', version: 1, palette: values };
}
export function readPaletteDocument(document, catalog) {
  if (
    !document ||
    document.format !== 'aetherion-palette' ||
    document.version !== 1 ||
    !document.palette ||
    typeof document.palette !== 'object' ||
    Array.isArray(document.palette)
  )
    throw new Error('Choose an Gallorin palette JSON file (version 1).');
  const input = { ...document.palette };
  delete input.systemId;
  const values = validateDefinition('palettes', input);
  delete values.systemId;
  if (values.speciesIds.some(id => !catalog.species.some(species => species.id === id)))
    throw new Error('This palette links to species missing from your registry. Add those species before importing.');
  const base = values.name.slice(0, 65);
  let suffix = 1;
  while (catalog.palettes.some(p => p.name.toLowerCase() === values.name.toLowerCase()))
    values.name = `${base} imported${suffix++ === 1 ? '' : ` ${suffix - 1}`}`;
  return values;
}

export function createPaletteTransfers({ getCatalog, openDraft, notify }) {
  let picker,
    loading = false;
  return {
    importPalette() {
      if (loading) return;
      if (!picker) {
        picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = '.json,application/json';
        picker.hidden = true;
        picker.setAttribute('aria-label', 'Import palette JSON');
        document.body.append(picker);
        picker.addEventListener('change', async () => {
          const file = picker.files[0];
          if (!file || loading) return;
          loading = true;
          try {
            if (file.size > 262144) throw new Error('Palette files must be 256 KB or smaller.');
            let data;
            try {
              data = JSON.parse(await file.text());
            } catch {
              throw new Error('This file is not valid JSON.');
            }
            openDraft(readPaletteDocument(data, getCatalog()));
            notify('Review the imported palette, then Save to add it.');
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
    exportPalette(id) {
      const palette = getCatalog().palettes.find(p => p.id === id);
      if (!palette) throw new Error('Palette not found.');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(createPaletteDocument(palette), null, 2) + '\n'], { type: 'application/json' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `gallorin-palette-${palette.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Palette exported.');
    }
  };
}
