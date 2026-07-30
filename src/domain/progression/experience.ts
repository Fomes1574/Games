export interface LevelProgress {
  level: number;
  experience: number;
  experienceForNext: number;
  levelsGained: number;
}

export function experienceRequired(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.floor(18 + safeLevel * 10 + safeLevel ** 1.35 * 3);
}

export function addExperience(
  level: number,
  experience: number,
  gained: number,
): LevelProgress {
  let currentLevel = Math.max(1, Math.floor(level));
  let currentExperience = Math.max(0, experience) + Math.max(0, gained);
  let levelsGained = 0;
  let required = experienceRequired(currentLevel);

  while (currentExperience >= required && levelsGained < 20) {
    currentExperience -= required;
    currentLevel += 1;
    levelsGained += 1;
    required = experienceRequired(currentLevel);
  }

  return {
    level: currentLevel,
    experience: currentExperience,
    experienceForNext: required,
    levelsGained,
  };
}
