# Gallorin Desktop

The Electron build wraps the same local game/server. The browser launchers and `npm start` still work.

## Develop and package (Windows x64)

1. Install Node.js 24+ and run `npm ci`.
2. `npm run desktop` opens the desktop app.
3. `npm run desktop:build` creates `dist/Gallorin-Setup-<version>.exe`.
4. Install that file. Players do not need Node, npm, Git, or the repository.

The splash uses the existing gold horse emblem, dark woodland tones, and a 4.5-second minimum reveal. It does not claim a fake loading percentage. The game must finish loading before it appears. Reduced-motion preferences are respected.

If a graphics driver causes problems, set `AETHERION_SOFTWARE_RENDERING=1` before launching. This compatibility switch disables hardware acceleration. The icon generator uses software rendering; regenerate with `npx electron scripts/build-desktop-icon.cjs`.

## Gallorin version series

Current source: **v1.2.4** (release preparation).

Gallorin starts at **v1.0.0 — The Symphony of the Wilds**. Aetherion releases are legacy history. Gallorin tags use gallorin-v followed by major.minor.patch to avoid collisions with legacy tags. The updater accepts only this series. Legacy Aetherion users need a one-time manual Gallorin install because the version resets from 2.0.0 to 1.0.0; saves remain compatible.

## Saves and configuration

Windows data is stored independently of the installation:

- `%APPDATA%\Gallorin\data\player\save.json`: horses, gold, encounters, and player settings.
- `%APPDATA%\Gallorin\data\config\`: editable Compendium and spawning JSON.
- `%APPDATA%\Gallorin\data\backups\`: save backups.
- `%APPDATA%\Gallorin\data\music\`: song/effect MP3s and library/playlist JSON.
- `%APPDATA%\Gallorin\audio-settings.json`: Music/Sound Effects volumes and music mute.
- `%APPDATA%\Gallorin\desktop.log`: startup/update diagnostics.

Development launches with npm run desktop use %APPDATA%\Gallorin Development instead, with independent saves and Chromium caches. You can copy existing data on first launch. Installed player data stays in %APPDATA%\Gallorin.

Gallorin always uses its own folders and never falls back automatically to an Aetherion data folder. Existing data can be copied explicitly through the migration flow. The Windows application ID, JSON format identifiers, and GitHub update repository retain their legacy identifiers for compatibility.

The Gallorin menu opens these folders. Updates replace application files only. Uninstalling retains app data.

On first launch, choose **Start New** or **Copy Existing Data**. For migration, stop the browser server first and choose the original repository's `data` folder. The app validates a staged copy of player/config/backups, then activates it. It never overwrites the source or an existing desktop data folder. Each edition subsequently has independent saves.

## GitHub Releases and updates

The repository is public, so players need no GitHub account or token.

1. Review pending changes and exclusions; update package/lockfile, README, banner, and changelog using major.minor.patch. Displayed versions inherit the package version.
2. Stop for personal review. After explicit approval, run tests, desktop smoke checks, and version consistency checks, then push approved commits to main when authorized.
3. Only when a release is explicitly requested, finalize its changelog date and create/push the matching tag, for example `gallorin-v1.1.0` for version `1.1.0`.
4. **Actions → Release v1.1.0: The Melodies of Gallorin** builds and tests the Windows installer, smoke-tests the packaged app before creating a GitHub Release using the workflow's built-in GITHUB_TOKEN. No personal token belongs in the app.
5. After successful checks, the workflow uploads the installer, blockmap, and latest.yml, then publishes the release and explicitly marks it latest.
6. Installed Gallorin apps can now discover it. A normal code push alone does not publish an app update.

The workflow can also be started manually. Repository Actions must be enabled; its job requests contents:write to create the draft release.

At startup, the packaged app checks in the background. Users approve downloading and restarting. Offline/update failures do not stop gameplay. Closing the app does not install a deferred update automatically. **Gallorin → Check for Updates** retries manually. Pending writes finish before installation.

Local builds are unsigned unless a signing identity is configured. Windows may show an unknown-publisher warning. For signed distribution, configure an appropriate Windows code-signing service/certificate in GitHub Actions before publishing; do not commit private keys. No paid signing service has been configured by this change.

Release downloads/installations require an actual published newer version to test end to end. The automated tests cover check availability, consent, deferral, offline failure, and save-before-install ordering.

## Isolated desktop smoke test

Set `AETHERION_TEST_DATA` to a new temporary directory, then run `npx electron . --smoke-test`. It uses that directory exclusively, skips migration/update dialogs, validates renderer startup and Node isolation, captures the game and splash, drains saves, and exits. Never point this variable at real player data.

Desktop startup now opens a woodland start menu after the splash. Play enters the game; Exit Game closes it. Settings > Audio adjusts saved menu-music volume, with a mute button on the menu. Music starts at the title screen and continues during gameplay. Escape opens the themed menu and audio settings. Audio preferences are stored in the edition's Chromium storage.

## Logo artwork

The master logo is public/assets/crest.svg. It is a square, self-contained SVG; vector paths scale to every UI size. Keep fonts outlined and image references embedded or avoided. Fine details should remain readable at 16px.

After replacing the master, run npx electron scripts/build-desktop-icon.cjs. This synchronizes the desktop SVG, theme-aware sidebar/Escape logo, README banner, a 512px PNG, and a seven-size Windows ICO (16–256px). The ICO/PNG are generated assets; the source SVG remains editable.

## Changelog and release notes

CHANGELOG.md is the single source for the offline main-menu Changelog popup and GitHub release notes. Legacy milestones are displayed as 0.1.0–0.7.0, with their original Aetherion versions retained as context. Gallorin release history is recorded in CHANGELOG.md.

Before every push, add meaningful changes to the current entry and run npm run release:check. Keep package.json, its lockfile, README, banner, and changelog consistent. Runtime version labels read the package automatically.

For review, npm run release:draft writes dist/release-notes-draft.md for only the current release. When a release is authorized, run node scripts/release-notes.js --finalize YYYY-MM-DD with the local release date before committing. The tag workflow requires a dated current entry, smoke-tests the app, generates release-specific notes with npm run release:notes, and passes that file to GitHub. It never publishes the full historical changelog as one release's notes.
