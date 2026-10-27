# Changelog

All notable changes to Gallorin are documented here.
New entries use Added, Updated, and Fixed sections grouped by feature. Older entries retain their original categories.
Gallorin uses major.minor.patch versioning. Gallorin begins at version 1.0.0.
Legacy milestones are archived as 0.1.0–0.7.0 under Aetherion (Legacy).
Dates for legacy entries come from their release commits.

## [1.2.4] - Unreleased

Simpler desktop navigation, local save access, and more reliable startup.

### Added

- **Desktop & Saves**
  - Open Local Save in Save Management opens the active development or installed app's data folder.
  - Check For Updates in the Escape menu.

- **Interface**
  - Added secret setting.

### Updated

- **Navigation & Profile**
  - Save Management moved from Developer Settings to User Interface.
  - Removed My Profile from the sidebar and Reset Profile from the profile page.
  - Removed the desktop menu bar. Ctrl+R refresh remains available in development builds.

- **Compendium**
  - Renamed the Other palette category to Developer, including existing saved palettes.

### Fixed

- **Desktop**
  - Prevented occasional startup failures caused by automatically selecting a blocked network port.

- **Wilds**
  - Search The Wilds no longer briefly flashes a blocked cursor while processing a search. Configured cooldowns still disable the button.

## [1.2.3] - 2026-10-26

More control over sound events and Cosmic eye colors, with consistent button feedback.

### Added

- **Music & Sound Effects**
  - Button Click sound event for text buttons, using Justsomesounds Click Sound by default. Icon-only controls and dropdown menus remain silent.
  - Individual volume sliders in Sound Events, multiplied by the master Sound Effects volume. Events sharing an audio file can have independent levels.

- **Compendium**
  - Cosmic eye-color section for Solar, Lunar, Heavenly, Void, and Astral. Artwork colors can be edited locally and apply to existing and future Cosmic horses without changing their generated Eye Color traits.
  - Cosmic names and rarity are fixed, shown in disabled-style boxes, and protected from deletion. Cosmic artwork colors stay outside normal eye-trait generation and horse-update choices.

### Updated

- **Music & Sound Effects**
  - Horse Sold now defaults to Alexzavesa Clinking Coins. Existing saved assignments are preserved.
  - Assigning a sound to an empty event starts its volume at 100%. Replacing an assigned sound preserves the event's level; clearing it and assigning again starts at 100%.
  - Song and sound-effect name/artist editors fit their text and have adjacent checkmark buttons that save the entire row. Sound-event selection uses the same inline confirmation layout.
  - Icon-only import controls sit beside All Songs and All Sound Effects, with tooltips and no button-click sound.
  - Sound Events uses Event, Sound Effect, and Volume columns, with volume meters aligned to the Artist column in the library tables.
  - Audio Settings uses the same primary button style as Compendium Create/Add actions.

- **Interface**
  - Removed visual keyboard-focus rings and focus-only highlights throughout gameplay, dialogs, and the main menu. Native keyboard controls and mouse-hover feedback remain available.

### Fixed

- **Navigation & Buttons**
  - Selecting a sidebar page preserves the navigation's scroll position.
  - Action buttons darken on hover without lifting. Search The Wilds uses the shared styling without its previous glow.
  - Escape-menu buttons visibly darken on hover while keeping their base colors and dimensions.
  - Play and Back To Game no longer appear permanently highlighted when their menus open.

## [1.2.2] - 2026-10-25

Safer saves and faster page loads. Included in v1.2.3 without a separate release.

### Updated

- **Saves & Backups**
  - Saves, settings, and the music library are written to disk safely before replacing the previous file, so a power cut or crash cannot leave them empty.
  - A backup snapshot is kept before your first change each session and at most hourly after, keeping the newest 20.
  - Automatic upgrade backups are trimmed to the newest 20 of each kind. Manual backups are never removed.
  - Save files are stored as compact JSON, about a third smaller.
  - Desktop logs stay small by keeping one older copy after about 1 MB.

