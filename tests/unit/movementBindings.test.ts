import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MOVEMENT_BINDINGS,
  formatKeyboardCode,
  parseMovementBindings,
  rebindMovement,
  usesArrowBindings,
} from '../../src/domain/input/movementBindings';

describe('movement bindings', () => {
  it('carrega os padrões quando a preferência não existe ou está corrompida', () => {
    expect(parseMovementBindings(null)).toEqual(DEFAULT_MOVEMENT_BINDINGS);
    expect(parseMovementBindings('{não é json')).toEqual(DEFAULT_MOVEMENT_BINDINGS);
    expect(
      parseMovementBindings(
        JSON.stringify({ up: 'KeyI', down: 'KeyI', left: 'KeyJ', right: 'KeyL' }),
      ),
    ).toEqual(DEFAULT_MOVEMENT_BINDINGS);
  });

  it('troca direções quando uma tecla já atribuída é escolhida', () => {
    const rebound = rebindMovement(DEFAULT_MOVEMENT_BINDINGS, 'up', 'KeyS');

    expect(rebound).toEqual({
      up: 'KeyS',
      down: 'KeyW',
      left: 'KeyA',
      right: 'KeyD',
    });
  });

  it('aceita teclas físicas variadas e produz rótulos legíveis', () => {
    const rebound = rebindMovement(DEFAULT_MOVEMENT_BINDINGS, 'left', 'Numpad4');

    expect(rebound.left).toBe('Numpad4');
    expect(formatKeyboardCode('Numpad4')).toBe('Num 4');
    expect(formatKeyboardCode('Space')).toBe('Espaço');
    expect(formatKeyboardCode('KeyQ')).toBe('Q');
    expect(rebindMovement(rebound, 'up', 'Escape')).toEqual(rebound);
  });

  it('identifica quando as setas fazem parte do mapa personalizado', () => {
    expect(usesArrowBindings(DEFAULT_MOVEMENT_BINDINGS)).toBe(false);
    expect(
      usesArrowBindings({ ...DEFAULT_MOVEMENT_BINDINGS, up: 'ArrowUp' }),
    ).toBe(true);
  });
});
