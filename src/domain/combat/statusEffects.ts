export function transferredPoisonDuration(remainingSeconds: number): number {
  return finiteNonNegative(remainingSeconds) * 0.5;
}

export function applyDamageVulnerability(
  damage: number,
  vulnerability: number,
  source: 'weapon' | 'poison',
): number {
  const safeDamage = finiteNonNegative(damage);
  if (source === 'poison') {
    return safeDamage;
  }
  return safeDamage * (1 + clamp(vulnerability, 0, 0.5));
}

export function slowMultiplier(
  regularSlow: number,
  bossSlow: number,
  isBoss: boolean,
): number {
  const slow = isBoss ? bossSlow : regularSlow;
  return 1 - clamp(slow, 0, 0.75);
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}
