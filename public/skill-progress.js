export const skillNames = ['agility', 'strength', 'jump', 'bond', 'wing'];
export const skillXPRequirements = [125, 400, 975, 2000, 3600, 6000, 9250, 13600, 20300, 26000, 34000];

export function readHorseSkills(input = {}) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some(key => !skillNames.includes(key))
  )
    throw new Error('Invalid horse skills.');
  return Object.fromEntries(
    skillNames.map(name => {
      const value = input[name] ?? { level: 0, xp: 0 };
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        !Number.isSafeInteger(value.level) ||
        value.level < 0 ||
        !Number.isSafeInteger(value.xp) ||
        value.xp < 0
      )
        throw new Error('Skill levels and XP must be nonnegative whole numbers.');
      return [name, advanceSkill(value)];
    })
  );
}

export function skillProgress(value) {
  value = advanceSkill(value);
  const maxed = value.level > 10 || (value.level === 10 && value.xp >= skillXPRequirements[10]);
  const xpNeeded = maxed ? null : skillXPRequirements[value.level];
  return { ...value, maxed, xpNeeded, percent: maxed ? 100 : Math.min(100, Math.floor((value.xp / xpNeeded) * 100)) };
}

// XP is relative to the current level; overflow carries into subsequent levels.
export function advanceSkill(value, amount = 0) {
  if (
    !value ||
    !Number.isSafeInteger(value.level) ||
    value.level < 0 ||
    !Number.isSafeInteger(value.xp) ||
    value.xp < 0 ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(value.xp + amount)
  )
    throw new Error('XP must be a nonnegative whole number.');
  let level = Math.min(10, value.level),
    xp = value.level > 10 ? skillXPRequirements[10] : value.xp + amount;
  while (level < 10 && xp >= skillXPRequirements[level]) {
    xp -= skillXPRequirements[level];
    level++;
  }
  return { level, xp: level === 10 ? Math.min(xp, skillXPRequirements[10]) : xp };
}
export function awardHorseSkillXP(input, skill, amount) {
  if (!skillNames.includes(skill)) throw new Error('Unknown horse skill.');
  const skills = readHorseSkills(input);
  skills[skill] = advanceSkill(skills[skill], amount);
  return skills;
}
