import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readHorseSkills,
  skillProgress,
  skillXPRequirements,
  advanceSkill,
  awardHorseSkillXP
} from '../public/skill-progress.js';
test('all five skills start at level zero and require 125 XP', () => {
  const values = readHorseSkills();
  assert.equal(Object.keys(values).length, 5);
  for (const value of Object.values(values))
    assert.deepEqual(skillProgress(value), { level: 0, xp: 0, maxed: false, xpNeeded: 125, percent: 0 });
});
test('XP requirements match each current level rather than cumulative XP', () => {
  assert.deepEqual(skillXPRequirements, [125, 400, 975, 2000, 3600, 6000, 9250, 13600, 20300, 26000, 34000]);
  for (let level = 0; level < skillXPRequirements.length; level++)
    assert.equal(skillProgress({ level, xp: 0 }).xpNeeded, skillXPRequirements[level]);
  assert.equal(skillProgress({ level: 1, xp: 100 }).percent, 25);
  assert.equal(skillProgress({ level: 0, xp: 62 }).percent, 49);
  assert.equal(skillProgress({ level: 0, xp: 63 }).percent, 50);
  assert.equal(skillProgress({ level: 0, xp: 125 }).percent, 0);
  assert.equal(skillProgress({ level: 0, xp: 150 }).percent, 6);
  for (const value of [
    { level: 10, xp: 34000 },
    { level: 10, xp: 34001 },
    { level: 11, xp: 0 }
  ]) {
    const progress = skillProgress(value);
    assert.equal(progress.maxed, true);
    assert.equal(progress.xpNeeded, null);
    assert.equal(progress.percent, 100);
  }
  const unfinished = skillProgress({ level: 10, xp: 2345 });
  assert.equal(unfinished.maxed, false);
  assert.equal(unfinished.xpNeeded, 34000);
});
test('saved skill progress is preserved and invalid imported values are rejected', () => {
  const values = readHorseSkills({ agility: { level: 2, xp: 75 } });
  assert.deepEqual(values.agility, { level: 2, xp: 75 });
  assert.deepEqual(values.bond, { level: 0, xp: 0 });
  for (const input of [
    { agility: { level: -1, xp: 0 } },
    { agility: { level: 0, xp: NaN } },
    { agility: { level: 0, xp: 1.2 } },
    { unknown: { level: 0, xp: 0 } },
    []
  ])
    assert.throws(() => readHorseSkills(input));
});

test('XP awards cross exact and multiple thresholds with overflow and a level ten cap', () => {
  assert.deepEqual(advanceSkill({ level: 0, xp: 124 }, 1), { level: 1, xp: 0 });
  assert.deepEqual(advanceSkill({ level: 0, xp: 100 }, 500), { level: 2, xp: 75 });
  assert.deepEqual(advanceSkill({ level: 10, xp: 2345 }, 100), { level: 10, xp: 2445 });
  assert.deepEqual(advanceSkill({ level: 10, xp: 33999 }, 50), { level: 10, xp: 34000 });
  assert.deepEqual(advanceSkill({ level: 0, xp: 0 }, 1000000), { level: 10, xp: 34000 });
  const first = readHorseSkills(),
    second = awardHorseSkillXP(first, 'wing', 188);
  assert.deepEqual(first.wing, { level: 0, xp: 0 });
  assert.deepEqual(second.wing, { level: 1, xp: 63 });
  assert.deepEqual(second.bond, { level: 0, xp: 0 });
  assert.equal(skillProgress(second.wing).percent, 15);
  for (const amount of [-1, 1.5, NaN, Infinity, '100', Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => awardHorseSkillXP(first, 'agility', amount));
  assert.throws(() => awardHorseSkillXP(first, 'unknown', 10));
});
