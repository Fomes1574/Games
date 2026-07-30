import { describe, expect, it } from 'vitest';

import { SeededRng } from '../../src/core/rng/SeededRng';

describe('SeededRng', () => {
  it('repete a mesma sequência para a mesma semente', () => {
    const first = new SeededRng(15_742);
    const second = new SeededRng(15_742);

    expect(Array.from({ length: 12 }, () => first.next())).toEqual(
      Array.from({ length: 12 }, () => second.next()),
    );
  });

  it('mantém inteiros dentro do intervalo inclusivo', () => {
    const rng = new SeededRng(99);
    const values = Array.from({ length: 200 }, () => rng.integer(3, 7));

    expect(Math.min(...values)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...values)).toBeLessThanOrEqual(7);
  });

  it('rejeita coleções vazias', () => {
    expect(() => new SeededRng(1).pick([])).toThrow(/vazia/i);
  });
});
