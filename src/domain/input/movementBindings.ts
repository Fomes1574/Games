export const MOVEMENT_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

export type MovementDirection = (typeof MOVEMENT_DIRECTIONS)[number];

export type MovementBindings = Record<MovementDirection, string>;

export const DEFAULT_MOVEMENT_BINDINGS: MovementBindings = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
};

export const ARROW_MOVEMENT_BINDINGS: MovementBindings = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

const KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  Backquote: '`',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  ControlLeft: 'Ctrl E',
  ControlRight: 'Ctrl D',
  Equal: '=',
  Escape: 'Esc',
  MetaLeft: 'Meta E',
  MetaRight: 'Meta D',
  Minus: '-',
  Period: '.',
  Quote: "'",
  Semicolon: ';',
  ShiftLeft: 'Shift E',
  ShiftRight: 'Shift D',
  Slash: '/',
  Space: 'Espaço',
  Tab: 'Tab',
};

export function parseMovementBindings(serialized: string | null): MovementBindings {
  if (!serialized) {
    return { ...DEFAULT_MOVEMENT_BINDINGS };
  }

  try {
    const candidate: unknown = JSON.parse(serialized);
    if (!isRecord(candidate)) {
      return { ...DEFAULT_MOVEMENT_BINDINGS };
    }

    const bindings = { ...DEFAULT_MOVEMENT_BINDINGS };
    for (const direction of MOVEMENT_DIRECTIONS) {
      const code = candidate[direction];
      if (isBindableMovementCode(code)) {
        bindings[direction] = code;
      }
    }
    return hasUniqueCodes(bindings) ? bindings : { ...DEFAULT_MOVEMENT_BINDINGS };
  } catch {
    return { ...DEFAULT_MOVEMENT_BINDINGS };
  }
}

export function rebindMovement(
  current: MovementBindings,
  direction: MovementDirection,
  code: string,
): MovementBindings {
  if (!isBindableMovementCode(code)) {
    return { ...current };
  }

  const next = { ...current };
  const previousCode = current[direction];
  const duplicateDirection = MOVEMENT_DIRECTIONS.find(
    (candidate) => candidate !== direction && current[candidate] === code,
  );

  next[direction] = code;
  if (duplicateDirection) {
    next[duplicateDirection] = previousCode;
  }
  return next;
}

export function formatKeyboardCode(code: string): string {
  const known = KEY_LABELS[code];
  if (known) {
    return known;
  }
  if (code.startsWith('Key') && code.length === 4) {
    return code.slice(3);
  }
  if (code.startsWith('Digit') && code.length === 6) {
    return code.slice(5);
  }
  if (code.startsWith('Numpad')) {
    return `Num ${code.slice(6)}`;
  }
  return code.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function usesArrowBindings(bindings: MovementBindings): boolean {
  return Object.values(bindings).some((code) => code.startsWith('Arrow'));
}

export function isBindableMovementCode(value: unknown): value is string {
  return isKeyboardCode(value) && value !== 'Escape';
}

function isKeyboardCode(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value !== 'Unidentified' &&
    value.length > 0 &&
    value.length <= 40 &&
    /^[A-Za-z0-9]+$/.test(value)
  );
}

function hasUniqueCodes(bindings: MovementBindings): boolean {
  return new Set(Object.values(bindings)).size === MOVEMENT_DIRECTIONS.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
