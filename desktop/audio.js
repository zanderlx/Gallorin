import { createMusicEngine } from '../public/music-engine.js';
window.musicTransport = createMusicEngine({ audio: document.querySelector('audio'), frame: fn => setTimeout(fn, 16) });
