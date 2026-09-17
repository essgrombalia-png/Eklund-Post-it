import { useState, useCallback, useRef } from 'react';
import { PostItNote } from '../types';

interface UseHistoryReturn {
  notes: PostItNote[];
  setNotesWithHistory: (newNotes: PostItNote[] | ((prev: PostItNote[]) => PostItNote[]), recordHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 30;

export function useNotesHistory(initialNotes: PostItNote[]): UseHistoryReturn {
  const [notes, setNotesState] = useState<PostItNote[]>(initialNotes);
  const undoStackRef = useRef<PostItNote[][]>([]);
  const redoStackRef = useRef<PostItNote[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateStacksStatus = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const setNotesWithHistory = useCallback(
    (
      newNotesOrUpdater: PostItNote[] | ((prev: PostItNote[]) => PostItNote[]),
      recordHistory: boolean = true
    ) => {
      setNotesState((prevNotes) => {
        const nextNotes =
          typeof newNotesOrUpdater === 'function'
            ? newNotesOrUpdater(prevNotes)
            : newNotesOrUpdater;

        if (recordHistory) {
          // Push copy of previous notes to undo stack
          undoStackRef.current.push(prevNotes);
          if (undoStackRef.current.length > MAX_HISTORY) {
            undoStackRef.current.shift();
          }
          // Clear redo stack on new action
          redoStackRef.current = [];
          updateStacksStatus();
        }

        return nextNotes;
      });
    },
    [updateStacksStatus]
  );

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    setNotesState((currentNotes) => {
      const previousState = undoStackRef.current.pop();
      if (!previousState) return currentNotes;

      redoStackRef.current.push(currentNotes);
      updateStacksStatus();
      return previousState;
    });
  }, [updateStacksStatus]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    setNotesState((currentNotes) => {
      const nextState = redoStackRef.current.pop();
      if (!nextState) return currentNotes;

      undoStackRef.current.push(currentNotes);
      updateStacksStatus();
      return nextState;
    });
  }, [updateStacksStatus]);

  return {
    notes,
    setNotesWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
