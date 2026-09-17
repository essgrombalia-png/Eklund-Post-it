import React, { useRef, useState, useEffect } from 'react';
import { PostItNote, DeskTheme, PostItColor, COLOR_CONFIGS } from '../types';
import { PostItCard } from './PostItCard';
import { Plus, StickyNote, RotateCcw } from 'lucide-react';

interface CanvasProps {
  notes: PostItNote[];
  zoom: number;
  panOffset: { x: number; y: number };
  theme: DeskTheme;
  searchQuery: string;
  activeColorFilter: PostItColor | 'all' | 'pinned';
  isSmoothTransition?: boolean;
  focusedNoteId?: string | null;
  onPanChange: (offset: { x: number; y: number }) => void;
  onZoomChange: (newZoom: number) => void;
  onUpdateNote: (note: PostItNote, recordHistory?: boolean) => void;
  onRequestDeleteNote: (note: PostItNote) => void;
  onDuplicateNote: (note: PostItNote) => void;
  onBringToFront: (id: string) => void;
  onDoubleTapCreate: (x: number, y: number) => void;
  onAddNote: (color?: PostItColor) => void;
  onFocusNote?: (note: PostItNote) => void;
  onClearFocus?: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  notes,
  zoom,
  panOffset,
  theme,
  searchQuery,
  activeColorFilter,
  isSmoothTransition = false,
  focusedNoteId = null,
  onPanChange,
  onZoomChange,
  onUpdateNote,
  onRequestDeleteNote,
  onDuplicateNote,
  onBringToFront,
  onDoubleTapCreate,
  onAddNote,
  onFocusNote,
  onClearFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number } | null>(null);

  // Multi-touch tracking for iPad pinch-to-zoom & two-finger pan
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; initialZoom: number; center: { x: number; y: number }; initialPan: { x: number; y: number } } | null>(null);

  // Last tap tracking for double-tap detection on iPad touch
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (activeColorFilter === 'pinned' && !n.isPinned) return false;
    if (activeColorFilter !== 'all' && activeColorFilter !== 'pinned' && n.color !== activeColorFilter) {
      return false;
    }
    return true;
  });

  // Search matching logic
  const isSearchActive = searchQuery.trim().length > 0;
  const searchLower = searchQuery.trim().toLowerCase();

  const isNoteMatchingSearch = (note: PostItNote) => {
    if (!isSearchActive) return true;
    const titleMatch = note.title.toLowerCase().includes(searchLower);
    const contentMatch = note.content.toLowerCase().includes(searchLower);
    return titleMatch || contentMatch;
  };

  // Background pointer down for desk panning, pinch-to-zoom & double tap
  const handleBackgroundPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle if clicking/touching the canvas background directly
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains('desk-surface-plane')) {
      return;
    }

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // If two fingers are down, initialize pinch gesture
    if (activePointersRef.current.size === 2) {
      const points: { x: number; y: number }[] = Array.from(activePointersRef.current.values());
      const p1 = points[0];
      const p2 = points[1];
      if (!p1 || !p2) return;

      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const center = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
      pinchStartRef.current = {
        distance: Math.max(10, dist),
        initialZoom: zoom,
        center,
        initialPan: { ...panOffset },
      };
      setIsPanning(true);
      return;
    }

    // If focused on a note and clicking empty desk space, exit focus mode
    if (focusedNoteId) {
      onClearFocus?.();
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = (e.clientX - rect.left - panOffset.x) / zoom;
    const clickY = (e.clientY - rect.top - panOffset.y) / zoom;

    // Detect double tap on iPad Pro touch or double click on mouse
    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.hypot(e.clientX - lastTapRef.current.x, e.clientY - lastTapRef.current.y);

    if (timeDiff < 320 && distDiff < 30) {
      // Double tap detected! Create a note right at pointer location
      onDoubleTapCreate(Math.round(clickX - 135), Math.round(clickY - 50));
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };

    // Start single pointer canvas panning
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y,
    };
    setIsPanning(true);
  };

  const handleBackgroundPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Handle two-finger pinch to zoom & two-finger pan
    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      e.preventDefault();
      const points: { x: number; y: number }[] = Array.from(activePointersRef.current.values());
      const p1 = points[0];
      const p2 = points[1];
      if (!p1 || !p2) return;

      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const currentCenter = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };

      const scaleMultiplier = currentDist / pinchStartRef.current.distance;
      const targetZoom = Math.min(2.0, Math.max(0.4, Number((pinchStartRef.current.initialZoom * scaleMultiplier).toFixed(2))));
      onZoomChange(targetZoom);

      // Pan shift from finger movement
      const panDx = currentCenter.x - pinchStartRef.current.center.x;
      const panDy = currentCenter.y - pinchStartRef.current.center.y;
      onPanChange({
        x: Math.round(pinchStartRef.current.initialPan.x + panDx),
        y: Math.round(pinchStartRef.current.initialPan.y + panDy),
      });
      return;
    }

    // Single-finger / mouse panning
    if (!isPanning || !panStartRef.current) return;

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    onPanChange({
      x: Math.round(panStartRef.current.initialPanX + dx),
      y: Math.round(panStartRef.current.initialPanY + dy),
    });
  };

  const handleBackgroundPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }

    if (activePointersRef.current.size === 0) {
      if (isPanning) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        setIsPanning(false);
        panStartRef.current = null;
      }
    }
  };

  // Mouse wheel & trackpad zoom/pan support
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.003;
      const newZoom = Math.min(2.0, Math.max(0.4, Number((zoom + delta).toFixed(2))));
      onZoomChange(newZoom);
    } else {
      // Regular trackpad/wheel pan
      onPanChange({
        x: Math.round(panOffset.x - e.deltaX),
        y: Math.round(panOffset.y - e.deltaY),
      });
    }
  };

  const themeClass =
    theme === 'light'
      ? 'desk-grid-light'
      : theme === 'dark'
      ? 'desk-grid-dark'
      : 'desk-cork-light';

  return (
    <main
      ref={containerRef}
      id="digital-desk-canvas"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
      onPointerCancel={handleBackgroundPointerUp}
      onWheel={handleWheel}
      className={`relative w-full flex-1 h-[calc(100dvh-100px)] overflow-hidden ${themeClass} ${
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      } touch-drag-area transition-colors select-none`}
    >
      {/* Transformed Workspace Plane */}
      <div
        id="desk-surface-plane"
        className="desk-surface-plane absolute inset-0 origin-top-left"
        style={{
          transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoom})`,
          width: '5000px',
          height: '5000px',
          transition: isSmoothTransition ? 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        }}
      >
        {/* Render Notes */}
        {filteredNotes.map((note) => (
          <PostItCard
            key={note.id}
            note={note}
            zoom={zoom}
            isSearchActive={isSearchActive}
            isSearchMatch={isNoteMatchingSearch(note)}
            isFocused={focusedNoteId === note.id}
            hasFocusedNote={Boolean(focusedNoteId)}
            onUpdate={onUpdateNote}
            onRequestDelete={onRequestDeleteNote}
            onDuplicate={onDuplicateNote}
            onBringToFront={onBringToFront}
            onFocusNote={onFocusNote}
          />
        ))}
      </div>

      {/* Floating Focus Mode Banner */}
      {focusedNoteId && (
        <div
          id="focus-mode-indicator-pill"
          className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 dark:bg-zinc-800/95 text-white shadow-2xl backdrop-blur-md border border-white/10 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto"
          style={{
            top: 'max(0.85rem, calc(0.6rem + env(safe-area-inset-top, 0px)))',
          }}
        >
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold text-slate-100">Fokusläge</span>
          <button
            type="button"
            id="btn-leave-focus-mode"
            onClick={onClearFocus}
            className="ml-1 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-[11px] text-white font-medium transition-all cursor-pointer flex items-center gap-1"
            title="Lämna fokusläge (Esc)"
          >
            <span>Lämna</span>
            <kbd className="font-mono text-[10px] opacity-75">Esc</kbd>
          </button>
        </div>
      )}

      {/* Empty State when no notes match filters */}
      {filteredNotes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-zinc-800 text-amber-600 dark:text-amber-400 mb-4 shadow-sm border border-amber-200/60 dark:border-zinc-700">
            <StickyNote className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200">
            {isSearchActive
              ? `Inga lappar matchar "${searchQuery}"`
              : activeColorFilter !== 'all'
              ? 'Inga lappar med detta filter'
              : 'Ditt skrivbord är tomt'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400 max-w-sm">
            {isSearchActive
              ? 'Försök att söka på något annat eller rensa sökningen.'
              : 'Tryck på "+ Ny lapp" i verktygsfältet eller dubbeltryck var som helst på skrivbordet för att skapa en Post-it!'}
          </p>

          <div className="mt-5 pointer-events-auto flex flex-col items-center gap-3">
            <button
              type="button"
              id="btn-create-first-note"
              onClick={() => onAddNote()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-amber-950 font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Skapa din första lapp
            </button>

            {/* Quick color choices */}
            {!isSearchActive && activeColorFilter === 'all' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mr-0.5">
                  eller välj färg:
                </span>
                {(Object.keys(COLOR_CONFIGS) as PostItColor[]).map((colorKey) => {
                  const cfg = COLOR_CONFIGS[colorKey];
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      id={`btn-empty-create-${colorKey}`}
                      onClick={() => onAddNote(colorKey)}
                      className={`h-6 w-6 rounded-full ${cfg.swatchClass} border-2 border-white dark:border-zinc-800 shadow-xs hover:scale-125 active:scale-95 transition-transform cursor-pointer`}
                      title={`Skapa ${cfg.name} lapp`}
                      aria-label={`Skapa ${cfg.name} lapp`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discreet bottom status hint for iPad users */}
      <div
        className="hidden sm:flex absolute z-20 items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-500 pointer-events-none bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-zinc-800/50"
        style={{
          bottom: 'max(0.75rem, calc(0.5rem + env(safe-area-inset-bottom, 0px)))',
          left: 'max(1rem, calc(0.75rem + env(safe-area-inset-left, 0px)))',
        }}
      >
        <span>💡 Dubbelklicka en lapp för fokuszoom</span>
        <span>·</span>
        <span>Dubbeltryck på skrivbordet för ny lapp</span>
      </div>
    </main>
  );
};
