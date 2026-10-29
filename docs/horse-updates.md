# Horse versions and retroactive updates

Enable **Override Horse Data** in **Developer Settings → Game Settings**. Then open a horse in **Stables → My Horses** and select its **Edit** tab. The tab is available only for owned horses while that setting is enabled.

1. Expand a section using the Zones-style dropdown headings.
2. Each section lists **Field**, **Original**, **Override**, and **Change**. Use the pencil icon to choose an exact value. The dice-with-circular-arrows icon generates a value immediately in the Override column; Save applies that displayed result without rerolling it.
3. Pencil popups show only the field’s available values. Trait choices enforce their limits and required minimums. **Use This Override** stages the field; **Cancel** or Escape discards that modal’s edits.
4. Select **Save** inside the section to apply only that section’s edits. A standalone player-save backup is created first.
5. Select **Cancel** inside a section to discard only its unsaved edits. Other sections keep their drafts when you save or cancel.

Names, life stage, calculated age, favorites, and palette-region colors are not editable in this tab. Palette colors come from the chosen palette and its variance. Mutation duplicate behavior follows the existing spawning configuration; there is no per-horse duplicate toggle. Trash appears only when a field has a saved or pending override: it cancels a pending override or stages restoration of the recorded original. Save that section to confirm restoration.

Applied fields that actually changed receive a saved **OVERRIDE** marker. Badges appear only while Edit Mode is enabled, including on the corresponding horse profile values. Original values are recorded before the first tracked override and retained across later edits. Older badge-only overrides show **Not recorded** for their original and cannot be restored automatically; their trash action is disabled.

Each section save validates and applies its changes together. A stale horse or changed configuration prevents the save; unsaved edits remain available to correct or cancel.

## Available controls

- Species, gender, acquisition date/birthday, origin, and size.
- Personality, description, notes, eye color, and palette.
- Each species trait category: Mane, Tail, Pattern, Paint, Cosmetic, Keratin, Ears, Whiskers.
- All unlocked mutations together or individual slots.
- Each skill's level and XP, or reset to level 0. XP uses the normal level-up rules.

Age on profiles is calculated as days since acquisition. Changing the acquisition date updates that calculated age.

Changing personality preserves the saved description unless Description is also selected. Keeping size preserves it even if a size-affecting mutation changes; choose Size → Reroll to regenerate size with the final mutations.

## Species and Cosmic rules

Trait rolls read the current species's Compendium definitions. Mane/Tail require one defined option. Optional categories support up to four Patterns, two Paints, four Cosmetics, and one each of Keratin, Ears, and Whiskers. Rerolls can use a fixed count or a random count. Unknown lists stay unchanged; this tool does not invent missing traits. After adding species traits later, select existing horses and reroll only those categories.

Species rerolls choose a different species when alternatives exist. Every species edit or reroll automatically regenerates traits from the selected species, keeping the existing count in each category where the new species has enough choices and allows that count. Cosmic override rerolls instead fill every category to its maximum available choices. Any count adjustment is explained inside the horse modal. Saving a species edit opens a confirmation modal listing all changed values, including regenerated traits. Nothing is saved until **Confirm Save** is selected; **Cancel** keeps the draft. Species and generated traits are then saved together. A compatible palette is still required. Cosmic palettes remain tied to the horse's Cosmic identity. Palette colors use the palette’s variance settings.

Solar, Lunar, Heavenly, Void, and Astral defining mutations are protected. They survive full rerolls and cannot be removed through individual slot updates. A legacy Cosmic horse whose defining mutation is absent has it restored when regenerating mutations. The four-slot limit still applies; legacy records above that limit require separate review and are preserved.

Full mutation rerolls use current cascading slot chances, weights, species thresholds, and the chosen duplicate policy. Individual slot rerolls draw one eligible standard mutation, independent of the cascading slot chances. Exact mutation selections can include non-Cosmic Special mutations; thresholds still apply. Weight 0 prevents random selection but does not prohibit an explicit developer selection. Duplicate behavior follows the existing spawning configuration.

IDs, capture history, favorites, notes, visuals, and other unselected values remain intact. Existing unsupported fields/equipment are not fabricated. Rarity follows species/Cosmic identity and is not an independent override.

## Horse record metadata

This versioning is independent of the app's release number and the transfer envelope's version:

- **schemaVersion**: stored horse record structure. Legacy records receive version 1 through a backed-up migration.
- **generationVersion**: generation-rules version; currently 1.
- **revision**: increases whenever a stored horse changes. Preview application checks the original record too.
- **updatedAt**: timestamp of an actual record update.
- **lastRegeneratedAt**: timestamp of a regeneration that changed a value.

These fields persist in horse JSON imports/exports. Version-1 files without the metadata still import. Unsupported newer schema/generator versions are rejected rather than rewritten.

Future structural migrations belong in public/horse-version.js. Future generation rules belong in src/horse-regeneration.js and spawning configuration. Add new fields to public/horse-update-fields.js for granular controls. Adding definitions alone does not automatically reroll owned horses.

## Files and recovery

Player records are in the active edition's data/player/save.json. Regeneration backups use data/backups/pre-horse-updates-*.json; schema upgrades use pre-horse-version-*.json. Desktop data is under %APPDATA%/Gallorin/data; development uses %APPDATA%/Gallorin Development/data. Legacy Aetherion folders are never selected automatically. Use the app menu to open the active save folder.

For manual recovery, close the app/server, keep a copy of the current save, and copy the selected standalone player backup over player/save.json. These backups do not replace Compendium configuration.

## Verification

npm test covers legacy migration/transfers, revisions, read-only previews, exact application, stale/configuration conflicts, all-or-nothing batches, all five Cosmic locks, thresholds/duplicates, species-safe traits, and field validation.

Run npx electron scripts/verify-horse-updates.cjs for an actual renderer → API → disk preview/application test. It creates its own temporary save and screenshots and never uses player data.
