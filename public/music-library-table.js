import { escapeHTML as e, icon, html } from './ui.js';
import { musicTracks, formatMusicDuration } from './music-context.js';
import { soundEffectGroups, isSoundEffect } from './music-effects.js';
export const rowPlay = (track, index, context = '') =>
  String(
    html`<td class="music-order"><span class="music-index-control"><span class="music-row-number">${index + 1}</span><button type="button" class="music-row-play" data-preview-song="${track.id}"${context ? html` data-playlist-context="${context}"` : ''} title="Play" aria-label="Play ${track.name}">▶</button></span></td>`
  );
export function musicLibrarySections(library) {
  return ['music', 'effect']
    .map(kind => {
      const effect = kind === 'effect',
        tracks = musicTracks(library).filter(track => isSoundEffect(track) === effect);

      return (
        (effect ? soundEventTable(library, tracks) : '') +
        '<section class="music-library" data-library-kind="' +
        kind +
        '"><header class="music-all-heading"><h2>' +
        (effect ? 'All Sound Effects' : 'All Songs') +
        '</h2><label class="button primary music-import" role="button" tabindex="0">' +
        icon('music') +
        ' Import ' +
        (effect ? 'Sound Effects' : 'Music') +
        '<input type="file" data-music-import="' +
        kind +
        '" accept=".mp3,audio/mpeg" multiple hidden></label></header><div class="music-table-scroll"><table class="music-table music-library-table" data-library-table="' +
        kind +
        '"><thead><tr><th scope="col" class="music-order">#</th><th scope="col">Title</th><th scope="col" class="music-artist">Artist</th><th scope="col" class="music-duration">Duration</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        tracks
          .map(
            (t, index) =>
              '<tr data-music-track="' +
              e(t.id) +
              '"' +
              (effect ? ' data-sound-effect' : '') +
              '>' +
              rowPlay(t, index) +
              '<td><strong>' +
              e(t.name) +
              '</strong></td><td class="music-artist">' +
              e(t.artist) +
              '</td><td class="music-duration">' +
              formatMusicDuration(t.durationSeconds) +
              '</td><td class="music-row-actions"><button type="button" class="music-row-options" data-song-options="' +
              e(t.id) +
              '" aria-haspopup="menu" aria-expanded="false" title="Options" aria-label="Options for ' +
              e(t.name) +
              '">' +
              icon('more') +
              '</button></td></tr>'
          )
          .join('') +
        (!tracks.length
          ? '<tr><td colspan="' +
            5 +
            '" class="music-empty-playlist">No ' +
            (effect ? 'sound effects' : 'songs') +
            ' in this library.</td></tr>'
          : '') +
        '</tbody></table></div></section>'
      );
    })
    .join('');
}

function soundEventTable(library, tracks) {
  const rows = soundEffectGroups
    .flatMap(group => group.items)
    .map((event, index) => {
      const track = tracks.find(track => (library.assignments?.[event.id] || []).includes(track.id));
      const number = track
        ? rowPlay(track, index)
        : '<td class="music-order"><span class="music-row-number">' + (index + 1) + '</span></td>';
      return (
        '<tr data-music-track="' +
        e(track?.id || '') +
        '" data-sound-effect data-sound-event="' +
        e(event.id) +
        '">' +
        number +
        '<td class="music-event">' +
        e(event.name) +
        '</td><td class="music-sound-effect">' +
        e(track?.name || 'None') +
        '</td><td class="music-row-actions"><button type="button" class="music-row-options" data-song-options="' +
        e(track?.id || '') +
        '" data-sound-event="' +
        e(event.id) +
        '" aria-haspopup="menu" aria-expanded="false" title="Options" aria-label="Options for ' +
        e(event.name) +
        '">' +
        icon('more') +
        '</button></td></tr>'
      );
    })
    .join('');
  return (
    '<section class="music-library" data-library-kind="events"><header class="music-all-heading"><h2>Sound Events</h2></header><div class="music-table-scroll"><table class="music-table music-library-table" data-library-table="sound-events"><thead><tr><th scope="col" class="music-order">#</th><th scope="col" class="music-event">Event</th><th scope="col" class="music-sound-effect">Sound Effect</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
    rows +
    '</tbody></table></div></section>'
  );
}
