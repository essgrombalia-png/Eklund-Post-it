import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PostItNote,
  TrashNote,
  PostItColor,
  DeskTheme,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
} from './types';
import {
  loadNotesFromStorage,
  saveNotesToStorage,
  loadTrashFromStorage,
  saveTrashToStorage,
  loadThemeFromStorage,
  saveThemeToStorage,
  exportNotesToJson,
} from './utils/storage';
import { useNotesHistory } from './utils/history';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { TrashModal } from './components/TrashModal';
import { Toast, ToastMessage } from './components/Toast';

export default function App() {
  const initialNotes = loadNotesFromStorage();
  const {
    notes,
    setNotesWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useNotesHistory(initialNotes);

  const [trashNotes, setTrashNotes] = useState<TrashNote[]>(loadTrashFromStorage);
  const [isTrashOpen, setIsTrashOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<DeskTheme>(loadThemeFromStorage);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeColorFilter, setActiveColorFilter] = useState<PostItColor | 'all' | 'pinned'>('all');
  const [noteToDelete, setNoteToDelete] = useState<PostItNote | null>(null);
  const [isAutoSaved, setIsAutoSaved] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Highest z-index tracking
  const maxZIndexRef = useRef<number>(
    notes.reduce((max, n) => Math.max(max, n.zIndex || 1), 10)
  );

  // Sync dark class with document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveThemeToStorage(theme);
  }, [theme]);

  // Auto-save to localStorage whenever notes change
  useEffect(() => {
    saveNotesToStorage(notes);
    setIsAutoSaved(true);
  }, [notes]);

  // Auto-save trashed notes to localStorage
  useEffect(() => {
    saveTrashToStorage(trashNotes);
  }, [trashNotes]);

  // Bring note to front
  const handleBringToFront = useCallback((id: string) => {
    maxZIndexRef.current += 1;
    const newZ = maxZIndexRef.current;
    setNotesWithHistory((prevNotes) =>
      prevNotes.map((n) => (n.id === id ? { ...n, zIndex: newZ } : n)),
      false // don't record z-index bump in undo history
    );
  }, [setNotesWithHistory]);

  // Update a single note
  const handleUpdateNote = useCallback(
    (updatedNote: PostItNote, recordHistory: boolean = true) => {
      setNotesWithHistory(
        (prevNotes) =>
          prevNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n)),
        recordHistory
      );
    },
    [setNotesWithHistory]
  );

  // Show quick toast notification
  const showToast = (text: string, type: 'success' | 'info' | 'undo' = 'success', undoAction?: () => void) => {
    setToast({
      id: Math.random().toString(36).substring(2),
      text,
      type,
      undoAction,
    });
  };

  // Add new note
  const handleAddNote = useCallback(
    (color?: PostItColor, customX?: number, customY?: number) => {
      const colors: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
      const chosenColor =
        color || colors[Math.floor(Math.random() * colors.length)];

      maxZIndexRef.current += 1;

      // Position note centrally relative to current pan and zoom if not custom
      const posX =
        customX !== undefined
          ? customX
          : Math.max(30, Math.round(-panOffset.x / zoom + (window.innerWidth / (2 * zoom)) - (DEFAULT_NOTE_WIDTH / 2)));
      const posY =
        customY !== undefined
          ? customY
          : Math.max(40, Math.round(-panOffset.y / zoom + (window.innerHeight / (3 * zoom)) - (DEFAULT_NOTE_HEIGHT / 2)));

      // Subtle natural rotation between -2 and +2 degrees
      const rotation = Number((Math.random() * 3.4 - 1.7).toFixed(1));

      const newNote: PostItNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: '',
        content: '',
        color: chosenColor,
        x: posX,
        y: posY,
        width: DEFAULT_NOTE_WIDTH,
        height: DEFAULT_NOTE_HEIGHT,
        rotation,
        isPinned: false,
        zIndex: maxZIndexRef.current,
        fontFamily: 'handwriting',
        fontSize: 'base',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        versions: [
          {
            id: `ver-init-${Date.now()}`,
            timestamp: Date.now(),
            title: '',
            content: '',
            color: chosenColor,
            fontFamily: 'handwriting',
            fontSize: 'base',
            changeType: 'created',
            summary: 'Lapp skapad',
          },
        ],
      };

      setNotesWithHistory((prev) => [newNote, ...prev], true);
      showToast('Ny Post-it skapad! ✨');
    },
    [panOffset, zoom, setNotesWithHistory]
  );

  // Double tap on canvas creates note right there
  const handleDoubleTapCreate = useCallback(
    (x: number, y: number) => {
      handleAddNote(undefined, x, y);
    },
    [handleAddNote]
  );

  // Duplicate note
  const handleDuplicateNote = useCallback(
    (noteToDuplicate: PostItNote) => {
      maxZIndexRef.current += 1;
      const duplicatedNote: PostItNote = {
        ...noteToDuplicate,
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: noteToDuplicate.title ? `${noteToDuplicate.title} (kopia)` : '',
        x: noteToDuplicate.x + 25,
        y: noteToDuplicate.y + 25,
        rotation: Number((Math.random() * 3.4 - 1.7).toFixed(1)),
        zIndex: maxZIndexRef.current,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        versions: [
          {
            id: `ver-init-${Date.now()}`,
            timestamp: Date.now(),
            title: noteToDuplicate.title ? `${noteToDuplicate.title} (kopia)` : '',
            content: noteToDuplicate.content,
            color: noteToDuplicate.color,
            drawingData: noteToDuplicate.drawingData,
            imageUrl: noteToDuplicate.imageUrl,
            imageConfig: noteToDuplicate.imageConfig ? { ...noteToDuplicate.imageConfig } : undefined,
            fontFamily: noteToDuplicate.fontFamily,
            fontSize: noteToDuplicate.fontSize,
            changeType: 'created',
            summary: `Duplicerad från "${noteToDuplicate.title || 'Lapp'}"`,
          },
        ],
      };

      setNotesWithHistory((prev) => [duplicatedNote, ...prev], true);
      showToast('Lapp duplicerad! 📑');
    },
    [setNotesWithHistory]
  );

  // Request note deletion (opens confirmation modal)
  const handleRequestDelete = useCallback((note: PostItNote) => {
    setNoteToDelete(note);
  }, []);

  // Confirm delete note (moves to Papperskorgen with 30-day retention)
  const handleConfirmDelete = useCallback(() => {
    if (!noteToDelete) return;
    const deleted = noteToDelete;

    const trashItem: TrashNote = {
      ...deleted,
      deletedAt: Date.now(),
    };

    setNotesWithHistory(
      (prev) => prev.filter((n) => n.id !== deleted.id),
      true
    );
    setTrashNotes((prev) => [trashItem, ...prev.filter((t) => t.id !== deleted.id)]);
    setNoteToDelete(null);

    // Provide quick undo button in toast banner
    showToast(`"${deleted.title || 'Lapp'}" flyttades till papperskorgen 🗑️`, 'undo', () => {
      setTrashNotes((prev) => prev.filter((t) => t.id !== deleted.id));
      setNotesWithHistory((prev) => [deleted, ...prev], true);
    });
  }, [noteToDelete, setNotesWithHistory]);

  // Restore a note from Papperskorgen back to the desk
  const handleRestoreNote = useCallback(
    (trashNote: TrashNote) => {
      maxZIndexRef.current += 1;
      const { deletedAt, ...rest } = trashNote;
      const restoredNote: PostItNote = {
        ...rest,
        zIndex: maxZIndexRef.current,
        updatedAt: Date.now(),
      };

      setTrashNotes((prev) => prev.filter((t) => t.id !== trashNote.id));
      setNotesWithHistory((prev) => [restoredNote, ...prev], true);
      showToast(`"${trashNote.title || 'Lapp'}" återställdes till skrivbordet! ↩️`);
    },
    [setNotesWithHistory]
  );

  // Restore all notes from Papperskorgen
  const handleRestoreAll = useCallback(() => {
    if (trashNotes.length === 0) return;
    const count = trashNotes.length;
    const restoredList: PostItNote[] = trashNotes.map((tn) => {
      maxZIndexRef.current += 1;
      const { deletedAt, ...rest } = tn;
      return {
        ...rest,
        zIndex: maxZIndexRef.current,
        updatedAt: Date.now(),
      };
    });

    setTrashNotes([]);
    setNotesWithHistory((prev) => [...restoredList, ...prev], true);
    showToast(`${count} ${count === 1 ? 'lapp' : 'lappar'} återställdes till skrivbordet! ↩️`);
  }, [trashNotes, setNotesWithHistory]);

  // Permanently delete a single note immediately
  const handlePermanentlyDeleteNote = useCallback((noteId: string) => {
    setTrashNotes((prev) => prev.filter((t) => t.id !== noteId));
    showToast('Lappen raderades permanent.');
  }, []);

  // Empty all notes from Papperskorgen
  const handleEmptyTrash = useCallback(() => {
    setTrashNotes([]);
    showToast('Papperskorgen har tömts.');
  }, []);

  // Auto-arrange all notes in a neat grid on the desk
  const handleArrangeNotes = useCallback(() => {
    const marginX = 40;
    const marginY = 40;
    const gapX = 30;
    const gapY = 30;

    // Use viewport width to determine columns (typically 3-4 on iPad Pro landscape, 2-3 in portrait)
    const availableWidth = window.innerWidth / zoom - 80;
    const cols = Math.max(1, Math.floor(availableWidth / (DEFAULT_NOTE_WIDTH + gapX)));

    const arranged = notes.map((n, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      return {
        ...n,
        x: marginX + col * (DEFAULT_NOTE_WIDTH + gapX),
        y: marginY + row * (DEFAULT_NOTE_HEIGHT + gapY),
        rotation: Number((Math.random() * 1.6 - 0.8).toFixed(1)),
        updatedAt: Date.now(),
      };
    });

    setNotesWithHistory(arranged, true);
    setPanOffset({ x: 0, y: 0 });
    showToast('Lapparna ordnades i rutnät! 📐');
  }, [notes, zoom, setNotesWithHistory]);

  // Stack all notes neatly in the center or corner with smooth animation
  const handleStackNotes = useCallback(
    (mode: 'center' | 'corner' | 'fan' = 'center') => {
      if (notes.length === 0) {
        showToast('Skapa en lapp först för att kunna stapla! 📝');
        return;
      }

      if (notes.length === 1) {
        showToast('Bara 1 lapp finns på skrivbordet.');
        return;
      }

      // Calculate anchor positions based on current viewport / pan / zoom
      const viewportCenterX = Math.max(
        30,
        Math.round(-panOffset.x / zoom + window.innerWidth / (2 * zoom) - DEFAULT_NOTE_WIDTH / 2)
      );
      const viewportCenterY = Math.max(
        40,
        Math.round(-panOffset.y / zoom + window.innerHeight / (2 * zoom) - DEFAULT_NOTE_HEIGHT / 2)
      );

      const cornerX = Math.max(40, Math.round(-panOffset.x / zoom + 40));
      const cornerY = Math.max(40, Math.round(-panOffset.y / zoom + 40));

      let baseZ = maxZIndexRef.current + 1;

      const stacked = notes.map((note, index) => {
        baseZ += 1;
        let newX = viewportCenterX;
        let newY = viewportCenterY;
        let newRotation = 0;

        if (mode === 'center') {
          // Neat deck stack in the center with subtle tactile offset and slight organic rotation
          const offsetStep = 3;
          const cycle = index % 8;
          const offsetX = (cycle - 3.5) * offsetStep;
          const offsetY = (cycle - 3.5) * offsetStep;
          const rotAngle = (index % 2 === 0 ? 1 : -1) * (1.2 + (index % 4) * 0.7);

          newX = viewportCenterX + offsetX;
          newY = viewportCenterY + offsetY;
          newRotation = Number(rotAngle.toFixed(1));
        } else if (mode === 'corner') {
          // Neat stacked pile in top-left corner
          const offsetStep = 4;
          const cycle = index % 10;
          const offsetX = cycle * offsetStep;
          const offsetY = cycle * offsetStep;
          const rotAngle = (index % 2 === 0 ? 0.8 : -0.8) * ((index % 3) * 0.6);

          newX = cornerX + offsetX;
          newY = cornerY + offsetY;
          newRotation = Number(rotAngle.toFixed(1));
        } else if (mode === 'fan') {
          // Stylish card-deck fan / cascading spread
          const total = notes.length;
          const spreadWidth = Math.min(600, Math.max(200, (total - 1) * 35));
          const stepX = total > 1 ? spreadWidth / (total - 1) : 0;
          const startX = viewportCenterX - spreadWidth / 2;
          const rotRange = Math.min(24, Math.max(10, total * 3));
          const stepRot = total > 1 ? rotRange / (total - 1) : 0;
          const startRot = -rotRange / 2;

          newX = Math.round(startX + index * stepX);
          newY = Math.round(viewportCenterY + Math.abs(index - (total - 1) / 2) * 6);
          newRotation = Number((startRot + index * stepRot).toFixed(1));
        }

        return {
          ...note,
          x: newX,
          y: newY,
          rotation: newRotation,
          zIndex: baseZ,
          updatedAt: Date.now(),
        };
      });

      maxZIndexRef.current = baseZ;
      setNotesWithHistory(stacked, true);

      const toastMessage =
        mode === 'center'
          ? 'Lapparna staplades i mitten! 🗂️'
          : mode === 'corner'
          ? 'Lapparna staplades i hörnet! 📐'
          : 'Lapparna spreds som solfjäder! 🃏';

      showToast(toastMessage);
    },
    [notes, panOffset, zoom, setNotesWithHistory]
  );

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(1.8, +(prev + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.4, +(prev - 0.15).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Keyboard shortcuts (Cmd/Ctrl + Z, Cmd/Ctrl + Y, Cmd/Ctrl + N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing inside inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, handleAddNote]);

  const pinnedCount = notes.filter((n) => n.isPinned).length;

  // Import notes from file
  const handleImportNotes = useCallback(
    (imported: PostItNote[]) => {
      setNotesWithHistory(imported, true);
      showToast(`${imported.length} lappar lästes in! 📥`);
    },
    [setNotesWithHistory]
  );

  return (
    <div
      id="postit-app-container"
      className="relative flex flex-col h-[100dvh] w-full overflow-hidden bg-slate-100 dark:bg-zinc-950 font-sans-clean"
    >
      {/* Top Application Toolbar */}
      <Toolbar
        noteCount={notes.length}
        pinnedCount={pinnedCount}
        trashCount={trashNotes.length}
        onOpenTrash={() => setIsTrashOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeColorFilter={activeColorFilter}
        onColorFilterChange={setActiveColorFilter}
        onAddNote={handleAddNote}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onArrangeNotes={handleArrangeNotes}
        onStackNotes={handleStackNotes}
        theme={theme}
        onToggleTheme={setTheme}
        onExport={() => exportNotesToJson(notes)}
        onImportNotes={handleImportNotes}
        isAutoSaved={isAutoSaved}
      />

      {/* Main Digital Desk Canvas */}
      <Canvas
        notes={notes}
        zoom={zoom}
        panOffset={panOffset}
        theme={theme}
        searchQuery={searchQuery}
        activeColorFilter={activeColorFilter}
        onPanChange={setPanOffset}
        onZoomChange={setZoom}
        onUpdateNote={handleUpdateNote}
        onRequestDeleteNote={handleRequestDelete}
        onDuplicateNote={handleDuplicateNote}
        onBringToFront={handleBringToFront}
        onDoubleTapCreate={handleDoubleTapCreate}
        onAddNote={(color) => handleAddNote(color)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        note={noteToDelete}
        isOpen={Boolean(noteToDelete)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setNoteToDelete(null)}
      />

      {/* Papperskorg / Recycle Bin Modal */}
      <TrashModal
        isOpen={isTrashOpen}
        trashNotes={trashNotes}
        onClose={() => setIsTrashOpen(false)}
        onRestoreNote={handleRestoreNote}
        onRestoreAll={handleRestoreAll}
        onPermanentlyDeleteNote={handlePermanentlyDeleteNote}
        onEmptyTrash={handleEmptyTrash}
      />

      {/* Undo / Status Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
