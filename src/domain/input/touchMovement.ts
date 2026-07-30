export interface MovementVector {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

const ZERO_VECTOR: MovementVector = { x: 0, y: 0 };

export function clampMovementVector(x: number, y: number): MovementVector {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { ...ZERO_VECTOR };
  }

  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) {
    return { ...ZERO_VECTOR };
  }
  if (magnitude <= 1) {
    return { x, y };
  }
  return {
    x: x / magnitude,
    y: y / magnitude,
  };
}

export function joystickVectorFromPoint(
  origin: Point,
  pointer: Point,
  radius: number,
  deadzone = 0.12,
): MovementVector {
  if (
    !Number.isFinite(radius) ||
    radius <= 0 ||
    !Number.isFinite(deadzone) ||
    deadzone < 0 ||
    deadzone >= 1
  ) {
    return { ...ZERO_VECTOR };
  }

  const raw = clampMovementVector(
    (pointer.x - origin.x) / radius,
    (pointer.y - origin.y) / radius,
  );
  const magnitude = Math.hypot(raw.x, raw.y);
  if (magnitude <= deadzone) {
    return { ...ZERO_VECTOR };
  }

  const adjustedMagnitude = Math.min(1, (magnitude - deadzone) / (1 - deadzone));
  return {
    x: (raw.x / magnitude) * adjustedMagnitude,
    y: (raw.y / magnitude) * adjustedMagnitude,
  };
}
