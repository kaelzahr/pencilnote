/**
 * useCanvasHistory
 * Command-pattern tabanlı undo/redo yığını.
 */
import { useCallback, useRef, useState } from 'react';

export type HistoryCommand =
  | { type: 'add'; stroke: any }
  | { type: 'erase'; removed: any[] }
  | { type: 'move'; strokeId: string; from: { x: number; y: number }; to: { x: number; y: number } };

interface HistoryState {
  undoStack: HistoryCommand[];
  redoStack: HistoryCommand[];
}

const MAX_HISTORY = 200;

export function useCanvasHistory() {
  const stateRef = useRef<HistoryState>({ undoStack: [], redoStack: [] });
  const [, forceRender] = useState(0);

  const pushHistory = useCallback((command: HistoryCommand) => {
    const s = stateRef.current;
    s.undoStack.push(command);
    if (s.undoStack.length > MAX_HISTORY) s.undoStack.shift();
    s.redoStack = [];
    forceRender((n) => n + 1);
  }, []);

  const canUndo = stateRef.current.undoStack.length > 0;
  const canRedo = stateRef.current.redoStack.length > 0;

  const undo = useCallback((applyInverse: (cmd: HistoryCommand) => void) => {
    const s = stateRef.current;
    const cmd = s.undoStack.pop();
    if (!cmd) return;
    s.redoStack.push(cmd);
    applyInverse(cmd);
    forceRender((n) => n + 1);
  }, []);

  const redo = useCallback((applyForward: (cmd: HistoryCommand) => void) => {
    const s = stateRef.current;
    const cmd = s.redoStack.pop();
    if (!cmd) return;
    s.undoStack.push(cmd);
    applyForward(cmd);
    forceRender((n) => n + 1);
  }, []);

  return { pushHistory, undo, redo, canUndo, canRedo };
}
