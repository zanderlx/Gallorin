import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAudioPreferenceStore} from '../public/audio-preference-store.js';

test('rapid mute changes are optimistic and persisted in order despite stale polling',async()=>{
 const saved=[],release=[];
 const store=createAudioPreferenceStore({save:state=>new Promise(resolve=>{saved.push(state);release.push(resolve);})});
 const oldVersion=store.version(),first=store.set({muted:true}),second=store.set({muted:false});
 assert.equal(store.get().muted,false);
 store.sync({muted:true,volume:100});assert.equal(store.get().muted,false);assert.equal(store.get().volume,15);
 await Promise.resolve();assert.deepEqual(saved.map(s=>s.muted),[true]);
 release[0]();await first;await Promise.resolve();assert.deepEqual(saved.map(s=>s.muted),[true,false]);
 release[1]();await second;
 store.sync({muted:true},oldVersion);assert.equal(store.get().muted,false);
 store.sync({muted:true,volume:40},store.version());assert.equal(store.get().muted,true);assert.equal(store.get().volume,40);
});
test('volume and effects updates keep earlier mute intent while writes are queued',async()=>{
 const saved=[],store=createAudioPreferenceStore({save:async state=>saved.push(state)});
 const jobs=[store.set({muted:true}),store.set({volume:60}),store.set({soundEffectsVolume:20})];await Promise.all(jobs);
 assert.deepEqual(saved[2],{volume:60,muted:true,soundEffectsVolume:20});
 assert.deepEqual(store.get(),saved[2]);
});
test('a failed preference write does not block the next change',async()=>{
 let calls=0;const store=createAudioPreferenceStore({save:async()=>{if(++calls===1)throw Error('Temporary failure');}});
 await assert.rejects(store.set({muted:true}),/Temporary failure/);
 await store.set({muted:false});assert.equal(store.get().muted,false);assert.equal(calls,2);
});
