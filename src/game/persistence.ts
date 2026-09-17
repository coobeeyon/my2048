import { BOARD_SIZE, type Board, type GameState } from './engine';

export interface PersistedGame {
  game: GameState;
  bestScore: number;
}

export function parsePersistedGame(saved: string | null): PersistedGame | null {
  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<PersistedGame>;

    if (!isGameState(parsed.game) || !isValidScore(parsed.bestScore)) {
      return null;
    }

    return {
      game: parsed.game,
      bestScore: parsed.bestScore,
    };
  } catch {
    return null;
  }
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<GameState>;
  return isBoard(state.board)
    && isValidScore(state.score)
    && typeof state.won === 'boolean'
    && typeof state.gameOver === 'boolean';
}

function isBoard(value: unknown): value is Board {
  return Array.isArray(value)
    && value.length === BOARD_SIZE
    && value.every((row) => (
      Array.isArray(row)
      && row.length === BOARD_SIZE
      && row.every((cell) => cell === null || (isValidScore(cell) && cell >= 2 && Number.isInteger(Math.log2(cell))))
    ));
}

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

