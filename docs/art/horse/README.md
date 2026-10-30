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
logic. Saved traits now select artwork through `public/horse-trait-art.js`.
Mane, Tail and Keratin replace their base layers when the category is recorded;
None/empty categories show no replacement. Older records without those fields
keep the base hair and Unicorn horn fallback. Recorded traits replace the
generic diamond Paint/Pattern samples. The source coat, nose, socks and hooves
retain their palette colors.

The old renderer remains available as `legacyHorseArt` and `legacyHorseHeadArt`
from `public/art.js` (implemented in `public/legacy-art.js`).

After editing the source SVGs, run `node scripts/build-horse-art.js` to regenerate
the synchronous browser module `public/horse-art-layers.js`, which is bundled in
desktop installers. Run `npx electron scripts/check-horse-art.cjs` to check the
actual card/profile renderers and cloned viewer references and save screenshots
in `test-results/horse-art/`. This check uses a temporary browser profile and
does not open or write player saves.

## Trait vector library

Seven artwork categories use deterministic SVG recipes. Cosmetic overlays are
disabled, including direct calls to the trait renderer; saved Cosmetic traits
still appear as profile data. The supplied
reference has 3,356 species/category/name entries; it contains names rather than
individual prose descriptions. Designs interpret those names through visual
families (braids, curls, feathers, botanical hair, antlers, fangs, crowns, plates,
fur, spots, stripes, flowers, hearts, bones, halos and others), anatomical words,
length/density qualifiers and stable per-name geometry. Hair length and texture
are independent: short fur, short curls and short waves stay short. Only named
braids use interwoven links; fur uses a feathered contour, curls use loops, and
blunt/tufted/upturned tails use their corresponding tip and posture. These are procedural
interpretations with shared visual families and individual contours/strand
layouts rather than thousands of manually drawn assets. The catalog regression
test compares path geometry after ignoring labels, colors and transforms and
rejects duplicate designs for distinct supported category/name pairs. Small charm motifs are stylized symbols.

Paint and Pattern clip to the actual coat silhouettes; multiple selected traits
stack in a stable order. External adornments can overlap and extend outside the
coat. Full body, headshots, import previews and the full-art viewer all use the
same assembly. Saved records and trait eligibility are unchanged.

`traitArtDefinition(category, name, description)` resolves a visual recipe;
`traitArtwork(category, name, {colors, description})` renders it independently
of species. Optional prose can refine future custom definitions. This API is
available for a later gallery; no gallery page or controls have been added.

To regenerate the representative design contact sheet:

```powershell
node scripts/preview-horse-traits.js
npx electron scripts/capture-horse-preview.cjs trait-studies 1500 1360
```

For a same-palette tail comparison, run `node scripts/preview-horse-traits.js --tails`,
then `npx electron scripts/capture-horse-preview.cjs tail-studies 1500 1360`.

Mane/tail variants derive directly from the supplied SVG path coordinates,
including their forelock and tail root. Standard Mane/Tail retain the original
geometry. Other names reshape those paths around their anatomical attachments;
texture details are clipped to the resulting silhouette. Keratin is composited
before a clipped redraw of the source ears and before selected ear artwork.
Keratin recipes distinguish nasal horns, broken/curved horns, ram versus kudu
curls, moose versus branching antlers, tusks versus saber fangs, and crowns
versus helmets. Use `--keratins` with the preview script for a contact sheet.

Tail variation leaves the original attachment control points untouched and blends
reshaping smoothly outward. Paint/Pattern share regional placement reservations
to reduce overlap and no longer scatter motifs over the whole body. Face
markings use very small footprints and lower opacity; facial whisker decorations
are reduced as well. Use `--markings` to create `marking-studies.svg`.
