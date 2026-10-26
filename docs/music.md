# Music & sound effects

Open **User Interface → Music & Sound Effects** for playlists, Sound Events, All Songs, and All Sound Effects.

## Libraries

- Use the import icon beside All Songs or All Sound Effects to import MP3 files up to 50 MB each; multiple files can be selected together.
- Files are copied into the active data folder. Duration is read from MP3 metadata and cannot be edited.
- All Songs and All Sound Effects use matching columns and independent sorting. Headers cycle ascending, descending, and original row order; sorting does not reorder playback.
- Hover a row to reveal play and options controls. Double-clicking also previews it.
- All Songs offers **Add**, **Edit**, and **Delete**. All Sound Effects offers **Edit** and **Delete**; assign effects in Sound Events.
- Edit changes that row's title and artist. Inputs fit their text; either adjacent checkmark or Enter saves both fields. Clicking away offers Save or Discard. Artist initially defaults to Gallorin Studios.
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

Assign one effect per event using **Sound Events → Options → Edit**. One effect can be shared across events.

| Event | Bundled default |
| --- | --- |
| Cosmic Horse Spawn | Benkirb Shine 7 268909 |
| Horse Sold | Alexzavesa Clinking Coins 9 468428 |
| Horse Respawn Timer Finished | Universfield Magic Twinkle 244951 |
| Button Click | Justsomesounds Click Sound 432501 |

- Event volume is multiplied by the master Sound Effects volume. For example, 50% event volume × 50% master volume plays at 25%.
- Each event has its own saved level, even when events share a file. A new assignment to an empty event starts at 100%; replacing a sound preserves the event level. Clearing and assigning again starts at 100%.
- Previously configured default events retain their saved levels. Saved assignments, including cleared events, override bundled defaults.
- Effects play over background music. Music volume and music mute do not affect them.
- Cosmic sounds play for newly generated encounters, not when saved encounters reload. Horse Sold plays only after a successful sale.
- Button Click applies to text buttons, including Create and Search The Wilds, in gameplay and the title menu. Icon-only buttons, dropdown menus, disabled buttons, and import icons remain silent.

## Player & audio settings

The full-width player supports play/pause, previous/next, stop, restart, seeking, mute, and volume.
Click its song name/artwork to reveal that song in All Songs.

The arrow beside the song details minimizes/expands the player with a reversible animation.
Compact mode keeps the song name, a plain music symbol, playback controls, and volume.
Artwork, artist, and progress hide; audio continues. The preference is stored in browser storage.
Sidebar and notifications adjust with the player height. Reduced motion is respected.

Audio Settings is shared by the main menu, Escape menu, and game.
It contains Music, Sound Effects, and a 0–10 second crossfade slider in whole-second steps.

Fresh-install defaults:

| Setting | Default |
| --- | --- |
| Music / Sound Effects | 15% / 50%, music unmuted |
| Crossfade | 2 seconds |
| Default / Main Menu | Glades of Gallorin |
| Aetherion Wilds | Aetherion Wilds |
| Hallowhoof | Halloween 1, then Halloween 2 |
| All Town | Town |

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
`data/defaults/music.json`, and master default volumes are in `public/audio-preferences.js`.
Event volume overrides are stored in the local music library.
Bundled tracks seed once. Deleted tracks stay deleted on restart.

Imported audio and library changes are local and excluded from Git and the player JSON export.
Copy the music folder separately when transferring a library. Browser playback may require
pressing Play once because of autoplay restrictions.
