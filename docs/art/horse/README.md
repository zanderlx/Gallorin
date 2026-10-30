# Horse artwork study

The eleven untouched source layers in `source/` came from the supplied
`Downloads/base(1).zip` (matching its extracted folder). Every SVG uses the same
1160 × 651 canvas, so the assembly preserves their coordinates.

Run `node scripts/preview-horse-art.js` to randomly select a complete palette from
the bundled Gallorin catalog, or pass its name to reproduce a selection:

```powershell
node scripts/preview-horse-art.js "Natural Gold"
npx electron scripts/capture-horse-preview.cjs
```

The comparison, individual SVGs, selected palette JSON, and PNG are written to
the ignored `test-results/horse-art/` directory. The capture uses an isolated
temporary Electron profile with audio muted before loading the artwork.

The assembly maps each named layer to the corresponding palette channel. Mane
and tail both use Hair. Eyes remain a separate trait; this preview keeps the
source blue eye. Only six-digit pigment fills change; white masks and black
outlines retain their original colors and opacity. IDs and references are
prefixed so both horses can appear in one SVG without mask collisions.

All supplied markings and the horn are shown for this assembly study. It does
not replace the current in-game renderer or select artwork by species/traits.
