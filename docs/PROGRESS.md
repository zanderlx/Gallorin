# Aetherion (Legacy) — Version 0.4.0 Progress

## Implemented

- Local Node HTTP server, browser interface, offline SVG artwork, and persistent JSON saves.
- Preview Wilds encounters; catch, rename, favorite, sell, delete, search, and sort horses.
- Stable collection and preserved sold records, current-gold editing, sale prices, encounter count, and stable limits.
- Create/edit/randomize/delete zones with editable species, palette, and atmosphere pools.
- Create/edit/duplicate/delete species, traits, palettes, eyes, personalities, mutations, items, item themes, atmospheres, and website themes.
- Five supplied **Mutated Horse** palettes: Solar, Lunar, Astral, Heavenly, Void. All nine colors are preserved; old editable libraries receive missing entries without replacing custom data.
- Nine website themes, dark/light variants, custom theme colors, and a crest that follows theme tokens.
- Game Settings groups gameplay controls and a separate Economy section with balance, prices, and sale history.
- Profiles with display name, About Me, and twelve named avatar color choices. Random avatar generation has been removed; previously saved colors are preserved.
- Alphabetized navigation grouped by setting type, scroll retention, uppercase option labels, horizontal Wilds tabs, and change-only Save/Cancel controls.
- Cached/debounced site search, avoiding unnecessary horse-art rendering and repeat visit saves.
- Automatic/dated backups, data export, confirmation before deletions, reference cleanup, and preservation of collected horse snapshots.
- Version-1 README with local banner, prerequisite/download links, startup/troubleshooting steps, feature list, and roadmap.
- In-app **Developer Settings → Remaining Features** page.

## Remaining systems

See [README — Remaining Features](../README.md#remaining-features) for the feature-by-feature requirements and [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) for detailed rule ambiguities.

- [ ] Remaining Horse Editor fields (species, palette, traits, mutations), duplication/import, and custom horse creator.
- [x] Data-driven Cosmic/Wild generation, weighted zone creatures, cascading mutations, and file-backed CRUD controls.
- [ ] Executable mutation/item effects and exact species/trait artwork.
- [ ] Breeding, color/trait inheritance, and family history.
- [ ] Inventory, equipment, consumables, gacha, and shop.
- [ ] Town activities and event scheduling.
- [ ] Save import/restore, reset controls, and backup retention options.
- [ ] Advanced collection filters, statistics, bulk actions, final game defaults.
- [ ] Desktop/mobile browser, keyboard, accessibility, and visual QA.

The specified spawning pipeline is implemented; see SPAWNING.md. Full horse editing, gameplay effects, exact artwork, breeding, and activity mechanics remain separate systems.

## Verification

**103 automated tests pass.** Tests use isolated save folders and a temporary local server; the user's save is not modified by tests. Coverage includes palette values and migration, deletion/reference cleanup, profiles, theme contrast, contextual templates, navigation, form state, persistence, export, backups, and same-origin API restrictions.

Browser observation was blocked by the browser tool's localhost policy. No alternate browser workaround was used. Visual appearance and full interaction behavior are therefore not claimed as verified.

### Manual browser checklist

1. Review desktop, tablet, and phone layout, including navigation and horizontal location tabs.
2. Change themes in both modes; confirm the crest and dialogs match.
3. Select profile colors, save About Me, refresh, and verify persistence.
4. Edit Game Settings and Economy separately; ensure Save/Cancel track real changes.
5. Add/edit/delete definitions and zones; check confirmation text and reference updates.
6. Catch, inspect, rename, favorite, sell, and delete a horse; verify balances and history.
7. Search via the header or Ctrl+K; follow page, definition, zone, and horse results.
8. Check keyboard navigation, Escape, dialog focus, mobile drawer focus, and reduced motion.
9. Create a dated backup and export; verify saved data and restart retention.

## Horse view refinements

Implemented nine-color previews without palette names, simplified Wilds/profile labels, larger fonts, and saved random adult birthdays displayed as MM-DD-YYYY. Existing birthdays remain unchanged. Changes are committed separately and remain unpushed per the current workflow preference. Browser visual checks remain unverified.


### Latest horse profile update

- Catch-time name prompt and owned-name pencil.
- Saved, scrollable horse notes with change-only Save/Cancel.
- Stables fixed order: My Horses, Favorites, Breeding; old management/history navigation removed.
- New controls verified with template and isolated store tests; browser interaction QA remains pending.

- Wild species now use independent, equally likely draws from each zone pool; repeats are allowed.

- Owned names edit inline and save on blur/Esc. Notes stay fixed-size; per-horse editable personality descriptions appear above Notes and default on catch.

- Zone tags are editable as one tag per line, including empty lists, with legacy defaults and icon-free live/Wilds rendering.

- My Zones uses trash-icon deletion, no Short Tagline field, simplified navigation visibility text, and persistent Event classification for original/custom zones.

- Individual horse import/export uses versioned aetherion-horse JSON snapshots. Fresh IDs prevent overwrites; imports validate data and stable capacity. Export replaces Release Horse in owned profiles.

- Header gold no longer links to Economy. Economy has separated balance/default cards and sale history with legacy archive support; future transactions preserve horse names.

- Merged Economy navigation into Game Settings. Removed settings guide cards and Save Management transaction/guide panels; saved transaction records remain available to sale history.

- Economy uses one card for Current Gold and Horse Selling Price, saved together atomically. Starting Gold is hidden; existing internal values remain preserved.

- Horse profiles show Birthday from the saved catch date and Age as elapsed calendar days. Uncaught horses show Not caught yet. Birthday edits update the catch date; Age is derived rather than separately editable.

### Version 0.3.0 — current spawning and configuration

- Five-manager Horse Definitions dashboard with master JSON CRUD, species rarity tiers, world-zone assignments, asset metadata, mutation thresholds/tokens, and personality system IDs/tags.
- Local `data/config/` master files and one creature file per zone; ID-based species references and tier synchronization.
- Cosmic 0.325% split, uniform Cosmic species, weighted Wild species, chained mutation slots, duplicate lockout, 50/50 gender, and shifted/clamped eleven-step sizes.
- Dynamic file reads on spawn, atomic writes, rollback/recovery journal, and dated pre-migration player backup. Existing horses remain unchanged.
- Historical preview notes above describe earlier versions and are superseded by this update. Visual browser QA remains unverified.

### Version 0.4.0 — definition managers and horse profiles

- Separate Species and Traits navigation; definition paths in breadcrumbs.
- Eye cards with filters, rarity groups, reference percentages, random color generation, and modal CRUD with unsaved-change protection.
- Personality cards, emojis, modal create/edit, and compact search.
- Horse profile essentials, counted optional trait groups, square palette swatches, four mutation slots and locks, and centered Catch.
- See README for current behavior and remaining visual QA.
