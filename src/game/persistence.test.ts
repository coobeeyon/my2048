import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePersistedGame } from './persistence';

const save = {
  game: {
    board: [[2, 4, null, null], [8, 16, null, null], [32, 64, null, null], [1024, 2048, null, null]],
    score: 1234,
    won: true,
    gameOver: false,
  },
  bestScore: 4096,
};

test('restores the complete game and independent best score', () => {
  assert.deepEqual(parsePersistedGame(JSON.stringify(save)), save);
});

test('rejects absent, malformed, and wrong-shaped saves', () => {
  for (const raw of [null, '', 'bad json', 'null', '[]', '{}', JSON.stringify({ ...save, game: { ...save.game, board: [[2]] } })]) {
    assert.equal(parsePersistedGame(raw), null);
  }
});

test('rejects board values that the 2048 engine cannot produce', () => {
  for (const tile of [0, -2, 1, 3, 2.5, '2', 2 ** 53]) {
    const invalid = structuredClone(save);
    (invalid.game.board[0] as unknown[])[0] = tile;
    assert.equal(parsePersistedGame(JSON.stringify(invalid)), null, String(tile));
  }
});

test('rejects invalid scores and nonboolean outcome flags', () => {
  for (const score of [-1, 1.5, '4', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parsePersistedGame(JSON.stringify({ ...save, bestScore: score })), null);
    assert.equal(parsePersistedGame(JSON.stringify({ ...save, game: { ...save.game, score } })), null);
  }
  for (const flag of ['false', null, 0]) {
    for (const field of ['won', 'gameOver']) {
      assert.equal(parsePersistedGame(JSON.stringify({ ...save, game: { ...save.game, [field]: flag } })), null);
    }
  }
});
