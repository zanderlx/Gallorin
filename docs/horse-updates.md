# Horse versions and retroactive updates

Open **Developer Settings → Horse Overrides** and enable the tool. This is separate from page-text Edit Mode.

1. Choose a horse from the stable-style card grid. Search by name, species, or personality, or sort the cards. Its current saved details appear below. Switching horses clears prepared overrides.
2. Leave everything you want to preserve at **Keep**.
3. Click **Edit** beside a field to open its modal. Choose **Set** for an exact value, **Reroll** for a generated value, or the available clear/reset option. Trait checkboxes stop accepting choices at the category limit and explain required minimums. **Use This Override** stages the field; **Cancel** or Escape discards that modal’s edits. **Reset Overrides** clears all staged fields.
4. Generate **Preview Changes**. Review each horse's current/proposed values and warnings.
5. Choose **Apply Reviewed Changes**. A dated standalone player-save backup is created first.

A preview never rerolls when applied: the server keeps the exact generated results for ten minutes. Changing a selected horse, the configuration, or relevant settings invalidates that preview. Reloading/restarting requires generating another preview. Changes apply together; a stale horse prevents the whole batch from applying.

## Available controls

- Species, name, gender, life stage, acquisition date/birthday, age in days, origin, size, favorite.
- Personality, description, notes, eye color, palette, and each of the nine palette colors.
- Each species trait category: Mane, Tail, Pattern, Paint, Cosmetic, Keratin, Ears, Whiskers.
- All unlocked mutations together or individual slots.
- Each skill's level and XP, or reset to level 0. XP uses the normal level-up rules.

Age on profiles means days since acquisition. Setting age in days changes the acquisition date. Choose either age in days or birthday/date in one update. The legacy life-stage field does not replace the displayed day count.

Changing personality preserves the saved description unless Description is also selected. Keeping size preserves it even if a size-affecting mutation changes; choose Size → Reroll to regenerate size with the final mutations.

## Species and Cosmic rules

Trait rolls read the current species's Compendium definitions. Mane/Tail require one defined option. Optional categories support up to four Patterns, two Paints, four Cosmetics, and one each of Keratin, Ears, and Whiskers. Rerolls can use a fixed count or a random count. Unknown lists stay unchanged; this tool does not invent missing traits. After adding species traits later, select existing horses and reroll only those categories.

Changing species requires replacing incompatible traits/palettes. Cosmic palettes remain tied to the horse's Cosmic identity. Individual palette colors can still be explicitly adjusted.

Solar, Lunar, Heavenly, Void, and Astral defining mutations are protected. They survive full rerolls and cannot be removed through individual slot updates. A legacy Cosmic horse whose defining mutation is absent has it restored when regenerating mutations. The four-slot limit still applies; legacy records above that limit require separate review and are preserved.

Full mutation rerolls use current cascading slot chances, weights, species thresholds, and the chosen duplicate policy. Individual slot rerolls draw one eligible standard mutation, independent of the cascading slot chances. Exact mutation selections can include non-Cosmic Special mutations; thresholds still apply. Weight 0 prevents random selection but does not prohibit an explicit developer selection. The duplicate checkbox affects this operation only.

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
