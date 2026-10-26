import { defaultAudioPreferences } from './audio-preferences.js';
// Persistent transport: playlist ordering, skip/previous and crossfades live together.
export function createMusicEngine({
  audio = new Audio(),
  makeAudio = () => new Audio(),
  clock = () => performance.now(),
  frame = requestAnimationFrame
} = {}) {
  let active = audio,
    players = [audio],
    track = null,
    revision = 0,
    volume = defaultAudioPreferences.volume / 100,
    muted = defaultAudioPreferences.muted,
    playing = false,
    error = '',
    gains = new Map([[audio, 1]]);
  let soundEffectsVolume = defaultAudioPreferences.soundEffectsVolume / 100;
  const effects = new Map();
  let queue = [],
    index = 0,
    queueKey = '',
    fadeSeconds = 2;
  const apply = () =>
    players.forEach(a => {
      a.volume = Math.max(0, Math.min(1, (gains.get(a) || 0) * volume));
      a.muted = muted;
    });
  const clean = () => {
    for (const a of players)
      if (a !== active) {
        a.pause();
        a.removeAttribute('src');
        a.load();
        gains.delete(a);
      }
    players = [active];
    gains.set(active, 1);
    apply();
  };
  async function select(next, seconds = 2) {
    if (track?.id === next?.id && track?.url === next?.url) {
      track = next;
      active.loop = queue.length <= 1;
      return snapshot();
    }
    const token = ++revision,
      old = active,
      incoming = makeAudio();
    incoming.loop = queue.length <= 1;
    incoming.volume = 0;
    incoming.muted = muted;
    incoming.src = next.url;
    gains.set(incoming, 0);
    players.push(incoming);
    incoming.onended = () => {
      if (active === incoming && playing && queue.length > 1) void advance(1);
    };
    incoming.ontimeupdate = () => {
      if (
        active === incoming &&
        playing &&
        !error &&
        players.length === 1 &&
        queue.length > 1 &&
        fadeSeconds > 0 &&
        incoming.duration > 0 &&
        incoming.duration - incoming.currentTime <= fadeSeconds
      )
        void advance(1);
    };
    try {
      if (playing) await incoming.play();
      if (token !== revision) {
        incoming.pause();
        return snapshot();
      }
      active = incoming;
      track = next;
      error = '';
      const starts = new Map(players.map(a => [a, gains.get(a) || 0])),
        start = clock();
      const tick = () => {
        if (token !== revision) return;
        const t = seconds <= 0 ? 1 : Math.min(1, (clock() - start) / (seconds * 1000));
        for (const a of players) gains.set(a, a === incoming ? t : (starts.get(a) || 0) * (1 - t));
        apply();
        if (t < 1) frame(tick);
        else clean();
      };
      tick();
    } catch {
      incoming.pause();
      players = players.filter(a => a !== incoming);
      gains.delete(incoming);
      active = old;
      error = 'Music could not play. Press Play to try again.';
      if (!track) {
        active = incoming;
        players = [incoming];
        gains.set(incoming, 1);
        track = next;
        playing = false;
      }
      apply();
    }
    return snapshot();
  }
  async function advance(direction) {
    if (!queue.length) return snapshot();
    index = (index + direction + queue.length) % queue.length;
    if (queue.length === 1) {
      active.currentTime = 0;
      return snapshot();
    }
    return select(queue[index], fadeSeconds);
  }
  async function command(input) {
    if (input.type === 'metadata') {
      queue = queue.map(t => (t.id === input.id ? { ...t, name: input.name, artist: input.artist } : t));
      if (track?.id === input.id) track = { ...track, name: input.name, artist: input.artist };
    }
    if (input.type === 'fade' && Number.isFinite(input.value)) fadeSeconds = Math.max(0, Math.min(10, input.value));
    if (input.type === 'sfx-volume' && Number.isFinite(input.value)) {
      soundEffectsVolume = Math.max(0, Math.min(1, input.value));
      for (const effect of effects.keys()) effect.volume = soundEffectsVolume;
    }
    if (input.type === 'effect' && input.track?.url) {
      const effect = makeAudio();
      effect.src = input.track.url;
      effect.volume = soundEffectsVolume;
      effects.set(effect, input.track.id);
      const release = () => {
        effects.delete(effect);
        effect.pause();
        effect.removeAttribute('src');
        effect.load();
      };
      effect.onended = release;
      effect.onerror = release;
      try {
        await effect.play();
      } catch {
        release();
      }
    }
    if (input.type === 'playlist') {
      if (!Array.isArray(input.tracks)) return snapshot();
      if (!input.tracks.length) {
        ++revision;
        queue = [];
        queueKey = input.key;
        track = null;
        error = '';
        players.forEach(a => a.pause());
        active.removeAttribute('src');
        active.load();
        clean();
        return snapshot();
      }
      const same = queueKey === input.key,
        current = input.tracks.findIndex(t => t.id === track?.id);
      queue = input.tracks;
      queueKey = input.key;
      fadeSeconds = Number.isFinite(input.fadeSeconds) ? Math.max(0, Math.min(10, input.fadeSeconds)) : 2;
      const requested = queue.findIndex(t => t.id === input.startId);
      index = requested >= 0 ? requested : current >= 0 ? current : 0;
      if (same && current >= 0 && (requested < 0 || requested === current)) {
        track = queue[index];
        active.loop = queue.length <= 1;
        return snapshot();
      }
      return select(queue[index], fadeSeconds);
    }
    if (input.type === 'select') {
      queue = [input.track];
      index = 0;
      queueKey = 'preview';
      return select(input.track, input.fadeSeconds);
    }
    if (input.type === 'next') return advance(1);
    if (input.type === 'previous') return advance(-1);
    if (input.type === 'play' && queue.length) {
      try {
        await active.play();
        playing = true;
        error = '';
      } catch {
        playing = false;
        error = 'Press Play to allow music playback.';
      }
    }
    if (input.type === 'pause') {
      playing = false;
      players.forEach(a => a.pause());
    }
    if (input.type === 'stop') {
      playing = false;
      players.forEach(a => a.pause());
      active.currentTime = 0;
    }
    if (input.type === 'seek' && Number.isFinite(input.value) && Number.isFinite(active.duration))
      active.currentTime = Math.max(0, Math.min(active.duration, input.value));
    if (input.type === 'volume' && Number.isFinite(input.value)) volume = Math.max(0, Math.min(1, input.value));
    if (input.type === 'mute') muted = input.value === true;
    apply();
    return snapshot();
  }
  function snapshot() {
    return {
      track,
      activeEffectIds: [...effects.values()],
      playlistKey: queueKey,
      soundEffectsVolume: Math.round(soundEffectsVolume * 100),
      playlist: queue.map(t => t.id),
      index,
      transitioning: players.length > 1,
      playing: playing && !active.paused,
      volume: Math.round(volume * 100),
      muted,
      currentTime: track ? active.currentTime || 0 : 0,
      duration: track && Number.isFinite(active.duration) ? active.duration : 0,
      error
    };
  }
  return { command, snapshot };
}
