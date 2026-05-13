import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  type Direction,
  type TileValue,
  BOARD_SIZE,
  createNewGame,
  move,
} from './src/game';

const BOARD_PADDING = 8;
const TILE_GAP = 8;
const SWIPE_THRESHOLD = 32;

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

export default function App() {
  const [game, setGame] = useState(() => createNewGame());
  const [bestScore, setBestScore] = useState(0);
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 380);
  const tileSize = (boardSize - BOARD_PADDING * 2 - TILE_GAP * (BOARD_SIZE - 1)) / BOARD_SIZE;

  useEffect(() => {
    setBestScore((currentBest) => Math.max(currentBest, game.score));
  }, [game.score]);

  const playMove = useCallback((direction: Direction) => {
    setGame((currentGame) => {
      const result = move(currentGame, direction);
      return result.moved ? result.state : currentGame;
    });
  }, []);

  const startNewGame = useCallback(() => {
    setGame(createNewGame());
  }, []);

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
    if (typeof window === 'undefined') {
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
        {game.board.map((row, rowIndex) => row.map((cell, colIndex) => (
          <Tile
            key={`${rowIndex}-${colIndex}`}
            size={tileSize}
            value={cell}
            isLastColumn={colIndex === BOARD_SIZE - 1}
            isLastRow={rowIndex === BOARD_SIZE - 1}
          />
        )))}
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

function Tile({
  size,
  value,
  isLastColumn,
  isLastRow,
}: {
  size: number;
  value: TileValue | null;
  isLastColumn: boolean;
  isLastRow: boolean;
}) {
  const tileValue = value ?? 0;
  const backgroundColor = value ? tileColors[value] ?? '#3c3a32' : '#cdc1b4';
  const color = value && value <= 4 ? '#776e65' : '#f9f6f2';
  const fontSize = tileValue >= 1000 ? 26 : tileValue >= 100 ? 30 : 34;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor,
          height: size,
          marginBottom: isLastRow ? 0 : TILE_GAP,
          marginRight: isLastColumn ? 0 : TILE_GAP,
          width: size,
        },
      ]}
    >
      {value ? (
        <Text style={[styles.tileText, { color, fontSize }]}>{value}</Text>
      ) : null}
    </View>
  );
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: BOARD_PADDING,
  },
  tile: {
    alignItems: 'center',
    borderRadius: 6,
    justifyContent: 'center',
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
