export const BOARD_SIZE = 4;
export const TARGET_TILE = 2048;

export type TileValue = number;
export type Cell = TileValue | null;
export type Board = Cell[][];
export type Direction = 'left' | 'right' | 'up' | 'down';

export interface Position {
  row: number;
  col: number;
}

export interface SpawnChoice extends Position {
  value: TileValue;
}

export interface GameState {
  board: Board;
  score: number;
  won: boolean;
  gameOver: boolean;
}

export type RandomNumberGenerator = () => number;

export type SpawnChooser = (
  emptyCells: Position[],
  board: Board,
  rng: RandomNumberGenerator,
) => SpawnChoice;

export interface SpawnOptions {
  rng?: RandomNumberGenerator;
  chooseSpawn?: SpawnChooser;
}

export interface MoveResult {
  state: GameState;
  moved: boolean;
  scoreDelta: number;
  spawnedTile: SpawnChoice | null;
}

interface LineMove {
  line: Cell[];
  scoreDelta: number;
}

const defaultRng: RandomNumberGenerator = Math.random;

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null));
}

export function createNewGame(options: SpawnOptions = {}): GameState {
  let board = createEmptyBoard();
  board = spawnTile(board, options).board;
  board = spawnTile(board, options).board;

  return {
    board,
    score: 0,
    won: false,
    gameOver: !hasAvailableMoves(board),
  };
}

export function move(
  state: GameState,
  direction: Direction,
  options: SpawnOptions = {},
): MoveResult {
  const { board, scoreDelta } = moveBoard(state.board, direction);

  if (boardsEqual(state.board, board)) {
    return {
      state: { ...state, board: cloneBoard(state.board), gameOver: !hasAvailableMoves(state.board) },
      moved: false,
      scoreDelta: 0,
      spawnedTile: null,
    };
  }

  const spawned = spawnTile(board, options);
  const nextBoard = spawned.board;
  const nextState: GameState = {
    board: nextBoard,
    score: state.score + scoreDelta,
    won: state.won || containsTile(nextBoard, TARGET_TILE),
    gameOver: !hasAvailableMoves(nextBoard),
  };

  return {
    state: nextState,
    moved: true,
    scoreDelta,
    spawnedTile: spawned.tile,
  };
}

export function moveBoard(board: Board, direction: Direction): { board: Board; scoreDelta: number } {
  const next = createEmptyBoard();
  let totalScoreDelta = 0;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const line = readLine(board, direction, index);
    const moved = moveLine(line);
    totalScoreDelta += moved.scoreDelta;
    writeLine(next, direction, index, moved.line);
  }

  return { board: next, scoreDelta: totalScoreDelta };
}

export function canMove(board: Board, direction: Direction): boolean {
  return !boardsEqual(board, moveBoard(board, direction).board);
}

export function hasAvailableMoves(board: Board): boolean {
  return getEmptyCells(board).length > 0 || canMove(board, 'left') || canMove(board, 'right')
    || canMove(board, 'up') || canMove(board, 'down');
}

export function getEmptyCells(board: Board): Position[] {
  const emptyCells: Position[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] === null) {
        emptyCells.push({ row, col });
      }
    }
  }

  return emptyCells;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function containsTile(board: Board, value: TileValue): boolean {
  return board.some((row) => row.includes(value));
}

function spawnTile(board: Board, options: SpawnOptions = {}): { board: Board; tile: SpawnChoice | null } {
  const emptyCells = getEmptyCells(board);

  if (emptyCells.length === 0) {
    return { board: cloneBoard(board), tile: null };
  }

  const rng = options.rng ?? defaultRng;
  const choice = options.chooseSpawn?.(emptyCells, cloneBoard(board), rng)
    ?? chooseRandomSpawn(emptyCells, rng);
  const validChoice = emptyCells.some((cell) => cell.row === choice.row && cell.col === choice.col);

  if (!validChoice) {
    throw new Error(`Invalid spawn position: (${choice.row}, ${choice.col})`);
  }

  const next = cloneBoard(board);
  next[choice.row][choice.col] = choice.value;
  return { board: next, tile: choice };
}

function chooseRandomSpawn(emptyCells: Position[], rng: RandomNumberGenerator): SpawnChoice {
  const cell = emptyCells[Math.floor(rng() * emptyCells.length)];
  return {
    ...cell,
    value: rng() < 0.9 ? 2 : 4,
  };
}

function moveLine(line: Cell[]): LineMove {
  const tiles = line.filter((cell): cell is TileValue => cell !== null);
  const moved: Cell[] = [];
  let scoreDelta = 0;

  for (let index = 0; index < tiles.length; index += 1) {
    const current = tiles[index];
    const next = tiles[index + 1];

    if (current === next) {
      const merged = current * 2;
      moved.push(merged);
      scoreDelta += merged;
      index += 1;
    } else {
      moved.push(current);
    }
  }

  while (moved.length < BOARD_SIZE) {
    moved.push(null);
  }

  return { line: moved, scoreDelta };
}

function readLine(board: Board, direction: Direction, index: number): Cell[] {
  switch (direction) {
    case 'left':
      return [...board[index]];
    case 'right':
      return [...board[index]].reverse();
    case 'up':
      return board.map((row) => row[index]);
    case 'down':
      return board.map((row) => row[index]).reverse();
  }
}

function writeLine(board: Board, direction: Direction, index: number, line: Cell[]): void {
  const values = direction === 'right' || direction === 'down' ? [...line].reverse() : line;

  switch (direction) {
    case 'left':
    case 'right':
      board[index] = values;
      break;
    case 'up':
    case 'down':
      values.forEach((cell, row) => {
        board[row][index] = cell;
      });
      break;
  }
}

function boardsEqual(left: Board, right: Board): boolean {
  return left.every((row, rowIndex) => row.every((cell, colIndex) => cell === right[rowIndex][colIndex]));
}
