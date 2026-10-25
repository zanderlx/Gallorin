import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cooldownSeconds,cooldownLabel,createCooldownCompletion} from '../public/encounter-cooldown.js';
test('cooldown uses a fixed deadline, rounds up, and formats minutes and seconds',()=>{
 const state={settings:{searchCooldownEnabled:true},searchAvailableAt:91000};
 assert.equal(cooldownSeconds(state,1000),90);assert.equal(cooldownLabel(90),'1 min 30 secs');
 assert.equal(cooldownSeconds(state,90999),1);assert.equal(cooldownSeconds(state,91000),0);
 state.settings.searchCooldownEnabled=false;assert.equal(cooldownSeconds(state,1000),0);
});

test('countdown omits zero minutes and uses singular seconds',()=>{
 assert.equal(cooldownLabel(61),'1 min 1 sec');
 assert.equal(cooldownLabel(60),'1 min 0 secs');
 assert.equal(cooldownLabel(59),'59 secs');
 assert.equal(cooldownLabel(1),'1 sec');
 assert.equal(cooldownLabel(0),'0 secs');
});

test('completion sounds once, never on expired reload or cancelled countdown',()=>{
 let sounds=0;const check=createCooldownCompletion(()=>sounds++),state={settings:{searchCooldownEnabled:true},searchAvailableAt:2000};
 check(state,3000);assert.equal(sounds,0);
 state.searchAvailableAt=5000;check(state,4000);check(state,5000);check(state,6000);assert.equal(sounds,1);
 state.searchAvailableAt=8000;check(state,7000);state.settings.searchCooldownEnabled=false;check(state,7500);check(state,9000);assert.equal(sounds,1);
 state.settings.searchCooldownEnabled=true;state.searchAvailableAt=11000;check(state,10000);check(state,11000);assert.equal(sounds,2);
});
