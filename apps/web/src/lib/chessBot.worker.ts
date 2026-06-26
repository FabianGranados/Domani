// Worker: corre el bot de ajedrez en un hilo aparte para no congelar la UI.
import { bestMove } from './chessBot';

self.onmessage = (e: MessageEvent<{ fen: string; depth: number }>) => {
  const { fen, depth } = e.data;
  const m = bestMove(fen, depth);
  (self as unknown as Worker).postMessage(
    m ? { from: m.from, to: m.to, promotion: m.promotion ?? undefined } : null
  );
};