- **Performance**
  - Clicks and page loads are about twice as fast, and faster still with long sale histories.
  - Settings files are reloaded only when they change, including changes you make by hand.
  - Imported songs stream to disk instead of being held in memory.

## [1.2.1] - 2026-10-25

Restore bundled palette additions for existing installations and keep Wilds zones filled during the search cooldown.

### Updated

- **Wilds & Game Settings**
  - Reverted the 1.2.0 change that left empty spaces during the search cooldown. Taming or selling a horse replaces it again, and zones are never left empty. The cooldown only limits new searches.

### Fixed

- **Compendium**
  - Existing installations receive missing bundled palettes without replacing local palette customizations.
  - Restored palettes: Ash, Beaver, Bisorse 1, Blueberry, Calaverita 1, Fae 1–5, Flora 1–3, Gargoyle 1, Ginger, Girafetti 1–2, Hauntmare 1–6, Jester, Kelpie 1, Lemon, Nephyrian 1, Orange, Pink Lemonade, Serpentine 1–4, Sovremeign 1, Strawberry, Tawny, Umber, Vaporwave, Vegetable, and Vibrant Pastel.

## [1.2.0] - Patient Equines Yearn Toward Overgrown Nature - 2026-10-25

More control over encounters, sound events, and Compendium settings.

### Added

- **Wilds & Game Settings**
  - Configurable search cooldown with a persistent cross-zone countdown, disabled search button, and explanatory tooltip.
  - Taming or selling during cooldown leaves empty spaces instead of generating replacement horses.

- **Compendium**
  - Independent rarity Border and Glow controls; Glow requires an enabled border.
  - Seventeen categorized palettes, including Orange and Lemon.

- **Music & Sound Effects**
  - Sound Events table with fixed event names and dropdowns for assigning one sound effect per event; effects can be shared across events.
  - Horse Sold event, assigned Loot Coin Small by default.
  - Bundled Loot Coin Small and Benkirb Shine 7 268909 sound effects.
  - Horse Respawn Timer Finished event, assigned Universfield Magic Twinkle by default.

### Updated

- **Wilds & Game Settings**
  - Refined Search the Wilds hover feedback with a stable background, small lift, and subtle glow.
  - Search cooldown defaults are enabled with a 90-second duration; saved local settings take precedence.

- **Compendium**
  - Renamed Rarity Settings to Rarity Manager and simplified its cards.
  - Unified eye-color, mutation, and palette editor footers, with conditional Save/Cancel controls on the right and auxiliary actions on the left.
  - Improved spacing around rarity swatches and editor controls.
  - Updated the Lettuce palette using the supplied colors.

- **Music & Sound Effects**
  - Renamed the navigation entry to Music & Sound Effects.
  - Separated event assignments from the All Sound Effects library, with importing, previews, metadata editing, sorting, and confirmed library deletion.
  - Assigned Benkirb Shine 7 268909 to Cosmic Horse Spawn by default.
  - Default sound-effect volume is 50%; music and effects retain independent controls and saved preferences.

- **Layout & Notifications**
  - Notifications and the respawn countdown stack at the bottom right above the music player.
  - Added bottom clearance across pages so controls can scroll above notifications.

- **Local Settings**
  - Saved local values override bundled defaults; missing fields inherit defaults, while Off, zero, and empty playlists remain intentional overrides.
  - Reimported songs retain their local track IDs and assignments without restoring deleted bundled copies.

### Fixed

- **Compendium**
  - Color pickers no longer open when clicking outside the actual swatch.

- **Layout & Notifications**
  - Removed unintended Changelog markup from empty-state messages.

## [1.1.1] - 2026-10-24

Small music-management improvements and a quieter default volume.

### Changed

- Lowered the default music volume to 15%. Existing saved volume preferences are retained.
- Removed User Interface and Developer Settings from music folders and playlist assignment choices. Their pages keep the current music playing, including when older music assignments exist.
- Show each folder's Show All/Hide All button only while that folder is open.

### Fixed

- Added the missing confirmation before removing a song from a playlist, with Cancel and Remove options.

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
