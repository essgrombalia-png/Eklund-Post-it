import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Maximize2,
  RotateCw,
  Sliders,
  Trash2,
  Camera,
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  GripHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { NoteImageConfig, ImageFitMode, ImageFilterMode } from '../types';

interface NoteImagePreviewProps {
  noteId: string;
  noteTitle?: string;
  imageUrl: string;
  imageConfig?: NoteImageConfig;
  onUpdateConfig: (config: NoteImageConfig) => void;
  onRemoveImage: () => void;
  onOpenNewCamera: () => void;
  noteHeight: number;
  onEnsureNoteHeight: (requiredHeight: number) => void;
}

const FILTER_CLASSES: Record<ImageFilterMode, string> = {
  none: '',
  grayscale: 'grayscale contrast-110',
  sepia: 'sepia contrast-105 brightness-95',
  vivid: 'saturate-150 contrast-110',
};

const FILTER_NAMES: Record<ImageFilterMode, string> = {
  none: 'Normal',
  grayscale: 'Svartvit',
  sepia: 'Sepia',
  vivid: 'Levande',
};

export const NoteImagePreview: React.FC<NoteImagePreviewProps> = ({
  noteId,
  noteTitle,
  imageUrl,
  imageConfig,
  onUpdateConfig,
  onRemoveImage,
  onOpenNewCamera,
  noteHeight,
  onEnsureNoteHeight,
}) => {
  const currentHeight = imageConfig?.height ?? 140;
  const currentFit = imageConfig?.fit ?? 'cover';
  const currentRotation = imageConfig?.rotation ?? 0;
  const currentFilter = imageConfig?.filter ?? 'none';
  const isRounded = imageConfig?.rounded ?? true;

  const [isHoveredOrActive, setIsHoveredOrActive] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeStartYRef = useRef<number>(0);
  const resizeStartHeightRef = useRef<number>(140);

  const activeHeight = dragHeight !== null ? dragHeight : currentHeight;

  // Handle direct drag resize (pointer events for mouse + touch / iPad Apple Pencil)
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setIsResizing(true);
    resizeStartYRef.current = e.clientY;
    resizeStartHeightRef.current = currentHeight;
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    e.stopPropagation();
    e.preventDefault();

    const deltaY = e.clientY - resizeStartYRef.current;
    const newHeight = Math.min(420, Math.max(65, Math.round(resizeStartHeightRef.current + deltaY)));
    setDragHeight(newHeight);

    // Auto expand parent note if image would push text out
    if (newHeight + 170 > noteHeight) {
      onEnsureNoteHeight(newHeight + 175);
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (dragHeight !== null) {
      onUpdateConfig({
        ...imageConfig,
        height: dragHeight,
      });
    }
    setIsResizing(false);
    setDragHeight(null);
  };

  // Rotate image by 90 degrees
  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRot = ((currentRotation + 90) % 360);
    onUpdateConfig({
      ...imageConfig,
      rotation: nextRot,
    });
  };

  // Toggle fit mode: cover -> contain -> auto -> cover
  const handleToggleFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFit: ImageFitMode =
      currentFit === 'cover' ? 'contain' : currentFit === 'contain' ? 'auto' : 'cover';
    onUpdateConfig({
      ...imageConfig,
      fit: nextFit,
    });
  };

  // Preset size shortcuts
  const handleSetPresetHeight = (h: number) => {
    onUpdateConfig({
      ...imageConfig,
      height: h,
    });
    if (h + 170 > noteHeight) {
      onEnsureNoteHeight(h + 175);
    }
  };

  // Select filter
  const handleSelectFilter = (filter: ImageFilterMode) => {
    onUpdateConfig({
      ...imageConfig,
      filter,
    });
    setShowFilterMenu(false);
  };

  // Toggle border radius
  const handleToggleRounded = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateConfig({
      ...imageConfig,
      rounded: !isRounded,
    });
  };

  // Build styling for the image
  const imageFitClass =
    currentFit === 'cover'
      ? 'object-cover w-full h-full'
      : currentFit === 'contain'
      ? 'object-contain w-full h-full'
      : 'object-scale-down w-full h-auto max-h-full';

  const filterClass = FILTER_CLASSES[currentFilter] || '';
  const roundedClass = isRounded ? 'rounded-xl' : 'rounded-none';

  return (
    <div
      ref={containerRef}
      id={`postit-image-box-${noteId}`}
      data-no-drag="true"
      onMouseEnter={() => setIsHoveredOrActive(true)}
      onMouseLeave={() => {
        if (!showFilterMenu && !isResizing) setIsHoveredOrActive(false);
      }}
      className="relative group mb-2.5 w-full shrink-0 select-none transition-all flex flex-col"
    >
      {/* Image Display Surface */}
      <div
        id={`postit-image-viewport-${noteId}`}
        style={{ height: `${activeHeight}px` }}
        className={`relative w-full overflow-hidden border border-black/15 bg-black/5 dark:bg-black/40 shadow-xs flex items-center justify-center transition-[height] duration-75 ${roundedClass}`}
      >
        <img
          src={imageUrl}
          alt={noteTitle || 'Post-it foto'}
          style={{
            transform: currentRotation !== 0 ? `rotate(${currentRotation}deg)` : undefined,
          }}
          className={`${imageFitClass} ${filterClass} ${roundedClass} transition-transform duration-200 pointer-events-none`}
          loading="lazy"
        />

        {/* Live Height Tooltip when resizing */}
        {isResizing && (
          <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/85 text-amber-300 font-mono text-xs font-bold shadow-md pointer-events-none">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{activeHeight} px</span>
          </div>
        )}

        {/* Floating Quick Action Overlay on hover / focus */}
        <div
          id={`postit-image-toolbar-${noteId}`}
          className={`absolute top-1.5 right-1.5 z-20 flex items-center gap-1 p-1 rounded-xl bg-black/80 backdrop-blur-md text-white shadow-xl transition-opacity duration-150 ${
            isHoveredOrActive || showFilterMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Zoom / Fullscreen Lightbox */}
          <button
            type="button"
            id={`btn-lightbox-photo-${noteId}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowLightbox(true);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/20 active:scale-95 text-zinc-200 hover:text-white transition-all"
            title="Förstora bild (Fullskärm)"
            aria-label="Förstora bild"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          {/* Rotate 90° Clockwise */}
          <button
            type="button"
            id={`btn-rotate-photo-${noteId}`}
            onClick={handleRotate}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/20 active:scale-95 text-zinc-200 hover:text-white transition-all"
            title={`Rotera 90° (${currentRotation}°)`}
            aria-label="Rotera bild"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          {/* Fit Mode Toggle */}
          <button
            type="button"
            id={`btn-fit-photo-${noteId}`}
            onClick={handleToggleFit}
            className={`flex h-7 px-1.5 items-center justify-center rounded-lg hover:bg-white/20 active:scale-95 text-xs font-bold transition-all ${
              currentFit !== 'cover' ? 'bg-amber-400 text-black' : 'text-zinc-200'
            }`}
            title={`Passform: ${currentFit === 'cover' ? 'Fyll' : currentFit === 'contain' ? 'Hela bilden' : 'Naturlig'}`}
            aria-label="Passform för bild"
          >
            {currentFit === 'cover' ? 'Fyll' : currentFit === 'contain' ? 'Hel' : 'Auto'}
          </button>

          {/* Filter Popover Toggle */}
          <div className="relative">
            <button
              type="button"
              id={`btn-filter-photo-${noteId}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowFilterMenu(!showFilterMenu);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/20 active:scale-95 transition-all ${
                currentFilter !== 'none' ? 'bg-amber-400 text-black' : 'text-zinc-200'
              }`}
              title="Filter & effekter"
              aria-label="Filter"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>

            {/* Filter Menu Dropdown */}
            {showFilterMenu && (
              <div
                id={`filter-menu-${noteId}`}
                className="absolute right-0 top-9 z-40 w-36 rounded-xl bg-zinc-900 border border-zinc-700 p-1.5 shadow-2xl text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
              >
                {(['none', 'grayscale', 'sepia', 'vivid'] as ImageFilterMode[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectFilter(f);
                    }}
                    className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors ${
                      currentFilter === f
                        ? 'bg-amber-400 text-zinc-950 font-bold'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span>{FILTER_NAMES[f]}</span>
                    {currentFilter === f && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-[1px] h-4 bg-white/20 mx-0.5" />

          {/* Replace Photo via Camera */}
          <button
            type="button"
            id={`btn-replace-photo-${noteId}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenNewCamera();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-amber-400 hover:text-zinc-950 active:scale-95 text-amber-300 transition-all"
            title="Ta nytt foto med kameran"
            aria-label="Ta nytt foto med kameran"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>

          {/* Delete Photo */}
          <button
            type="button"
            id={`btn-delete-photo-${noteId}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveImage();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-500/80 hover:text-white active:scale-95 text-red-300 transition-all"
            title="Ta bort bild"
            aria-label="Ta bort bild"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Quick Size Presets Bar on Left Top (visible on hover) */}
        <div
          id={`postit-size-presets-${noteId}`}
          className={`absolute bottom-2 left-2 z-20 flex items-center gap-1 p-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-white shadow-md transition-opacity duration-150 ${
            isHoveredOrActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            id={`btn-preset-s-${noteId}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSetPresetHeight(80);
            }}
            className={`h-5 px-1.5 rounded text-[10px] font-bold transition-all ${
              currentHeight <= 90 ? 'bg-amber-400 text-zinc-950' : 'hover:bg-white/20 text-zinc-300'
            }`}
            title="Liten (80px)"
          >
            S
          </button>
          <button
            type="button"
            id={`btn-preset-m-${noteId}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSetPresetHeight(140);
            }}
            className={`h-5 px-1.5 rounded text-[10px] font-bold transition-all ${
              currentHeight > 90 && currentHeight <= 170
                ? 'bg-amber-400 text-zinc-950'
                : 'hover:bg-white/20 text-zinc-300'
            }`}
            title="Mellan (140px)"
          >
            M
          </button>
          <button
            type="button"
            id={`btn-preset-l-${noteId}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSetPresetHeight(220);
            }}
            className={`h-5 px-1.5 rounded text-[10px] font-bold transition-all ${
              currentHeight > 170 && currentHeight <= 260
                ? 'bg-amber-400 text-zinc-950'
                : 'hover:bg-white/20 text-zinc-300'
            }`}
            title="Stor (220px)"
          >
            L
          </button>
          <button
            type="button"
            id={`btn-preset-xl-${noteId}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSetPresetHeight(310);
            }}
            className={`h-5 px-1.5 rounded text-[10px] font-bold transition-all ${
              currentHeight > 260 ? 'bg-amber-400 text-zinc-950' : 'hover:bg-white/20 text-zinc-300'
            }`}
            title="Extra Stor (310px)"
          >
            XL
          </button>
        </div>
      </div>

      {/* Tactile Drag Resize Handle Bar */}
      <div
        id={`postit-image-resize-handle-${noteId}`}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="group/handle h-4 w-full -mt-1 cursor-ns-resize flex items-center justify-center touch-none z-20"
        title="Dra upp/ner för att steglöst ändra bildens storlek"
      >
        <div className="h-1.5 w-16 rounded-full bg-black/25 group-hover/handle:bg-amber-500 group-active/handle:bg-amber-600 transition-all flex items-center justify-center">
          <div className="h-0.5 w-8 rounded-full bg-white/70" />
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {showLightbox && (
        <div
          id="image-lightbox-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Toolbar */}
            <div className="absolute top-[-44px] right-0 flex items-center gap-2">
              <button
                type="button"
                id="btn-lightbox-rotate"
                onClick={handleRotate}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors"
                title="Rotera 90°"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                id="btn-lightbox-close"
                onClick={() => setShowLightbox(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors"
                title="Stäng fullskärm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* High-res Image in Lightbox */}
            <img
              src={imageUrl}
              alt={noteTitle || 'Foto'}
              style={{
                transform: currentRotation !== 0 ? `rotate(${currentRotation}deg)` : undefined,
              }}
              className={`max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl border border-zinc-800 ${filterClass}`}
            />
            {noteTitle && (
              <p className="mt-3 text-sm text-zinc-300 font-medium tracking-wide">
                {noteTitle}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
