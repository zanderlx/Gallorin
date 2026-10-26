// @ts-check
import { limits, formatLimit } from '../public/limits.js';
import { soundEffectGroups, isSoundEffect } from '../public/music-effects.js';
import { durationOfFile } from './music-duration.js';
import { assignmentTracks, formatMusicName, normalizePlaylistSelections } from '../public/music-context.js';
import { mkdir, readFile, unlink, open, stat, copyFile, rename } from 'node:fs/promises';
import { replaceDurable, writeDurable } from './durable-file.js';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
const validId = id => /^[a-f0-9-]{36}$/.test(id);
const invalidTrack = `Choose a valid MP3 file (maximum ${formatLimit(limits.trackBytes)}).`;
function checkImport(name, kind) {
  if (!['music', 'effect'].includes(kind)) throw Error('Choose music or sound effect.');
  if (typeof name !== 'string' || !name.toLowerCase().endsWith('.mp3') || name.length > 200)
    throw Error('Choose an MP3 file with a name under 200 characters.');
}
// New assignments start at full event volume; existing events keep their level.
function assignSoundEvent(library, event, ids) {
  const old = assignmentTracks(library.assignments[event]);
  library.eventVolumes ||= {};
  if (!ids.length) delete library.eventVolumes[event];
  else if (!old.length) library.eventVolumes[event] = 100;
  else if (!Object.hasOwn(library.eventVolumes, event))
    library.eventVolumes[event] = library.tracks.find(track => track.id === old[0])?.volumePercent ?? 100;
  library.assignments[event] = ids;
}
export class MusicLibrary {
  constructor(directory, builtin, seeds = [], defaults = {}) {
    this.builtin = builtin;
    this.root = join(directory, 'music');
    this.queue = Promise.resolve();
    this.ready = this.seed(seeds, defaults);
  }
  async seed(seeds, defaults = {}) {
    let library;
    try {
      library = JSON.parse(await readFile(join(this.root, 'library.json'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!seeds.length && !Object.keys(defaults).length) return;
      library = {
        version: 2,
        tracks: [],
        eventVolumes: structuredClone(defaults.eventVolumes || {}),
        assignments: structuredClone(defaults.assignments || {}),
        fadeSeconds: defaults.fadeSeconds ?? 2
      };
    }
    const seen = new Set(library.seededTrackIds || []);
    let changed = false;
    for (const track of seeds) {
      if (seen.has(track.id)) continue;
      await mkdir(this.root, { recursive: true });
      await copyFile(track.source, join(this.root, track.id + '.mp3'));
      library.tracks.push({
        id: track.id,
        name: track.name,
        kind: track.kind || 'music',
        ...(Number.isFinite(track.volumePercent) ? { volumePercent: track.volumePercent } : {}),
        addedAt: new Date().toISOString()
      });
      seen.add(track.id);
      changed = true;
    }
    for (const track of seeds) {
      const existing = library.tracks.find(t => t.id === track.id);
      if (existing && track.file && existing.filename !== track.file) {
        existing.filename = track.file;
        existing.name = formatMusicName(track.file);
        changed = true;
      }
    }
    for (const track of library.tracks) {
      if (!Number.isFinite(track.durationSeconds) || track.durationSeconds <= 0) {
        const duration = await durationOfFile(join(this.root, track.id + '.mp3'));
        if (duration !== track.durationSeconds) {
          track.durationSeconds = duration;
          changed = true;
        }
      }
    }
    // One-time category migration preserves files/metadata and removes effects from music queues.
    if (!library.soundEffectsMigrated) {
      const backup = join(this.root, '..', 'backups');
      await mkdir(backup, { recursive: true });
      await copyFile(
        join(this.root, 'library.json'),
        join(backup, 'pre-sound-effects-' + randomUUID() + '.json')
      ).catch(e => {
        if (e.code !== 'ENOENT') throw e;
      });
      library.assignments ||= {};
      for (const track of library.tracks) {
        if (
          seeds.find(seed => seed.id === track.id)?.kind === 'effect' ||
          /universfield-magic-twinkle/i.test(track.filename || '')
        )
          track.kind = 'effect';
        else track.kind ||= 'music';
      }
      const effects = new Set(library.tracks.filter(isSoundEffect).map(track => track.id));
      for (const key of Object.keys(library.assignments))
        if (!key.startsWith('effect/'))
          library.assignments[key] = assignmentTracks(library.assignments[key]).filter(id => !effects.has(id));
      const twinkle = library.tracks.find(
        track =>
          isSoundEffect(track) &&
          (/universfield-magic-twinkle/i.test(track.filename || '') ||
            seeds.find(seed => seed.id === track.id)?.file?.startsWith('universfield'))
      );
      if (twinkle && !Object.hasOwn(library.assignments, 'effect/cosmic-spawn'))
        library.assignments['effect/cosmic-spawn'] = [twinkle.id];
      library.soundEffectsMigrated = true;
      changed = true;
    }
    // Saved assignments (including []) override defaults. Missing destinations
    // inherit repo defaults, including destinations added by a later update.
    const seededEvents = new Set(library.seededEffectEvents || []);
    library.assignments ||= {};
    for (const [context, value] of Object.entries(defaults.assignments || {})) {
      if (!Object.hasOwn(library.assignments, context)) {
        library.assignments[context] = assignmentTracks(value).filter(
          id =>
            id === 'menu' ||
            library.tracks.some(track => track.id === id && isSoundEffect(track) === context.startsWith('effect/'))
        );
        if (Number.isFinite(defaults.eventVolumes?.[context]))
          library.eventVolumes = { ...library.eventVolumes, [context]: defaults.eventVolumes[context] };
        changed = true;
      }
      if (context.startsWith('effect/') && !seededEvents.has(context)) {
        seededEvents.add(context);
        changed = true;
      }
    }
    if (!Object.hasOwn(library, 'fadeSeconds')) {
      library.fadeSeconds = defaults.fadeSeconds ?? 2;
      changed = true;
    }
    if (changed) {
      library.seededEffectEvents = [...seededEvents];
      library.seededTrackIds = [...seen];
      await this.write(library);
    }
  }
  async read() {
    await this.ready;
    try {
      // Re-read library.json only when it changed; each call still returns fresh objects.
      const file = join(this.root, 'library.json');
      const info = await stat(file);
      const key = `${info.size}:${info.mtimeMs}`;
      if (this.cached?.key !== key) this.cached = { key, text: await readFile(file, 'utf8') };
      const library = JSON.parse(this.cached.text);
      return {
        ...library,
        version: 2,
        tracks: library.tracks.map(track => ({
          ...track,
          name: track.customName ?? formatMusicName(track.filename || track.name),
          artist: track.artist ?? 'Gallorin Studios'
        })),
        assignments: Object.fromEntries(
          Object.entries(library.assignments || {}).map(([key, value]) => [
            key,
            key.startsWith('effect/') ? assignmentTracks(value).slice(-1) : assignmentTracks(value)
          ])
        )
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { version: 2, tracks: [], assignments: {}, fadeSeconds: 2 };
    }
  }
  async write(value) {
    await mkdir(this.root, { recursive: true });
    await replaceDurable(join(this.root, 'library.json'), JSON.stringify(value, null, 2) + '\n');
  }
  edit(fn) {
    const job = this.queue.then(fn);
    this.queue = job.catch(() => {});
    return job;
  }
  async import(name, bytes, kind = 'music') {
    if (!Buffer.isBuffer(bytes)) throw Error(invalidTrack);
    checkImport(name, kind);
    const temporary = await this.temporaryFile();
    await writeDurable(temporary, bytes, { exclusive: true });
    return this.importFile(name, temporary, kind);
  }
  /**
   * Streams an upload to a temporary file instead of holding it in memory.
   * Throws an error with code 'TOO_LARGE' once it exceeds maxBytes.
   */
  async upload(name, stream, kind = 'music', maxBytes = limits.trackBytes) {
    checkImport(name, kind);
    const temporary = await this.temporaryFile();
    const handle = await open(temporary, 'wx');
    let size = 0;
    try {
      for await (const chunk of stream) {
        size += chunk.length;
        if (size > maxBytes)
          throw Object.assign(Error(`File is too large (maximum ${formatLimit(limits.trackBytes)}).`), {
            code: 'TOO_LARGE'
          });
        await handle.write(chunk);
      }
      await handle.sync();
    } catch (error) {
      await handle.close();
      await unlink(temporary).catch(() => {});
      throw error;
    }
    await handle.close();
    return this.importFile(name, temporary, kind);
  }
  async temporaryFile() {
    await mkdir(this.root, { recursive: true });
    return join(this.root, `upload-${randomUUID()}.tmp`);
  }
  // Validates an MP3 already written to `temporary` in the music folder and adds it to the library.
  // The temporary file is always moved into place or removed.
  async importFile(name, temporary, kind = 'music') {
    return this.edit(async () => {
      try {
        const { size } = await stat(temporary);
        const head = Buffer.alloc(4);
        const handle = await open(temporary, 'r');
        try {
          await handle.read(head, 0, 4, 0);
        } finally {
          await handle.close();
        }
        // Accept ID3-tagged files or an MPEG frame header.
        if (
          size < 4 ||
          size > limits.trackBytes ||
          !(head.subarray(0, 3).toString() === 'ID3' || (head[0] === 255 && (head[1] & 224) === 224))
        )
          throw Error(invalidTrack);
        const library = await this.read(),
          track = {
            id: randomUUID(),
            kind,
            // eslint-disable-next-line no-control-regex -- strips control characters from file names
            filename: name.replace(/[\x00-\x1f]/g, ''),
            name: formatMusicName(name),
            artist: 'Gallorin Studios',
            durationSeconds: await durationOfFile(temporary),
            addedAt: new Date().toISOString()
          };
        const target = join(this.root, track.id + '.mp3');
        await rename(temporary, target);
        try {
          library.tracks.push(track);
          await this.write(library);
        } catch (error) {
          await unlink(target);
          throw error;
        }
        return library;
      } finally {
        await unlink(temporary).catch(() => {});
      }
    });
  }
  async settings(input, contexts) {
    return this.edit(async () => {
      const library = await this.read();
      if (
        !input ||
        !Number.isFinite(input.fadeSeconds) ||
        input.fadeSeconds < 0 ||
        input.fadeSeconds > 10 ||
        !input.assignments ||
        typeof input.assignments !== 'object' ||
        Array.isArray(input.assignments)
      )
        throw Error('Choose a fade between 0 and 10 seconds.');
      const assignments = {};
      for (const [context, value] of Object.entries(input.assignments)) {
        const ids = assignmentTracks(value);
        if (context.startsWith('effect/') && ids.length > 1) throw Error('Choose only one sound effect per event.');
        if (
          ![...contexts, ...soundEffectGroups.flatMap(group => group.items.map(item => item.id))].includes(context) ||
          (!Array.isArray(value) && typeof value !== 'string') ||
          ids.length > 500 ||
          ids.some(id => typeof id !== 'string' || (id !== 'menu' && !library.tracks.some(t => t.id === id)))
        )
          throw Error('Choose an existing song and location.');
        if (
          ids.some(id =>
            context.startsWith('effect/')
              ? !isSoundEffect(library.tracks.find(t => t.id === id))
              : isSoundEffect(library.tracks.find(t => t.id === id))
          )
        )
          throw Error('Use sound effects only for events and songs only for music playlists.');
        if (Array.isArray(value) || ids.length) assignments[context] = [...new Set(ids)];
      }
      // Omitting a previously saved playlist in a full replacement is an
      // explicit clear, not permission to reapply its bundled assignment.
      for (const context of Object.keys(library.assignments))
        if (!Object.hasOwn(assignments, context)) assignments[context] = [];
      for (const [event, ids] of Object.entries(assignments))
        if (event.startsWith('effect/')) assignSoundEvent(library, event, ids);
      await this.write({ ...library, assignments, fadeSeconds: input.fadeSeconds });
      return this.read();
    });
  }
  async update(id, values) {
    return this.edit(async () => {
      const library = await this.read(),
        track = library.tracks.find(t => t.id === id);
      if (id !== 'menu' && !track) throw Error('Song not found.');
      if (!values || Object.keys(values).some(key => !['name', 'artist', 'eventIds', 'volumePercent'].includes(key)))
        throw Error('Only the name, artist, and sound events can be edited.');
      if (values.volumePercent !== undefined) {
        if (
          !isSoundEffect(track) ||
          !Number.isFinite(values.volumePercent) ||
          values.volumePercent < 0 ||
          values.volumePercent > 100
        )
          throw Error('Sound effect volume must be between 0 and 100.');
        track.volumePercent = values.volumePercent;
      }
      const text = (key, max) => {
        const value = values[key];
        // eslint-disable-next-line no-control-regex -- rejects control characters in names
        if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\x00-\x1f]/.test(value))
          throw Error('Enter a valid ' + key + ' (maximum ' + max + ' characters).');
        return value.trim();
      };
      const name = text('name', 200),
        artist = text('artist', 120);
      const assignmentReplacements = [];
      if (values.eventIds !== undefined) {
        const events = soundEffectGroups.flatMap(group => group.items);
        if (
          !isSoundEffect(track) ||
          !Array.isArray(values.eventIds) ||
          values.eventIds.some(id => !events.some(event => event.id === id))
        )
          throw Error('Choose valid sound events.');
        for (const event of events) {
          const old = assignmentTracks(library.assignments[event.id]);
          if (values.eventIds.includes(event.id)) {
            if (old.length && old[0] !== id) assignmentReplacements.push({ event: event.id, from: old[0], to: id });
            assignSoundEvent(library, event.id, [id]);
          } else if (old.includes(id)) assignSoundEvent(library, event.id, []);
        }
      }
      if (id === 'menu') library.builtinMetadata = { name, artist };
      else Object.assign(track, { customName: name, name, artist });
      await this.write(library);
      return { ...(await this.read()), assignmentReplacements };
    });
  }
  async assign(id, playlistIds, contexts) {
    return this.edit(async () => {
      const library = await this.read();
      if (id !== 'menu' && !library.tracks.some(t => t.id === id)) throw Error('Song not found.');
      if (
        !Array.isArray(playlistIds) ||
        playlistIds.length > 1000 ||
        playlistIds.some(
          key =>
            typeof key !== 'string' ||
            ![...contexts, ...soundEffectGroups.flatMap(group => group.items.map(item => item.id))].includes(key)
        )
      )
        throw Error('Choose existing playlists.');
      const track = library.tracks.find(t => t.id === id),
        effect = isSoundEffect(track);
      const validContexts = effect
        ? soundEffectGroups.flatMap(group => group.items.map(item => item.id))
        : contexts.filter(key => !key.startsWith('effect/'));
      if (playlistIds.some(key => !validContexts.includes(key)))
        throw Error('Choose a matching music playlist or sound effect event.');
      const selected = new Set(normalizePlaylistSelections(playlistIds, validContexts));
      const assignmentReplacements = [];
      for (const context of validContexts) {
        const old = assignmentTracks(library.assignments[context]);
        if (selected.has(context) && effect) {
          if (old.length && old[0] !== id) assignmentReplacements.push({ event: context, from: old[0], to: id });
          assignSoundEvent(library, context, [id]);
        } else if (selected.has(context)) {
          if (!old.includes(id)) {
            if (old.length >= 500) throw Error('A playlist can contain up to 500 songs.');
            library.assignments[context] = [...old, id];
          }
        } else if (
          old.includes(id) ||
          (id === 'menu' && context === 'default' && !Object.hasOwn(library.assignments, context))
        ) {
          if (effect)
            assignSoundEvent(
              library,
              context,
              old.filter(song => song !== id)
            );
          else library.assignments[context] = old.filter(song => song !== id);
        }
      }
      await this.write(library);
      return { ...(await this.read()), assignmentReplacements };
    });
  }
  async eventVolume(event, value) {
    return this.edit(async () => {
      const library = await this.read();
      if (
        !soundEffectGroups.flatMap(group => group.items).some(item => item.id === event) ||
        !assignmentTracks(library.assignments[event]).some(id =>
          library.tracks.some(track => track.id === id && isSoundEffect(track))
        )
      )
        throw Error('Choose an assigned sound event.');
      if (!Number.isFinite(value) || value < 0 || value > 100)
        throw Error('Sound event volume must be between 0 and 100.');
      library.eventVolumes = { ...library.eventVolumes, [event]: value };
      await this.write(library);
      return this.read();
    });
  }
  async fade(value) {
    return this.edit(async () => {
      if (!Number.isFinite(value) || value < 0 || value > 10)
        throw Error('Crossfade must be between 0 and 10 seconds.');
      const library = await this.read();
      if (library.fadeSeconds === value) return library;
      library.fadeSeconds = value;
      await this.write(library);
      return library;
    });
  }
  async remove(id) {
    return this.edit(async () => {
      if (!validId(id)) throw Error('Song not found.');
      const library = await this.read();
      if (!library.tracks.some(t => t.id === id)) throw Error('Song not found.');
      library.tracks = library.tracks.filter(t => t.id !== id);
      library.assignments = Object.fromEntries(
        Object.entries(library.assignments).map(([key, value]) => [
          key,
          assignmentTracks(value).filter(value => value !== id)
        ])
      );
      for (const [event, ids] of Object.entries(library.assignments))
        if (event.startsWith('effect/') && !ids.length && library.eventVolumes) delete library.eventVolumes[event];
      await this.write(library);
      await unlink(join(this.root, id + '.mp3')).catch(e => {
        if (e.code !== 'ENOENT') throw e;
      });
      return library;
    });
  }
  async media(req, res, id) {
    if (id !== 'menu' && (!validId(id) || !(await this.read()).tracks.some(t => t.id === id))) {
      res.writeHead(404);
      res.end();
      return;
    }
    const file = id === 'menu' ? this.builtin : join(this.root, id + '.mp3'),
      size = (await stat(file)).size;
    let start = 0,
      end = size - 1,
      status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + size });
        res.end();
        return;
      }
      if (!match[1]) start = Math.max(0, size - Number(match[2]));
      else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(Number(match[2]), size - 1);
      }
      if (start > end || start >= size) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + size });
        res.end();
        return;
      }
      status = 206;
    }
    res.writeHead(status, {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      ...(status === 206 ? { 'Content-Range': 'bytes ' + start + '-' + end + '/' + size } : {})
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const handle = await open(file);
    const stream = handle.createReadStream({ start, end });
    res.once('close', () => stream.destroy());
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }
}
