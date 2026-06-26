// Worker: corre el bot de ajedrez en un hilo aparte para no congelar la UI.
import { bestMoveForLevel, bestMove, type Level } from './chessBot';

self.onmessage = (e: MessageEvent<{ fen: string; level?: Level; depth?: number }>) => {
  const { fen, level, depth } = e.data;
  const m = level != null ? bestMoveForLevel(fen, level) : bestMove(fen, depth ?? 3);
  (self as unknown as Worker).postMessage(
    m ? { from: m.from, to: m.to, promotion: m.promotion ?? undefined } : null
  );
};
