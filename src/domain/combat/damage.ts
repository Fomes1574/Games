export interface DamageInput {
  amount: number;
  armor: number;
  resistance: number;
  criticalChance: number;
  criticalMultiplier: number;
  criticalRoll: number;
}

export interface DamageResult {
  raw: number;
  mitigated: number;
  final: number;
  critical: boolean;
}

export function resolveDamage(input: DamageInput): DamageResult {
  const raw = finiteNonNegative(input.amount);
  const armor = finiteNonNegative(input.armor);
  const resistance = clamp(input.resistance, 0, 0.8);
  const criticalChance = clamp(input.criticalChance, 0, 1);
  const criticalMultiplier = Math.max(1, finiteNonNegative(input.criticalMultiplier));
  const critical = clamp(input.criticalRoll, 0, 1) < criticalChance;
  const criticalDamage = raw * (critical ? criticalMultiplier : 1);
  const afterArmor = criticalDamage * (100 / (100 + armor));
  const mitigated = criticalDamage - afterArmor * (1 - resistance);
  const final = Math.max(0, criticalDamage - mitigated);

  return {
    raw: criticalDamage,
    mitigated,
    final,
    critical,
  };
}

export function applyHealing(current: number, maximum: number, healing: number): number {
  const safeMaximum = finiteNonNegative(maximum);
  return clamp(finiteNonNegative(current) + finiteNonNegative(healing), 0, safeMaximum);
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}
