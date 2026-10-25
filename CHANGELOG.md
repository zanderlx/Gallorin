# Changelog

All notable changes to Gallorin are documented here.
Entries use Added, Changed, Fixed, Removed, and Security sections where relevant.
Gallorin uses major.minor.patch versioning. Gallorin begins at version 1.0.0.
Legacy milestones are archived as 0.1.0–0.7.0 under Aetherion (Legacy).
Dates for legacy entries come from their release commits.

## [1.1.0] - The Melodies of Gallorin - 2026-10-24

A location-aware soundtrack, independent sound effects, and a compact player bring music across Gallorin.

### Added

- Full-width music player with play/pause, previous/next, stop, restart, seeking, music volume, and mute.
- Animated compact player that retains playback controls and remembers its layout preference.
- User Interface → Music with navigation folders, collapsible playlists, section/page Show All controls, and matching navbar icons.
- Songs and sound effect libraries with MP3 import, duration metadata, and independent table sorting.
- Row options for searchable playlist/event assignment, inline title and artist editing, and confirmed deletion.
- A checkmark or Enter saves both edited song fields; clicking away offers Save or Discard.
- Ordered multi-song playlists for zones, navigation sections, individual pages, default, and the main menu.
- Ten bundled audio files alongside the default song, Glades of Gallorin.
- Cosmic Horse Spawn sound event, initially assigned Universfield Magic Twinkle, playing over background music through the independent Sound Effects channel.

### Changed

- Imported 28 categorized palettes: 23 additions and five replacements, including the updated Bisorse 1 colors.
- Fresh-install defaults now use 25% music volume, 100% Sound Effects volume, unmuted music, and a two-second crossfade.
- Aetherion Wilds uses its own song, Hallowhoof uses Halloween 1 followed by Halloween 2, and every Town page uses Town. Unassigned locations use Default.
- Existing users retain their saved audio preferences, library, and assignments when repo defaults change.
- Unified Audio Settings across the title screen and gameplay, with separate Music/Sound Effects sliders and a snapped 0–10 second crossfade slider.
- All-section assignments apply throughout a section. Individual choices are disabled and unchecked under All; selecting every individual playlist consolidates into All when saved.
- Playlist removal preserves the library file; library deletion removes the file and all its assignments.
- Play and trash controls appear on row hover/focus. Song playback highlights its row, and clicking the player title/artwork reveals it in All Songs.
- Sorting cycles ascending, descending, and original row order without changing playlist playback order.
- Added smooth sidebar/folder transitions, aligned music tables and controls, limited fullscreen progress width, and improved artwork transitions.
- Moved notification toasts to the bottom right above the player, and hid the page scrollbar while retaining scrolling.

### Fixed

- Sound effects preserve background music playback and use their own live volume.
- Cosmic spawn sounds trigger only for newly generated encounters and do not replay when saved encounters reload.
- Gallorin uses its own installed/development data folders rather than falling back to legacy Aetherion paths.
- Missing MP3 durations are recovered from metadata, including existing libraries.
- Rapid mute/volume changes persist in order without stale playback polling overwriting them.
- New-install playlist defaults use bundled track identifiers, including the reimported Town song.

## [1.0.0] - The Symphony of the Wilds - 2026-10-23

The first Gallorin release brings forward the Aetherion legacy with new branding and a new platform to play on. Sit down and relax as you listen to the symphony of the wilds!

### Added

- Windows desktop installer with a themed splash and application icon.
- Separate AppData storage and safe migration from browser-edition saves.
- GitHub Releases update checks with download and restart confirmation.
- Packaged desktop smoke tests for startup, saves, export, and reload.
- Woodland title screen with Play, Settings, and Exit Game.
- Continuous looping music with saved volume, mute controls, and a 35% default.
- Themed Escape menu with Back To Game, Settings, Main Menu, and Exit Game.
- Audio settings and a music toggle during gameplay.
- Longer silent splash and smooth transitions between title screen and gameplay.
- New Gallorin logo across the title screen, splash, sidebar, Escape menu, favicon, README, and desktop icons.
- Versioned horse records with schema, generation, and revision metadata preserved through imports and exports.
- Developer Settings → Horse Updates (work in progress): keep, set, or reroll selected details for individual horses or batches of up to 100. Further refinements are planned.
- Preview exact changes before applying, with automatic backups and protection against stale previews.
- Species-aware trait regeneration, individual mutation-slot controls, Cosmic identity locks, and skill editing.
- A shared Changelog popup beside the version in both the main menu and in-game sidebar, with the complete historical change log.

