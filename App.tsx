import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  type Board,
  type Direction,
  type MoveResult,
  type TileValue,
  BOARD_SIZE,
  createNewGame,
  move,
} from './src/game';

const BOARD_PADDING = 8;
const TILE_GAP = 8;
const SWIPE_THRESHOLD = 32;
const SLIDE_DURATION = 130;
const POP_DURATION = 90;
const SPAWN_DURATION = 110;

const directions: Direction[] = ['up', 'left', 'down', 'right'];

const tileColors: Record<number, string> = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

const directionLabels: Record<Direction, string> = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
};

const directionGlyphs: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

interface AnimatedTileState {
  id: string;
  value: TileValue;
  row: number;
  col: number;
  position: Animated.ValueXY;
  scale: Animated.Value;
  opacity: Animated.Value;
  shouldPop: boolean;
  zIndex: number;
}

interface MovingTile extends AnimatedTileState {
  nextValue: TileValue;
  removeAfterSlide: boolean;
}

export default function App() {
  const [game, setGame] = useState(() => createNewGame());
  const [bestScore, setBestScore] = useState(0);
  const nextTileId = useRef(1);
  const animationRunId = useRef(0);
  const isAnimating = useRef(false);
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 380);
  const tileSize = (boardSize - BOARD_PADDING * 2 - TILE_GAP * (BOARD_SIZE - 1)) / BOARD_SIZE;
  const [renderTiles, setRenderTiles] = useState(() => (
    createTilesFromBoard(game.board, tileSize, () => nextTileId.current += 1)
  ));
  const renderTilesRef = useRef(renderTiles);

  useEffect(() => {
    renderTilesRef.current = renderTiles;
  }, [renderTiles]);

  useEffect(() => {
    setBestScore((currentBest) => Math.max(currentBest, game.score));
  }, [game.score]);

  useEffect(() => {
    if (isAnimating.current) {
      return;
    }

    renderTilesRef.current.forEach((tile) => {
      tile.position.setValue(getTileOffset(tile.row, tile.col, tileSize));
    });
  }, [tileSize]);

  const playMove = useCallback((direction: Direction) => {
    if (isAnimating.current) {
      return;
    }

    setGame((currentGame) => {
      const result = move(currentGame, direction);

      if (!result.moved) {
        return currentGame;
      }

      const runId = animationRunId.current += 1;
      const animation = buildMoveAnimation({
        currentTiles: renderTilesRef.current,
        direction,
        result,
        tileSize,
        nextId: () => nextTileId.current += 1,
      });

      isAnimating.current = true;
      setRenderTiles(animation.movingTiles);

      Animated.parallel(animation.slideAnimations).start(() => {
        if (animationRunId.current !== runId) {
          return;
        }

        setRenderTiles(animation.finalTiles);

        requestAnimationFrame(() => {
          if (animationRunId.current !== runId) {
            return;
          }

          Animated.parallel(animation.settleAnimations).start(() => {
            if (animationRunId.current === runId) {
              isAnimating.current = false;
            }
          });
        });
      });

      return result.state;
    });
  }, [tileSize]);

  const startNewGame = useCallback(() => {
    animationRunId.current += 1;
    isAnimating.current = false;
    renderTilesRef.current.forEach(stopTileAnimations);

    const nextGame = createNewGame();
    setGame(nextGame);
    setRenderTiles(createTilesFromBoard(nextGame.board, tileSize, () => nextTileId.current += 1));
  }, [tileSize]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => (
        Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10
      ),
      onPanResponderRelease: (_, gesture) => {
        const { dx, dy } = gesture;

        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) {
          return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          playMove(dx > 0 ? 'right' : 'left');
        } else {
          playMove(dy > 0 ? 'down' : 'up');
        }
      },
    }),
    [playMove],
  );

  useEffect(() => {
    if (
      Platform.OS !== 'web'
      || typeof window === 'undefined'
      || typeof window.addEventListener !== 'function'
      || typeof window.removeEventListener !== 'function'
    ) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const keyDirections: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const direction = keyDirections[event.key];

      if (direction) {
        event.preventDefault();
        playMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playMove]);

  const message = game.gameOver
    ? 'Game over. Start a new game.'
    : game.won
      ? '2048 reached. Keep going.'
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My2048</Text>
          <Text style={styles.subtitle}>Join tiles to reach 2048.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={startNewGame}
          style={({ pressed }) => [styles.newGameButton, pressed && styles.pressed]}
        >
          <Text style={styles.newGameText}>New Game</Text>
        </Pressable>
      </View>

      <View style={styles.scoreRow}>
        <ScoreBox label="Score" value={game.score} />
        <ScoreBox label="Best" value={bestScore} />
      </View>

      {message ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <View
        {...panResponder.panHandlers}
        style={[styles.board, { width: boardSize, height: boardSize }]}
      >
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;
          const offset = getTileOffset(row, col, tileSize);

          return (
            <View
              key={`cell-${index}`}
              style={[
                styles.tile,
                styles.cell,
                {
                  height: tileSize,
                  left: offset.x,
                  top: offset.y,
                  width: tileSize,
                },
              ]}
            />
          );
        })}
        {renderTiles.map((tile) => (
          <AnimatedTile
            key={tile.id}
            size={tileSize}
            tile={tile}
          />
        ))}
      </View>

      <View style={styles.controls}>
        {directions.map((direction) => (
          <Pressable
            accessibilityLabel={`Move ${directionLabels[direction]}`}
            accessibilityRole="button"
            key={direction}
            onPress={() => playMove(direction)}
            style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
          >
            <Text style={styles.controlText}>{directionGlyphs[direction]}</Text>
          </Pressable>
        ))}
      </View>

      <StatusBar style="dark" />
    </View>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function AnimatedTile({
  size,
  tile,
}: {
  size: number;
  tile: AnimatedTileState;
}) {
  const backgroundColor = tileColors[tile.value] ?? '#3c3a32';
  const color = tile.value <= 4 ? '#776e65' : '#f9f6f2';
  const fontSize = tile.value >= 1000 ? 26 : tile.value >= 100 ? 30 : 34;

  return (
    <Animated.View
      style={[
        styles.tile,
        styles.animatedTile,
        {
          backgroundColor,
          height: size,
          opacity: tile.opacity,
          transform: [
            ...tile.position.getTranslateTransform(),
            { scale: tile.scale },
          ],
          width: size,
          zIndex: tile.zIndex,
        },
      ]}
    >
      <Text style={[styles.tileText, { color, fontSize }]}>{tile.value}</Text>
    </Animated.View>
  );
}

