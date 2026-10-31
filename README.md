<div align="center">

![Gallorin v1.3.0](docs/assets/gallorin-banner.svg)

# Gallorin v1.3.0: The Lucky Horseshoe

**Desktop horse collection game · Windows**

[Download](https://github.com/zanderlx/Gallorin/releases/latest) · [Changelog](CHANGELOG.md)

</div>

## Play — recommended

1. Download the **Gallorin Setup .exe** from [Releases](https://github.com/zanderlx/Gallorin/releases/latest).
2. Run the installer, then open Gallorin from its shortcut.
3. Select **Play**.

The installer includes everything needed. Players do not need Node.js, Git, npm, or the source folder.

**Future updates:** the installed app checks for published releases. Use **Esc → Check For Updates**, choose **Download**, then **Restart and Install**. You can update inside the app without downloading another installer manually. Saves and personal settings are retained.

## Features

- Explore zones and tame, rename, favorite, sell, import, and export horses.
- View full-body artwork and portraits, with provided SVG artwork enabled by default and optional trait-based artwork.
- Customize species, categorized traits, palettes, eye colors, personalities, and rarity appearance through the Compendium.
- Design zones with artwork presets, tint, species weights, palette filters, and bulk selection controls. Species can also have their own palette pools.
- Inspect horse traits, mutations, notes, and skill XP. Enable Override Horse Data for section-based editing, rerolls, and restoration of recorded original values.
- Manage playlists and sound events with crossfades, independent music/effect volumes, and individual event levels.
- Configure search cooldowns, spawning, economy, profiles, themes, and page text.
- Keep saves local with exports, automatic backups, and hourly snapshots. Saved preferences override bundled defaults.

Breeding, Town activities, equipment gameplay, and skill training remain planned.

## Local development

Install [Node.js 24+ with npm](https://nodejs.org/en/download), then open a terminal in the repo root.

For a fresh clone without dependencies, install them once:

```sh
npm ci
```

Start the desktop app using your current source:

```sh
npm run desktop
```

If dependencies are already installed, use just `npm run desktop`. Repeat `npm ci` when dependency files change.

Refresh the app with **Ctrl+R** after UI changes. Restart `npm run desktop` after Electron or backend changes. This launches a development app with separate saves; it does not rebuild or update your installed copy.

## Browser play — optional

After the same dependency setup, run:

```sh
npm start
```

Open **http://127.0.0.1:4173**. Keep the terminal open while playing.

On Windows, **Launch Gallorin.vbs** starts the browser edition after setup; **Stop Gallorin.vbs** stops it.

## Saves & backups

| Edition | Data folder |
| --- | --- |
| Installed desktop | `%APPDATA%\Gallorin\data` |
| Desktop development | `%APPDATA%\Gallorin Development\data` |
| Browser | `data` inside the repo |

Horses, configuration, imported audio, and playlists stay local. Updates replace app files while retaining saved data. Use **User Interface → Save Management** for exports and backups; use **Open Local Save** in the desktop app to open the active data folder, and copy the music folder separately when transferring imported audio.

## Guides

[Changelog](CHANGELOG.md) · [Desktop guide](desktop/README.md) · [Music guide](docs/music.md)
