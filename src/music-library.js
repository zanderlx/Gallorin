// @ts-check
import { soundEffectGroups, isSoundEffect } from '../public/music-effects.js';
import { durationOfFile, durationOfBuffer } from './music-duration.js';
import { assignmentTracks, formatMusicName, normalizePlaylistSelections } from '../public/music-context.js';
import { mkdir, readFile, unlink, open, stat, copyFile } from 'node:fs/promises';
import { replaceDurable, writeDurable } from './durable-file.js';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
const validId = id => /^[a-f0-9-]{36}$/.test(id);
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
      const library = JSON.parse(await readFile(join(this.root, 'library.json'), 'utf8'));
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
    if (!['music', 'effect'].includes(kind)) throw Error('Choose music or sound effect.');
    return this.edit(async () => {
      if (typeof name !== 'string' || !name.toLowerCase().endsWith('.mp3') || name.length > 200)
        throw Error('Choose an MP3 file with a name under 200 characters.');
      // Accept ID3-tagged files or an MPEG frame header.
      if (
        !Buffer.isBuffer(bytes) ||
        bytes.length < 4 ||
        bytes.length > 50 * 1024 * 1024 ||
        !(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224))
      )
        throw Error('Choose a valid MP3 file (maximum 50 MB).');
      const library = await this.read(),
        track = {
          id: randomUUID(),
          kind,
          // eslint-disable-next-line no-control-regex -- strips control characters from file names
          filename: name.replace(/[\x00-\x1f]/g, ''),
          name: formatMusicName(name),
          artist: 'Gallorin Studios',
          durationSeconds: await durationOfBuffer(bytes),
          addedAt: new Date().toISOString()
        };
      await mkdir(this.root, { recursive: true });
      await writeDurable(join(this.root, track.id + '.mp3'), bytes, { exclusive: true });
      try {
        library.tracks.push(track);
        await this.write(library);
      } catch (error) {
        await unlink(join(this.root, track.id + '.mp3'));
        throw error;
      }
      return library;
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
      await this.write({ ...library, assignments, fadeSeconds: input.fadeSeconds });
      return this.read();
    });
  }
  async update(id, values) {
    return this.edit(async () => {
      const library = await this.read(),
        track = library.tracks.find(t => t.id === id);
      if (id !== 'menu' && !track) throw Error('Song not found.');
      if (!values || Object.keys(values).some(key => !['name', 'artist', 'eventIds'].includes(key)))
        throw Error('Only the name, artist, and sound events can be edited.');
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
            library.assignments[event.id] = [id];
          } else if (old.includes(id)) library.assignments[event.id] = [];
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
          library.assignments[context] = [id];
        } else if (selected.has(context)) {
          if (!old.includes(id)) {
            if (old.length >= 500) throw Error('A playlist can contain up to 500 songs.');
            library.assignments[context] = [...old, id];
          }
        } else if (
          old.includes(id) ||
          (id === 'menu' && context === 'default' && !Object.hasOwn(library.assignments, context))
        ) {
          library.assignments[context] = old.filter(song => song !== id);
        }
      }
      await this.write(library);
      return { ...(await this.read()), assignmentReplacements };
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