function createTilesFromBoard(
  board: Board,
  tileSize: number,
  nextId: () => number,
): AnimatedTileState[] {
  return board.flatMap((row, rowIndex) => row.flatMap((value, colIndex) => {
    if (!value) {
      return [];
    }

    return [createAnimatedTile({
      id: `tile-${nextId()}`,
      value,
      row: rowIndex,
      col: colIndex,
      tileSize,
    })];
  }));
}

function createAnimatedTile({
  id,
  value,
  row,
  col,
  tileSize,
  scale = 1,
  opacity = 1,
  shouldPop = false,
}: {
  id: string;
  value: TileValue;
  row: number;
  col: number;
  tileSize: number;
  scale?: number;
  opacity?: number;
  shouldPop?: boolean;
}): AnimatedTileState {
  return {
    id,
    value,
    row,
    col,
    position: new Animated.ValueXY(getTileOffset(row, col, tileSize)),
    scale: new Animated.Value(scale),
    opacity: new Animated.Value(opacity),
    shouldPop,
    zIndex: value,
  };
}

function buildMoveAnimation({
  currentTiles,
  direction,
  result,
  tileSize,
  nextId,
}: {
  currentTiles: AnimatedTileState[];
  direction: Direction;
  result: MoveResult;
  tileSize: number;
  nextId: () => number;
}): {
  movingTiles: AnimatedTileState[];
  finalTiles: AnimatedTileState[];
  slideAnimations: Animated.CompositeAnimation[];
  settleAnimations: Animated.CompositeAnimation[];
} {
  const movingTiles = getMovingTiles(currentTiles, direction);
  const settledTiles = movingTiles
    .filter((tile) => !tile.removeAfterSlide)
    .map((tile) => ({
      ...tile,
      value: tile.nextValue,
      shouldPop: tile.shouldPop,
      zIndex: tile.nextValue,
    }));

  const spawnedTile = result.spawnedTile
    ? createAnimatedTile({
      id: `tile-${nextId()}`,
      value: result.spawnedTile.value,
      row: result.spawnedTile.row,
      col: result.spawnedTile.col,
      tileSize,
      scale: 0.25,
      opacity: 0,
    })
    : null;
  const finalTiles = spawnedTile ? [...settledTiles, spawnedTile] : settledTiles;

  const slideAnimations = movingTiles.map((tile) => (
    Animated.timing(tile.position, {
      toValue: getTileOffset(tile.row, tile.col, tileSize),
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
  ));

  const settleAnimations = [
    ...finalTiles
      .filter((tile) => tile.shouldPop)
      .map((tile) => Animated.sequence([
        Animated.timing(tile.scale, {
          toValue: 1.12,
          duration: POP_DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tile.scale, {
          toValue: 1,
          duration: POP_DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])),
    ...(spawnedTile ? [
      Animated.parallel([
        Animated.timing(spawnedTile.opacity, {
          toValue: 1,
          duration: SPAWN_DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(spawnedTile.scale, {
          toValue: 1,
          speed: 18,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]),
    ] : []),
  ];

  return {
    movingTiles,
    finalTiles,
    slideAnimations,
    settleAnimations,
  };
}

function getMovingTiles(currentTiles: AnimatedTileState[], direction: Direction): MovingTile[] {
  const movingTiles: MovingTile[] = [];

  for (let lineIndex = 0; lineIndex < BOARD_SIZE; lineIndex += 1) {
    const lineTiles = currentTiles
      .filter((tile) => isTileInLine(tile, direction, lineIndex))
      .sort((left, right) => getLineOrder(left, direction) - getLineOrder(right, direction));

    let targetIndex = 0;

    for (let index = 0; index < lineTiles.length; index += 1) {
      const currentTile = lineTiles[index];
      const nextTile = lineTiles[index + 1];
      const target = getLineTarget(direction, lineIndex, targetIndex);

      if (nextTile && nextTile.value === currentTile.value) {
        const mergedValue = currentTile.value * 2;
        movingTiles.push(toMovingTile(currentTile, target, mergedValue, false, true));
        movingTiles.push(toMovingTile(nextTile, target, nextTile.value, true, false));
        index += 1;
      } else {
        movingTiles.push(toMovingTile(currentTile, target, currentTile.value, false, false));
      }

      targetIndex += 1;
    }
  }

  return movingTiles;
}

function toMovingTile(
  tile: AnimatedTileState,
  target: { row: number; col: number },
  nextValue: TileValue,
  removeAfterSlide: boolean,
  shouldPop: boolean,
): MovingTile {
  tile.scale.setValue(1);
  tile.opacity.setValue(1);

  return {
    ...tile,
    row: target.row,
    col: target.col,
    nextValue,
    removeAfterSlide,
    shouldPop,
    zIndex: removeAfterSlide ? tile.zIndex + 1 : tile.zIndex,
  };
}

function isTileInLine(tile: AnimatedTileState, direction: Direction, lineIndex: number): boolean {
  return direction === 'left' || direction === 'right'
    ? tile.row === lineIndex
    : tile.col === lineIndex;
}

function getLineOrder(tile: AnimatedTileState, direction: Direction): number {
  switch (direction) {
    case 'left':
      return tile.col;
    case 'right':
      return BOARD_SIZE - 1 - tile.col;
    case 'up':
      return tile.row;
    case 'down':
      return BOARD_SIZE - 1 - tile.row;
  }
}

function getLineTarget(
  direction: Direction,
  lineIndex: number,
  targetIndex: number,
): { row: number; col: number } {
  switch (direction) {
    case 'left':
      return { row: lineIndex, col: targetIndex };
    case 'right':
      return { row: lineIndex, col: BOARD_SIZE - 1 - targetIndex };
    case 'up':
      return { row: targetIndex, col: lineIndex };
    case 'down':
      return { row: BOARD_SIZE - 1 - targetIndex, col: lineIndex };
  }
}

function getTileOffset(row: number, col: number, tileSize: number): { x: number; y: number } {
  const stride = tileSize + TILE_GAP;
  return {
    x: BOARD_PADDING + col * stride,
    y: BOARD_PADDING + row * stride,
  };
}

function stopTileAnimations(tile: AnimatedTileState): void {
  tile.position.stopAnimation();
  tile.opacity.stopAnimation();
  tile.scale.stopAnimation();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8ef',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#776e65',
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 50,
  },
  subtitle: {
    color: '#8f7a66',
    fontSize: 15,
    fontWeight: '600',
  },
  newGameButton: {
    backgroundColor: '#8f7a66',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  newGameText: {
    color: '#f9f6f2',
    fontSize: 15,
    fontWeight: '800',
  },
  scoreRow: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: '#bbada0',
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 9,
  },
  scoreLabel: {
    color: '#eee4da',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scoreValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  message: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#edc22e',
    borderRadius: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  board: {
    backgroundColor: '#bbada0',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  tile: {
    alignItems: 'center',
    borderRadius: 6,
    justifyContent: 'center',
  },
  cell: {
    backgroundColor: '#cdc1b4',
    position: 'absolute',
  },
  animatedTile: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  tileText: {
    fontWeight: '900',
  },
  controls: {
    width: '100%',
    maxWidth: 260,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  controlButton: {
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8f7a66',
    borderRadius: 6,
  },
  controlText: {
    color: '#f9f6f2',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  pressed: {
    opacity: 0.75,
  },
});
