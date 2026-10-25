# Local settings and bundled defaults

Saved local values override bundled repo defaults. Only missing fields inherit defaults. This includes nested settings: `false`, `0`, `null`, and `[]` are explicit values, not missing settings.

- Game settings merge missing fields from `data/defaults/settings.json` on startup.
- Spawning settings merge missing fields from `defaultSpawnSettings` when configuration is read.
- Audio preferences retain saved volume/mute values and use shared defaults for missing preferences.
- Missing music assignments inherit bundled assignments on startup. Empty assignments stay empty, including after clearing a playlist. An empty location playlist uses the normal parent/Default playback fallback.
- Local Compendium registries remain authoritative. Do not merge entire definition arrays with bundled arrays: that would restore deliberately deleted entries or overwrite custom definitions.

## Music identity

Imported audio has a local track ID. Deleting and reimporting Town creates a different ID even when the MP3 bytes are identical. Keep that local ID and its assignments; never copy it into repo defaults unless the matching file is bundled with it. Bundled defaults use bundled track IDs. A deleted bundled song is not restored on startup merely because its seed exists.

For comparisons, report matching audio as equivalent even when IDs differ. An explicit empty Stables assignment differs structurally from an unset key: the empty value preserves the local choice when future repo defaults add a Stables playlist.

## Player data

Exclude current gold, caught horses, inventory, sales, and encounter progress from repo-default comparison or promotion. Current gold is always player data; new games currently start at 0 gold. Settings fallback must never reset player progress.

Developer data is under `%APPDATA%\Gallorin Development`; installed app data is separate under `%APPDATA%\Gallorin`.