### Changed

- Matched Escape-menu and in-game audio colors to the selected theme.
- Simplified menu and theme-page wording.
- Moved release publication after packaged smoke testing and pinned workflow actions.
- Renamed the application to Gallorin while retaining Aetherion Wilds as a zone.
- Started fresh Gallorin versioning at 1.0.0 and archived earlier milestones as 0.x releases.
- Updated window titles to show the game name, full version, and current page.
- Preserved existing saves and JSON compatibility through the rebrand.
- Unified in-game history and GitHub release notes around this changelog.
- Release builds validate version consistency and packaged behavior before publication.

### Fixed

- Separated development saves and Chromium caches from the installed app.
- Fixed slider travel, saved-volume handling, and music starting before the title screen.
- Escaped mutation emoji content in card and editor HTML.
- Corrected Friesian spelling, including existing species and horse records.
- Prevented incompatible traits from being retained when changing a horse's species.
- Protected Solar, Lunar, Heavenly, Void, and Astral mutations when rerolling existing horses.
- Prevented legacy Aetherion releases from being offered as Gallorin updates.

## [0.7.0] - Aetherion (Legacy) - 2026-10-23

### Added

- Global and per-palette color variation controls.
- Individual horse skill XP progression.
- Selling from the taming name dialog.
- Windows double-click launch and stop shortcuts.
- Animated gold gain and spending feedback.

### Changed

- Preserved Wilds encounters across page refreshes and replaced only tamed or sold slots.
- Consolidated definition navigation under Compendium.
- Updated economy defaults and streamlined numeric settings controls.

## [0.6.0] - Aetherion (Legacy) - 2026-10-22

### Added

- JSON import/export for palettes, eye colors, and mutations.
- Collapsible Personality and Mutation cards with section and page controls.
- Shared searchable emoji picker.

### Changed

- Redesigned palette cards and editing modals.
- Added colors to incomplete themed palettes.
- Improved responsive manager controls and navigation.
- Autosaved stable notes.

## [0.5.0] - Aetherion (Legacy) - 2026-10-22

### Added

- Two-tab horse profiles and full-horse artwork viewer.
- Per-horse skill/XP displays and sale bonuses.
- Configurable 3–6-column stable grid.
- Editable rarity border colors.
- Cosmic species tier and 105 Hauntmare trait options.

### Changed

- Refreshed Wilds navigation and definition-manager forms.

## [0.4.0] - Aetherion (Legacy) - 2026-10-21

### Added

- Searchable Eye Color cards, rarity sections, and percentage controls.
- Modal CRUD and random eye color creation.
- Personality cards with emojis and modal editing.
- Separate Traits navigation.
- Grouped horse traits and four mutation slots.

## [0.3.0] - Aetherion (Legacy) - 2026-10-21

### Added

- Five local JSON definition managers with complete CRUD.
- Zone/species weight synchronization.
- Cosmic and Wild spawning paths.
- Nineteen standard mutation weights, duplicate lockout, and thresholds.
- Weighted size generation and recoverable configuration transactions.

## [0.2.0] - Aetherion (Legacy) - 2026-10-20

### Added

- Catch-time naming and per-horse notes.
- Editable horse details and website text deletion/restoration.

### Changed

- Updated species spawning, profiles, and navigation.

## [0.1.0] - Aetherion (Legacy) - 2026-10-20

### Added

- Local horse collection and JSON saves.
- Editable definitions and zones.
- Themes, website text editing, profiles, and search.
- Save exports and backups.
