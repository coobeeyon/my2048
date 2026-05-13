import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  type Board,
  type GameState,
  type SpawnChoice,
  createNewGame,
  getEmptyCells,
  hasAvailableMoves,
  move,
} from './engine';

function state(board: Board, score = 0): GameState {
  return {
    board,
    score,
    won: false,
    gameOver: !hasAvailableMoves(board),
  };
}

function spawnQueue(choices: SpawnChoice[]) {
  const queue = [...choices];

  return () => {
    const choice = queue.shift();

    if (!choice) {
      throw new Error('No spawn choice queued');
    }

    return choice;
  };
}

const spawnAtFirstEmpty = (value = 2) => (emptyCells: ReturnType<typeof getEmptyCells>): SpawnChoice => ({
  ...emptyCells[0],
  value,
});

describe('2048 engine', () => {
  it('creates a new game with two spawned tiles and zero score', () => {
    const game = createNewGame({
      chooseSpawn: spawnQueue([
        { row: 0, col: 0, value: 2 },
        { row: 3, col: 3, value: 4 },
      ]),
    });

    assert.deepEqual(game.board, [
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, 4],
    ]);
    assert.equal(game.score, 0);
    assert.equal(game.won, false);
    assert.equal(game.gameOver, false);
  });

  it('moves and merges tiles left', () => {
    const result = move(state([
      [2, null, 2, 4],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]), 'left', { chooseSpawn: spawnAtFirstEmpty() });

    assert.equal(result.moved, true);
    assert.equal(result.scoreDelta, 4);
    assert.deepEqual(result.state.board, [
      [4, 4, 2, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    assert.deepEqual(result.spawnedTile, { row: 0, col: 2, value: 2 });
  });

  it('moves and merges tiles right', () => {
    const result = move(state([
      [2, null, 2, 4],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]), 'right', { chooseSpawn: spawnAtFirstEmpty() });

    assert.equal(result.scoreDelta, 4);
    assert.deepEqual(result.state.board, [
      [2, null, 4, 4],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
  });

  it('moves and merges tiles up', () => {
    const result = move(state([
      [2, null, null, null],
      [null, null, null, null],
      [2, null, null, null],
      [4, null, null, null],
    ]), 'up', { chooseSpawn: spawnAtFirstEmpty() });

    assert.equal(result.scoreDelta, 4);
    assert.deepEqual(result.state.board, [
      [4, 2, null, null],
      [4, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
  });

  it('moves and merges tiles down', () => {
    const result = move(state([
      [2, null, null, null],
      [null, null, null, null],
      [2, null, null, null],
      [4, null, null, null],
    ]), 'down', { chooseSpawn: spawnAtFirstEmpty() });

    assert.equal(result.scoreDelta, 4);
    assert.deepEqual(result.state.board, [
      [2, null, null, null],
      [null, null, null, null],
      [4, null, null, null],
      [4, null, null, null],
    ]);
  });

  it('prevents a tile from merging more than once per move', () => {
    const result = move(state([
      [2, 2, 2, 2],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]), 'left', { chooseSpawn: spawnAtFirstEmpty() });

    assert.equal(result.scoreDelta, 8);
    assert.deepEqual(result.state.board, [
      [4, 4, 2, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
  });

  it('does not spawn a tile after an invalid move', () => {
    const start = state([
      [2, 4, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ], 12);
    const result = move(start, 'left', { chooseSpawn: spawnAtFirstEmpty() });

    assert.equal(result.moved, false);
    assert.equal(result.scoreDelta, 0);
    assert.equal(result.spawnedTile, null);
    assert.deepEqual(result.state.board, start.board);
    assert.equal(result.state.score, 12);
  });

  it('adds all merge values to the score', () => {
    const result = move(state([
      [2, 2, null, null],
      [4, 4, null, null],
      [8, 8, null, null],
      [null, null, null, null],
    ], 20), 'left', { chooseSpawn: spawnAtFirstEmpty() });

    assert.equal(result.scoreDelta, 28);
    assert.equal(result.state.score, 48);
  });

  it('detects a win when a 2048 tile is created', () => {
    const result = move(state([
      [1024, 1024, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]), 'left', { chooseSpawn: spawnAtFirstEmpty() });

    assert.equal(result.state.won, true);
    assert.equal(result.scoreDelta, 2048);
  });

  it('detects game over when no moves remain', () => {
    const game = state([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);

    assert.equal(game.gameOver, true);
    assert.equal(hasAvailableMoves(game.board), false);
  });
});
