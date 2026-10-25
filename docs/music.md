# Music & sound effects

Open **User Interface → Music** for Background Music playlists, All Songs, and All Sound Effects.

## Libraries

- Import MP3 files up to 50 MB each; multiple files can be selected together.
- Files are copied into the active data folder. Duration is read from MP3 metadata and cannot be edited.
- All Songs and All Sound Effects use matching columns and independent sorting. Headers cycle ascending, descending, and original row order; sorting does not reorder playback.
- Hover a row to reveal play and options controls. Double-clicking also previews it.
- The options menu contains **Add**, **Edit**, and **Delete**.
- Edit changes that row's title and artist. Enter or the checkmark saves both fields together; clicking away offers Save or Discard. Artist initially defaults to Gallorin Studios.
- Deleting from a library confirms first and removes the copied file and all playlist/event assignments. Glades of Gallorin is protected from deletion.
- Playlist trash removes membership only, preserving the file and other assignments.

## Assigning songs

Add opens searchable playlist checkboxes with a Section filter. Sections follow navbar order.

- A section's **All** playlist applies to every page in that section, including newly added zones.
- Selecting All disables and unchecks individual rows. Unchecking it restores the individual choices from that editing session.
- Selecting every individual destination consolidates into All when saved.
- Section-wide songs and directly assigned songs play together without duplicates.
- Unassigned destinations use Default; if Default is empty, Glades of Gallorin is the fallback.
- Compendium keeps the current music unless its page or section is assigned. User Interface and Developer Settings always keep the current music.
- Playlists advance in order and loop, with configurable crossfades.
- Folders and playlists collapse independently. Page Show All controls folders; folder Show All controls its playlists.

## Sound effect events

All Sound Effects has its own import and row controls. Its Add popup assigns effects to **Cosmic Horse Spawn** and **Horse Sold**.

- A newly generated cosmic encounter plays an assigned effect over the background track.
- Multiple assigned effects are alternative cues; one is chosen per cosmic spawn.
- Horse Sold plays after a successful sale from the stable or a wild encounter. It defaults to Loot Coin Small; cancelled or failed sales and viewing sale history do not play it.
- New event defaults are added once to existing libraries without replacing saved assignments. You can change or clear the assignment in All Sound Effects → Add.
- Music and Sound Effects volumes are independent. Music mute does not mute effects.
- Reloading or revisiting saved encounters does not replay their sound.
- Magic Twinkle is categorized as an effect and assigned to this event initially.

## Player & audio settings

The full-width player supports play/pause, previous/next, stop, restart, seeking, mute, and volume.
Click its song name/artwork to reveal that song in All Songs.

The arrow beside the song details minimizes/expands the player with a reversible animation.
Compact mode keeps the song name, a plain music symbol, playback controls, and volume.
Artwork, artist, and progress hide; audio continues. The preference is stored in browser storage.
Sidebar and notifications adjust with the player height. Reduced motion is respected.

Audio Settings is shared by the main menu, Escape menu, and game.
It contains Music, Sound Effects, and a 0–10 second crossfade slider in whole-second steps.

Fresh-install defaults in v1.1.0:

| Setting | Default |
| --- | --- |
| Music / Sound Effects | 25% / 100%, music unmuted |
| Crossfade | 2 seconds |
| Default / Main Menu | Glades of Gallorin |
| Aetherion Wilds | Aetherion Wilds |
| Hallowhoof | Halloween 1, then Halloween 2 |
| All Town | Town |
| Cosmic Horse Spawn | Universfield Magic Twinkle |

Existing saved choices remain authoritative when repo defaults change.

## Local storage

| Edition | Library folder |
| --- | --- |
| Installed desktop | `%APPDATA%\Gallorin\data\music` |
| Development desktop | `%APPDATA%\Gallorin Development\data\music` |
| Browser | Project `data/music`, or `HORSE_DATA_DIR/music` |

The folder contains `library.json` and uniquely named MP3s.
Desktop volume/mute preferences are in `audio-settings.json` beside the edition's data folder.
Browser audio preferences use browser storage.

Bundled audio lives in `desktop/assets/music`; startup playlists and crossfade are in
`data/defaults/music.json`, and default volumes are in `public/audio-preferences.js`.
Bundled tracks seed once. Deleted tracks stay deleted on restart.

Imported audio and library changes are local and excluded from Git and the player JSON export.
Copy the music folder separately when transferring a library. Browser playback may require
pressing Play once because of autoplay restrictions.
