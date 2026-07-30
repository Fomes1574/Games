export class SeededRng {
  private state: number;

  public constructor(seed: number) {
    const normalized = seed >>> 0;
    this.state = normalized === 0 ? 0x6d2b79f5 : normalized;
  }

  public next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }

  public integer(minimum: number, maximum: number): number {
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || maximum < minimum) {
      throw new RangeError('O intervalo inteiro do RNG é inválido.');
    }

    return minimum + Math.floor(this.next() * (maximum - minimum + 1));
  }

  public pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new RangeError('Não é possível sortear uma coleção vazia.');
    }

    return values[this.integer(0, values.length - 1)] as T;
  }

  public weightedPick<T>(entries: readonly { value: T; weight: number }[]): T {
    const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
    if (total <= 0) {
      throw new RangeError('O sorteio ponderado precisa de ao menos um peso positivo.');
    }

    let cursor = this.next() * total;
    for (const entry of entries) {
      cursor -= Math.max(0, entry.weight);
      if (cursor <= 0) {
        return entry.value;
      }
    }

    return entries.at(-1)?.value as T;
  }
}
