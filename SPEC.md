# My2048 Specification

## Goal

Build a React Native phone app that plays the classic 2048 sliding tile game. The first version should be a complete, playable local game with correct rules, touch-first interaction, and a clean mobile layout.

## Target Platform

- React Native app for a phone screen.
- Touch/swipe input is the primary control.
- The game should run locally without a backend.

## Gameplay

The app presents a 4x4 board of numbered tiles. The player swipes up, down, left, or right. Tiles slide as far as possible in the swipe direction. Adjacent tiles with the same value merge into one tile with double the value.

Rules:

- A new game starts with two tiles on the board.
- Starting tiles are value 2 or 4.
- A move is valid only when at least one tile moves or merges.
- After each valid move, one new tile appears in a random empty cell.
- New spawned tiles should usually be 2, with occasional 4 tiles.
- Each tile can merge at most once per move.
- The score increases by the value of each merged tile.
- The player wins when a 2048 tile is created.
- The game is over when there are no empty cells and no adjacent equal tiles.
- After winning, the app may allow the player to continue playing.

## User Experience

The first screen should be the playable game, not a landing page. The interface should include:

- 4x4 game board.
- Current score.
- Best score.
- New game/reset control.
- Clear win state.
- Clear game-over state.

The board should fit comfortably on a phone screen and remain usable in portrait orientation. Swipe gestures that do not change the board should be ignored and must not spawn a tile.

## Implementation Requirements

Game logic should be implemented separately from React UI components so it can be tested directly.

The logic should support:

- Creating a new board.
- Moving in all four directions.
- Detecting whether a move changed the board.
- Applying merge rules correctly.
- Updating score from merges.
- Spawning a tile after valid moves.
- Detecting win state.
- Detecting game-over state.

Random tile spawning should be isolated so tests can supply deterministic random choices.

## Persistence

The app should persist:

- Current board.
- Current score.
- Best score.
- Win/game-over state.

Persistence should be local to the device.

## Testing

The game logic should have tests for:

- Initial board setup.
- Left, right, up, and down movement.
- Single-merge-per-tile behavior.
- Invalid moves not spawning tiles.
- Score updates from merges.
- Win detection.
- Game-over detection.

## Initial Acceptance Criteria

- A user can install/run the app and immediately play 2048.
- Swipes move and merge tiles according to 2048 rules.
- Valid moves spawn exactly one new tile.
- Invalid moves do not change state or spawn tiles.
- Score and best score are visible.
- New game resets the board and current score.
- Win and game-over states are visible.
- Core game logic is covered by automated tests.
