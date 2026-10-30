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

All supplied markings and the horn are shown in the original assembly study.

## Active game artwork

`public/art.js` now renders this model facing right on the original scenery,
including its Coat Top tint. Wilds uses the full body; stable cards and both
profile tabs use a headshot. Clicking a profile portrait opens the full body.
Mane and tail share Hair; eyes retain the normal trait and Cosmic override
logic. The horn follows the existing Unicorn species rule.

The old renderer remains available as `legacyHorseArt` and `legacyHorseHeadArt`
from `public/art.js` (implemented in `public/legacy-art.js`).

After editing the source SVGs, run `node scripts/build-horse-art.js` to regenerate
the synchronous browser module `public/horse-art-layers.js`, which is bundled in
desktop installers. Run `npx electron scripts/check-horse-art.cjs` to check the
actual card/profile renderers and cloned viewer references and save screenshots
in `test-results/horse-art/`. This check uses a temporary browser profile and
does not open or write player saves.
