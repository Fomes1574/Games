import { describe, expect, it } from 'vitest';

import {
  clampMovementVector,
  joystickVectorFromPoint,
} from '../../src/domain/input/touchMovement';

describe('movimento por toque', () => {
  it('normaliza vetores maiores que o limite do analógico', () => {
    expect(clampMovementVector(3, 4)).toEqual({ x: 0.6, y: 0.8 });
    expect(clampMovementVector(Number.NaN, 1)).toEqual({ x: 0, y: 0 });
    expect(clampMovementVector(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('remove tremor no centro e preserva direção fora da zona morta', () => {
    const origin = { x: 100, y: 100 };

    expect(joystickVectorFromPoint(origin, { x: 104, y: 103 }, 50)).toEqual({
      x: 0,
      y: 0,
    });

    const right = joystickVectorFromPoint(origin, { x: 150, y: 100 }, 50);
    expect(right.x).toBeCloseTo(1);
    expect(right.y).toBeCloseTo(0);
  });

  it('limita o arraste e rejeita configuração inválida', () => {
    const diagonal = joystickVectorFromPoint(
      { x: 0, y: 0 },
      { x: 200, y: 200 },
      40,
    );
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(joystickVectorFromPoint({ x: 0, y: 0 }, { x: 1, y: 1 }, 0)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
