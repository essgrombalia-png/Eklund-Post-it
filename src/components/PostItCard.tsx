import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PostItNote,
  COLOR_CONFIGS,
  PostItColor,
  MIN_NOTE_WIDTH,
  MIN_NOTE_HEIGHT,
  MAX_NOTE_WIDTH,
  MAX_NOTE_HEIGHT,
  FontFamilyType,
  FontSizeType,
  NotePaperStyle,
} from '../types';
import {
  Pin,
  Trash2,
  Copy,
  Type,
  GripHorizontal,
  Clock,
  Check,
  Palette,
  Pencil,
  Download,
  Camera,
  History,
  Grid,
  Maximize2,
} from 'lucide-react';
import { NoteSketchCanvas } from './NoteSketchCanvas';
import { CameraModal } from './CameraModal';
import { NoteImagePreview } from './NoteImagePreview';
import { NoteHistoryModal } from './NoteHistoryModal';
import { PostItSizeModal } from './PostItSizeModal';
import { addVersionSnapshot } from '../utils/versionHistory';

interface PostItCardProps {
  note: PostItNote;
  zoom: number;
  isSearchActive: boolean;
  isSearchMatch: boolean;
  isFocused?: boolean;
  hasFocusedNote?: boolean;
  onUpdate: (updatedNote: PostItNote, recordHistory?: boolean) => void;
  onRequestDelete: (note: PostItNote) => void;
  onDuplicate: (note: PostItNote) => void;
  onBringToFront: (id: string) => void;
  onFocusNote?: (note: PostItNote) => void;
}

export const PostItCard: React.FC<PostItCardProps> = ({
  note,
  zoom,
  isSearchActive,
  isSearchMatch,
  isFocused = false,
  hasFocusedNote = false,
  onUpdate,
  onRequestDelete,
  onDuplicate,
  onBringToFront,
  onFocusNote,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMetaDetails, setShowMetaDetails] = useState(false);
  const [isSketchMode, setIsSketchMode] = useState<boolean>(Boolean(note.isSketchMode));
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);

  // Sync isSketchMode if note prop changes
  useEffect(() => {
    if (note.isSketchMode !== undefined) {
      setIsSketchMode(note.isSketchMode);
    }
  }, [note.isSketchMode]);

  // Handle camera photo captured
  const handleCapturePhoto = (imageDataUrl: string) => {
    // If note is currently compact, expand it so the photo and text both fit nicely
    const newHeight = Math.max(note.height, 320);
    const updated = addVersionSnapshot(
      {
        ...note,
        imageUrl: imageDataUrl,
        imageConfig: {
          height: 140,
          fit: 'cover',
          rotation: 0,
          filter: 'none',
          rounded: true,
        },
        height: newHeight,
        updatedAt: Date.now(),
      },
      'photo',
      'Foto infogat via kameran'
    );
    onUpdate(updated, true);
  };

  // Drag tracking refs
  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialNoteX: number;
    initialNoteY: number;
  } | null>(null);

  // Track latest coordinates and dimensions across rapid drag/resize events
  const currentDragPosRef = useRef({ x: note.x, y: note.y });
  const currentResizeDimsRef = useRef({
    x: note.x,
    y: note.y,
    width: note.width,
    height: note.height,
  });

  useEffect(() => {
    if (!isDragging) {
      currentDragPosRef.current = { x: note.x, y: note.y };
    }
  }, [note.x, note.y, isDragging]);

  useEffect(() => {
    if (!isResizing) {
      currentResizeDimsRef.current = {
        x: note.x,
        y: note.y,
        width: note.width,
        height: note.height,
      };
    }
  }, [note.x, note.y, note.width, note.height, isResizing]);

  // Resize tracking refs (8-way directional resize)
  const resizeStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    handle: 'se' | 'e' | 's' | 'w' | 'n' | 'sw' | 'ne' | 'nw';
  } | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  const colorConfig = COLOR_CONFIGS[note.color] || COLOR_CONFIGS.yellow;

  // Export / download note with text and freehand drawing as high-res PNG sticker
  const handleDownloadNoteAsPng = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const canvas = document.createElement('canvas');
      const dpr = 2; // retina quality
      canvas.width = note.width * dpr;
      canvas.height = note.height * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);

      const bgMap: Record<PostItColor, { bg: string; header: string; text: string }> = {
        yellow: { bg: '#fef9c3', header: '#fef08a', text: '#451a03' },
        pink: { bg: '#fce7f3', header: '#fbcfe8', text: '#500724' },
        blue: { bg: '#e0f2fe', header: '#bae6fd', text: '#082f49' },
        green: { bg: '#dcfce7', header: '#bbf7d0', text: '#052e16' },
        orange: { bg: '#ffedd5', header: '#fed7aa', text: '#431407' },
        purple: { bg: '#f3e8ff', header: '#e9d5ff', text: '#3b0764' },
      };

      const scheme = bgMap[note.color] || bgMap.yellow;

      // Card background
      ctx.fillStyle = scheme.bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, note.width, note.height, 14);
      ctx.fill();

      // Top adhesive strip
      ctx.fillStyle = scheme.header;
      ctx.beginPath();
      ctx.roundRect(0, 0, note.width, 36, [14, 14, 0, 0]);
      ctx.fill();

      // Note Title
      ctx.fillStyle = scheme.text;
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(note.title || 'Post-it', 14, 23, note.width - 28);

      let yPos = 56;

      // Draw attached camera photo if present
      if (note.imageUrl) {
        try {
          const photoImg = new Image();
          photoImg.src = note.imageUrl;
          await new Promise((resolve) => {
            photoImg.onload = resolve;
            photoImg.onerror = resolve;
          });
          const configuredH = note.imageConfig?.height || 140;
          const photoH = Math.min(configuredH, Math.round(note.height * 0.6));
          const photoW = note.width - 28;
          const photoX = 14;
          const photoY = yPos;

          ctx.save();
          if (note.imageConfig?.filter === 'grayscale') {
            ctx.filter = 'grayscale(100%) contrast(110%)';
          } else if (note.imageConfig?.filter === 'sepia') {
            ctx.filter = 'sepia(80%) contrast(105%)';
          } else if (note.imageConfig?.filter === 'vivid') {
            ctx.filter = 'saturate(150%) contrast(110%)';
          }

          const rotDeg = note.imageConfig?.rotation || 0;
          if (rotDeg !== 0) {
            ctx.translate(photoX + photoW / 2, photoY + photoH / 2);
            ctx.rotate((rotDeg * Math.PI) / 180);
            ctx.drawImage(photoImg, -photoW / 2, -photoH / 2, photoW, photoH);
          } else {
            ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
          }
          ctx.restore();

          yPos += photoH + 16;
        } catch {
          // Continue if photo failed to render in canvas
        }
      }

      // Draw paper pattern if configured
      if (note.paperStyle === 'lined') {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        for (let y = 50; y < note.height - 20; y += 28) {
          ctx.beginPath();
          ctx.moveTo(10, y);
          ctx.lineTo(note.width - 10, y);
          ctx.stroke();
        }
      } else if (note.paperStyle === 'grid') {
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        for (let x = 16; x < note.width - 10; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 40);
          ctx.lineTo(x, note.height - 10);
          ctx.stroke();
        }
        for (let y = 48; y < note.height - 10; y += 20) {
          ctx.beginPath();
          ctx.moveTo(10, y);
          ctx.lineTo(note.width - 10, y);
          ctx.stroke();
        }
      } else if (note.paperStyle === 'dots') {
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        for (let x = 18; x < note.width - 12; x += 18) {
          for (let y = 50; y < note.height - 12; y += 18) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Note text content
      const fontSizePx = note.fontSize === 'sm' ? 14 : note.fontSize === 'lg' ? 20 : 16;
      let fontFamily = '"Plus Jakarta Sans", sans-serif';
      if (note.fontFamily === 'handwriting') {
        fontFamily = 'Caveat, cursive';
      } else if (note.fontFamily === 'kalam') {
        fontFamily = 'Kalam, cursive';
      } else if (note.fontFamily === 'casual') {
        fontFamily = '"Patrick Hand", cursive';
      }
      ctx.font = `${fontSizePx}px ${fontFamily}`;
      ctx.fillStyle = scheme.text;

      const lines = note.content.split('\n');
      const lineHeight = fontSizePx * 1.45;
      for (const line of lines) {
        if (yPos > note.height - 24) break;
        ctx.fillText(line, 14, yPos, note.width - 28);
        yPos += lineHeight;
      }

      // Overlay sketch if available
      if (note.drawingData) {
        const img = new Image();
        img.src = note.drawingData;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        ctx.drawImage(img, 0, 36, note.width, Math.max(10, note.height - 36));
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const cleanTitle = (note.title || 'postit-lapp')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/gi, '_')
        .slice(0, 25);
      link.download = `${cleanTitle}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Kunde inte exportera lappen som bild', err);
    }
  };

  // Format date and time in Swedish locale
  const formatTimestamp = (epoch: number) => {
    const date = new Date(epoch);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `Idag ${timeStr}`;
    }
    const dateStr = date.toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
    });
    return `${dateStr} ${timeStr}`;
  };

  // Last tap detection for double-tap on touch/stylus
  const noteLastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  // Double-click handler to center and focus note
  const handleCardDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('[data-no-drag="true"]') ||
      target.closest('canvas')
    ) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    onFocusNote?.(note);
  };

  // Drag start handler (Pointer events)
  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button or touch/pen
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Bring note to front
    onBringToFront(note.id);

    const target = e.target as HTMLElement;
    // Don't drag if in sketch mode on the body or tapping interactive elements
    if (
      (isSketchMode && !target.closest(`#postit-header-${note.id}`)) ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'CANVAS' ||
      target.closest('button') ||
      target.closest('[data-no-drag="true"]') ||
      target.closest(`#sketch-container-${note.id}`)
    ) {
      return;
    }

    // Apple Pencil direct inking refinement for iPad Pro:
    if (e.pointerType === 'pen') {
      const isHeader = Boolean(target.closest(`#postit-header-${note.id}`));
      if (!isHeader) {
        // Direct Apple Pencil touch on note body activates sketch mode instantly
        e.preventDefault();
        e.stopPropagation();
        setIsSketchMode(true);
        onUpdate({ ...note, isSketchMode: true }, false);
        return;
      }
    }

    // Palm rejection on note drag (filter fleshy palm contact)
    if (e.pointerType === 'touch' && ((e.width && e.width > 26) || (e.height && e.height > 26))) {
      return;
    }

    // Detect double tap on iPad Pro touch or double click
    const now = Date.now();
    const timeDiff = now - noteLastTapRef.current.time;
    const distDiff = Math.hypot(e.clientX - noteLastTapRef.current.x, e.clientY - noteLastTapRef.current.y);

    if (timeDiff < 320 && distDiff < 25) {
      noteLastTapRef.current = { time: 0, x: 0, y: 0 };
      e.stopPropagation();
      onFocusNote?.(note);
      return;
    }
    noteLastTapRef.current = { time: now, x: e.clientX, y: e.clientY };

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialNoteX: note.x,
      initialNoteY: note.y,
    };

    setIsDragging(true);
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    if (dragStartRef.current.pointerId !== e.pointerId) return;

    e.preventDefault();

    const dx = (e.clientX - dragStartRef.current.startX) / zoom;
    const dy = (e.clientY - dragStartRef.current.startY) / zoom;

    const newX = Math.round(dragStartRef.current.initialNoteX + dx);
    const newY = Math.round(dragStartRef.current.initialNoteY + dy);
    currentDragPosRef.current = { x: newX, y: newY };

    // Update note position smoothly during drag without creating full history undo on every mouse pixel
    onUpdate(
      {
        ...note,
        x: newX,
        y: newY,
      },
      false
    );
  };

  const handleDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    if (dragStartRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsDragging(false);
    dragStartRef.current = null;

    // Commit final position to history using latest recorded drag position
    onUpdate(
      {
        ...note,
        x: currentDragPosRef.current.x,
        y: currentDragPosRef.current.y,
      },
      true
    );
  };

  // Edge & Corner Resize pointer handlers (Full 8-way directional sizing)
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handle: 'se' | 'e' | 's' | 'w' | 'n' | 'sw' | 'ne' | 'nw' = 'se'
  ) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    onBringToFront(note.id);
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    resizeStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: note.x,
      initialY: note.y,
      initialWidth: note.width,
      initialHeight: note.height,
      handle,
    };

    setIsResizing(true);
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing || !resizeStartRef.current) return;
    if (resizeStartRef.current.pointerId !== e.pointerId) return;

    e.preventDefault();

    const dx = (e.clientX - resizeStartRef.current.startX) / zoom;
    const dy = (e.clientY - resizeStartRef.current.startY) / zoom;
    const { initialX, initialY, initialWidth, initialHeight, handle } = resizeStartRef.current;

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newX = initialX;
    let newY = initialY;

    if (handle.includes('e')) {
      newWidth = Math.min(MAX_NOTE_WIDTH, Math.max(MIN_NOTE_WIDTH, Math.round(initialWidth + dx)));
    } else if (handle.includes('w')) {
      const targetW = Math.round(initialWidth - dx);
      const clampedW = Math.min(MAX_NOTE_WIDTH, Math.max(MIN_NOTE_WIDTH, targetW));
      newWidth = clampedW;
      newX = initialX + (initialWidth - clampedW);
    }

    if (handle.includes('s')) {
      newHeight = Math.min(MAX_NOTE_HEIGHT, Math.max(MIN_NOTE_HEIGHT, Math.round(initialHeight + dy)));
    } else if (handle.includes('n')) {
      const targetH = Math.round(initialHeight - dy);
      const clampedH = Math.min(MAX_NOTE_HEIGHT, Math.max(MIN_NOTE_HEIGHT, targetH));
      newHeight = clampedH;
      newY = initialY + (initialHeight - clampedH);
    }

    currentResizeDimsRef.current = { x: newX, y: newY, width: newWidth, height: newHeight };

    onUpdate(
      {
        ...note,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      },
      false
    );
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing || !resizeStartRef.current) return;
    if (resizeStartRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsResizing(false);
    resizeStartRef.current = null;
    const finalState = currentResizeDimsRef.current;
    const updated = addVersionSnapshot(
      {
        ...note,
        x: finalState.x,
        y: finalState.y,
        width: finalState.width,
        height: finalState.height,
        updatedAt: Date.now(),
      },
      'content_edit',
      `Storlek anpassad till ${finalState.width}×${finalState.height}px`
    );
    onUpdate(updated, true);
  };

  // Direct custom size application (from Format & Storlek Modal)
  const handleApplyCustomSize = (newWidth: number, newHeight: number) => {
    const updated = addVersionSnapshot(
      {
        ...note,
        width: newWidth,
        height: newHeight,
        updatedAt: Date.now(),
      },
      'content_edit',
      `Storlek ändrad till ${newWidth}×${newHeight}px`
    );
    onUpdate(updated, true);
  };

  // Handle color change
  const handleColorChange = (newColor: PostItColor) => {
    const updated = addVersionSnapshot(
      {
        ...note,
        color: newColor,
        updatedAt: Date.now(),
      },
      'color',
      `Färg ändrad till ${COLOR_CONFIGS[newColor]?.name || newColor}`
    );
    onUpdate(updated, true);
    setShowColorPicker(false);
  };

  // Toggle pin
  const handleTogglePin = () => {
    onUpdate({
      ...note,
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });
  };

  // Toggle font family (Standard Sans -> Caveat Handwriting -> Kalam -> Patrick Hand)
  const handleToggleFont = () => {
    const cycleOrder: FontFamilyType[] = ['sans', 'handwriting', 'kalam', 'casual'];
    const currentIdx = cycleOrder.indexOf(note.fontFamily || 'sans');
    const nextFont = cycleOrder[(currentIdx + 1) % cycleOrder.length] || 'sans';
    const fontNames: Record<FontFamilyType, string> = {
      sans: 'Standard (Plus Jakarta Sans)',
      handwriting: 'Handskrift (Caveat)',
      kalam: 'Skiss handstil (Kalam)',
      casual: 'Ren handstil (Patrick Hand)',
    };
    const updated = addVersionSnapshot(
      {
        ...note,
        fontFamily: nextFont,
        updatedAt: Date.now(),
      },
      'font',
      `Typsnitt ändrat till ${fontNames[nextFont]}`
    );
    onUpdate(updated, true);
  };

  // Toggle paper pattern (Plain -> Ruled lines -> Grid -> Dot grid)
  const handleCyclePaperStyle = () => {
    const cycleOrder: NotePaperStyle[] = ['plain', 'lined', 'grid', 'dots'];
    const currentIdx = cycleOrder.indexOf(note.paperStyle || 'plain');
    const nextStyle = cycleOrder[(currentIdx + 1) % cycleOrder.length] || 'plain';
    const styleNames: Record<NotePaperStyle, string> = {
      plain: 'Rent papper',
      lined: 'Linjerat papper',
      grid: 'Rutigt papper',
      dots: 'Prickat papper (Dot grid)',
    };
    const updated = addVersionSnapshot(
      {
        ...note,
        paperStyle: nextStyle,
        updatedAt: Date.now(),
      },
      'color',
      `Pappersstil ändrad till ${styleNames[nextStyle]}`
    );
    onUpdate(updated, true);
  };

  // Cycle font size (sm -> base -> lg -> sm)
  const handleCycleFontSize = () => {
    const nextSize: Record<FontSizeType, FontSizeType> = {
      sm: 'base',
      base: 'lg',
      lg: 'sm',
    };
    const nextVal = nextSize[note.fontSize || 'base'];
    const updated = addVersionSnapshot(
      {
        ...note,
        fontSize: nextVal,
        updatedAt: Date.now(),
      },
      'font',
      `Textstorlek ändrad till ${nextVal}`
    );
    onUpdate(updated, true);
  };

  // Text inputs
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(
      {
        ...note,
        title: e.target.value,
        updatedAt: Date.now(),
      },
      false
    );
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(
      {
        ...note,
        content: e.target.value,
        updatedAt: Date.now(),
      },
      false
    );
  };

  // Text change commit on blur to record history
  const handleBlur = () => {
    const updated = addVersionSnapshot(
      { ...note, updatedAt: Date.now() },
      'content_edit',
      note.title ? `Textändring: "${note.title}"` : 'Textredigering'
    );
    onUpdate(updated, true);
  };

  // Toggle sketch mode with ergonomic dimension expansion for Apple Pencil drawing
  const handleToggleSketchMode = () => {
    const nextState = !isSketchMode;
    setIsSketchMode(nextState);
    onBringToFront(note.id);
    if (nextState) {
      const minSketchH = 320;
      const minSketchW = 300;
      if (note.height < minSketchH || note.width < minSketchW) {
        onUpdate(
          {
            ...note,
            width: Math.max(note.width, minSketchW),
            height: Math.max(note.height, minSketchH),
            updatedAt: Date.now(),
          },
          false
        );
      }
    }
  };

  // Save freehand drawing data
  const handleSaveDrawing = (dataUrl: string | undefined) => {
    const updated = addVersionSnapshot(
      {
        ...note,
        drawingData: dataUrl,
        updatedAt: Date.now(),
      },
      'drawing',
      dataUrl ? 'Apple Pencil skiss uppdaterad' : 'Skiss raderad'
    );
    onUpdate(updated, true);
  };

  // Close sketch mode
  const handleCloseSketchMode = () => {
    setIsSketchMode(false);
  };

  const fontClass = {
    sans: 'font-sans-clean font-medium',
    handwriting: 'font-handwriting tracking-wide',
    kalam: 'font-kalam tracking-wide',
    casual: 'font-casual tracking-normal',
  }[note.fontFamily || 'sans'];

  const isCursive = note.fontFamily && note.fontFamily !== 'sans';
  const fontSizeClass = {
    sm: isCursive ? 'text-lg leading-snug' : 'text-sm leading-relaxed',
    base: isCursive ? 'text-2xl leading-normal' : 'text-base leading-relaxed',
    lg: isCursive ? 'text-3xl leading-normal' : 'text-lg leading-relaxed',
  }[note.fontSize || 'base'];

  const paperPatternClass = {
    plain: '',
    lined: 'paper-pattern-lines',
    grid: 'paper-pattern-grid',
    dots: 'paper-pattern-dots',
  }[note.paperStyle || 'plain'];

  // Dim note if search is active and this note is not a match
  const searchDimClass = isSearchActive && !isSearchMatch ? 'opacity-30 scale-98 pointer-events-none' : '';

  // Focus isolation styling
  let focusClass = '';
  if (isFocused) {
    focusClass = 'ring-4 ring-amber-400 dark:ring-amber-300 shadow-2xl scale-[1.02] z-50';
  } else if (hasFocusedNote) {
    focusClass = 'opacity-40 blur-[0.25px] scale-[0.985]';
  }

  const cardStatusClasses = searchDimClass || focusClass;

  return (
    <div
      ref={cardRef}
      id={`postit-card-${note.id}`}
      style={{
        transform: `translate3d(${note.x}px, ${note.y}px, 0px) rotate(${isDragging ? 0 : note.rotation}deg) scale(${isDragging ? 1.025 : 1})`,
        width: `${note.width}px`,
        height: `${note.height}px`,
        zIndex: isFocused ? 10000 : note.isPinned ? 9999 + note.zIndex : note.zIndex,
        transition: isDragging || isResizing ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, opacity 0.35s ease, filter 0.35s ease',
      }}
      className={`absolute select-none flex flex-col rounded-2xl border overflow-hidden box-border post-it-adhesive-bar ${colorConfig.bgClass} ${colorConfig.borderClass} ${colorConfig.textColorClass} ${isDragging ? 'post-it-shadow-lifted cursor-grabbing' : 'post-it-shadow post-it-curl cursor-grab'} ${cardStatusClasses} ${isSearchMatch && isSearchActive ? 'ring-4 ring-amber-500/80 shadow-2xl' : ''}`}
      onPointerDown={() => onBringToFront(note.id)}
      onDoubleClick={handleCardDoubleClick}
    >
      {/* Realistic 3D Pushpin visual when pinned */}
      {note.isPinned && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)] flex flex-col items-center select-none"
          title="Fäst på skrivbordet"
        >
          <svg width="28" height="30" viewBox="0 0 28 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id={`pin-grad-${note.id}`} cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="40%" stopColor={colorConfig.pinColor} />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.8" />
              </radialGradient>
            </defs>
            {/* Pin head dome */}
            <circle cx="14" cy="9" r="7" fill={`url(#pin-grad-${note.id})`} />
            {/* Pin rim */}
            <ellipse cx="14" cy="14" rx="5.5" ry="2.5" fill={colorConfig.pinColor} />
            {/* Needle shaft */}
            <path d="M14 14V27" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
            {/* Needle tip point */}
            <circle cx="14" cy="27" r="1.2" fill="#0f172a" />
          </svg>
        </div>
      )}

      {/* Note Header & Drag Strip */}
      <div
        id={`postit-header-${note.id}`}
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
        className={`touch-drag-area flex items-center justify-between px-2.5 py-1.5 border-b border-black/5 ${colorConfig.headerClass} select-none shrink-0 w-full min-w-0`}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0 pr-1">
          <GripHorizontal className="h-3.5 w-3.5 opacity-40 shrink-0" />
          <input
            id={`postit-title-input-${note.id}`}
            type="text"
            data-no-drag="true"
            placeholder="Titel..."
            value={note.title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            maxLength={60}
            className={`w-full bg-transparent font-bold text-xs sm:text-sm outline-none placeholder:text-black/30 truncate ${colorConfig.textColorClass}`}
          />
        </div>

        {/* Quick Header Actions - Sleek, proportional 28px buttons */}
        <div className="flex items-center gap-0.5 shrink-0" data-no-drag="true">
          {/* Apple Pencil / Freehand Sketch Mode toggle */}
          <button
            id={`btn-sketch-mode-${note.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSketchMode();
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
              isSketchMode
                ? 'bg-amber-400 text-slate-950 shadow-2xs ring-1 ring-black/20'
                : note.drawingData
                ? 'text-amber-900 bg-amber-400/30 hover:bg-amber-400/50'
                : 'opacity-60 hover:opacity-100 hover:bg-black/10 active:scale-95'
            }`}
            title={isSketchMode ? 'Avsluta skiss-mod' : 'Skiss-mod (rita med Apple Pencil)'}
            aria-label={isSketchMode ? 'Avsluta skiss-mod' : 'Skiss-mod'}
          >
            <Pencil className={`h-3.5 w-3.5 ${isSketchMode ? 'stroke-[2.5]' : ''}`} />
          </button>

          {/* Color palette toggle */}
          <button
            id={`btn-color-picker-${note.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-colors"
            title="Ändra färg"
            aria-label="Ändra färg"
          >
            <div className={`h-3.5 w-3.5 rounded-full ${colorConfig.swatchClass} ring-1 ring-black/25 shadow-2xs`} />
          </button>

          {/* Pin toggle */}
          <button
            id={`btn-pin-${note.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin();
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-colors ${
              note.isPinned ? 'text-amber-800 bg-black/15 shadow-2xs' : 'opacity-60 hover:opacity-100'
            }`}
            title={note.isPinned ? 'Lossa lapp' : 'Fäst lapp'}
            aria-label={note.isPinned ? 'Lossa lapp' : 'Fäst lapp'}
          >
            <Pin className={`h-3.5 w-3.5 ${note.isPinned ? 'fill-current rotate-45' : ''}`} />
          </button>

          {/* Delete button */}
          <button
            id={`btn-delete-${note.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(note);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-red-600/70 hover:text-red-700 hover:bg-red-500/15 active:scale-95 transition-colors"
            title="Ta bort lapp till papperskorgen"
            aria-label="Ta bort lapp"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Color Picker Drawer */}
      {showColorPicker && (
        <div
          id={`color-picker-palette-${note.id}`}
          data-no-drag="true"
          className="flex items-center justify-around px-2 py-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border-b border-black/10 shadow-inner z-20 w-full"
        >
          {(['yellow', 'pink', 'blue', 'green', 'orange', 'purple'] as PostItColor[]).map((c) => {
            const cfg = COLOR_CONFIGS[c];
            const isSelected = note.color === c;
            return (
              <button
                key={c}
                type="button"
                id={`btn-select-color-${c}-${note.id}`}
                onClick={() => handleColorChange(c)}
                className="relative flex h-7 w-7 items-center justify-center rounded-full active:scale-90 transition-transform"
                title={cfg.name}
              >
                <span
                  className={`h-5 w-5 rounded-full ${cfg.swatchClass} shadow-2xs border border-black/20 flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-slate-800 dark:ring-white ring-offset-1' : ''
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-slate-900 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Note Body Textarea & Freehand Sketch Canvas Layer */}
      <div
        id={`postit-body-${note.id}`}
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
        className={`touch-drag-area flex-1 flex flex-col px-3 py-1.5 min-h-0 relative overflow-hidden w-full ${paperPatternClass}`}
      >
        {/* Attached Camera Photo with full sizing, rotation, fit, filters and touch resizing */}
        {note.imageUrl && (
          <NoteImagePreview
            noteId={note.id}
            noteTitle={note.title}
            imageUrl={note.imageUrl}
            imageConfig={note.imageConfig}
            onUpdateConfig={(newConfig) => {
              const updated = addVersionSnapshot(
                {
                  ...note,
                  imageConfig: newConfig,
                  updatedAt: Date.now(),
                },
                'photo',
                'Bildjustering (storlek/filter/rotation)'
              );
              onUpdate(updated, true);
            }}
            onRemoveImage={() => {
              const updated = addVersionSnapshot(
                {
                  ...note,
                  imageUrl: undefined,
                  imageConfig: undefined,
                  updatedAt: Date.now(),
                },
                'photo',
                'Bild borttagen från lappen'
              );
              onUpdate(updated, true);
            }}
            onOpenNewCamera={() => setShowCameraModal(true)}
            noteHeight={note.height}
            onEnsureNoteHeight={(requiredHeight) => {
              if (requiredHeight > note.height) {
                onUpdate(
                  {
                    ...note,
                    height: requiredHeight,
                    updatedAt: Date.now(),
                  },
                  true
                );
              }
            }}
          />
        )}

        <textarea
          id={`postit-textarea-${note.id}`}
          data-no-drag="true"
          value={note.content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          placeholder={isSketchMode ? '' : 'Skriv din anteckning här...'}
          className={`w-full flex-1 bg-transparent resize-none outline-none leading-relaxed overflow-y-auto whitespace-pre-wrap break-words break-all custom-note-scrollbar ${fontClass} ${fontSizeClass} ${colorConfig.textColorClass} placeholder:text-black/30 selection:bg-black/15 ${
            isSketchMode ? 'pointer-events-none opacity-40' : 'opacity-100'
          }`}
        />

        {/* Freehand Apple Pencil / Touch sketch layer */}
        {(isSketchMode || note.drawingData) && (
          <NoteSketchCanvas
            noteId={note.id}
            width={note.width}
            height={Math.max(80, note.height - 75)}
            drawingData={note.drawingData}
            isSketchMode={isSketchMode}
            onSaveDrawing={handleSaveDrawing}
            onCloseSketchMode={handleCloseSketchMode}
            onActivateSketchMode={() => {
              setIsSketchMode(true);
              onUpdate({ ...note, isSketchMode: true }, false);
            }}
          />
        )}
      </div>

      {/* Note Footer: Metadata, Styling tools, and Corner Resize handle */}
      <div
        id={`postit-footer-${note.id}`}
        className="relative flex items-center justify-between px-2 py-1 border-t border-black/[0.06] text-[11px] text-black/60 select-none shrink-0 bg-black/[0.02] w-full min-w-0 overflow-hidden"
      >
        {/* Left footer: Typography, sizing, camera, history, duplicate & export (compact icon buttons) */}
        <div className="flex items-center gap-0.5 shrink-0 min-w-0" data-no-drag="true">
          {/* Camera photo button in footer */}
          <button
            id={`btn-footer-camera-${note.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowCameraModal(true);
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-all ${
              note.imageUrl ? 'bg-amber-400 text-slate-900 font-bold shadow-2xs ring-1 ring-black/15' : 'opacity-70 hover:opacity-100'
            }`}
            title="Kamera / Foto: Ta eller infoga bild i lappen"
            aria-label="Kamera"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>

          {/* Toggle handwriting vs clean sans */}
          <button
            id={`btn-toggle-font-${note.id}`}
            type="button"
            onClick={handleToggleFont}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-all opacity-75 hover:opacity-100 text-[11px] font-bold"
            title={`Typsnitt: ${note.fontFamily === 'handwriting' ? 'Handskrift (Caveat)' : note.fontFamily === 'kalam' ? 'Skiss handstil (Kalam)' : note.fontFamily === 'casual' ? 'Ren handstil (Patrick Hand)' : 'Standard (Sans)'} - Klicka för att byta`}
            aria-label="Byt typsnitt"
          >
            <Type className="h-3.5 w-3.5" />
          </button>

          {/* Paper style pattern toggle */}
          <button
            id={`btn-paper-style-${note.id}`}
            type="button"
            onClick={handleCyclePaperStyle}
            className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-all ${
              note.paperStyle && note.paperStyle !== 'plain' ? 'bg-black/10 text-slate-900 font-bold' : 'opacity-75 hover:opacity-100'
            }`}
            title={`Pappersmönster: ${note.paperStyle === 'lined' ? 'Linjerat' : note.paperStyle === 'grid' ? 'Rutigt' : note.paperStyle === 'dots' ? 'Prickat' : 'Rent papper'} - Klicka för att byta`}
            aria-label="Byt pappersstil"
          >
            <Grid className="h-3.5 w-3.5" />
          </button>

          {/* Font size toggle */}
          <button
            id={`btn-cycle-size-${note.id}`}
            type="button"
            onClick={handleCycleFontSize}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-all opacity-75 hover:opacity-100 text-[11px] font-bold"
            title={`Textstorlek: ${note.fontSize === 'sm' ? 'Liten (S)' : note.fontSize === 'lg' ? 'Stor (L)' : 'Medium (M)'}`}
            aria-label="Ändra textstorlek"
          >
            {note.fontSize === 'sm' ? 'S' : note.fontSize === 'lg' ? 'L' : 'M'}
          </button>

          {/* History / Timeline button */}
          <button
            id={`btn-footer-history-${note.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHistoryModal(true);
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-all ${
              note.versions && note.versions.length > 1 ? 'opacity-90 text-amber-900 font-bold' : 'opacity-70 hover:opacity-100'
            }`}
            title={`Ändringshistorik & tidslinje (${note.versions?.length || 1} versioner)`}
            aria-label="Ändringshistorik"
          >
            <History className="h-3.5 w-3.5" />
          </button>

          {/* Duplicate note */}
          <button
            id={`btn-duplicate-${note.id}`}
            type="button"
            onClick={() => onDuplicate(note)}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-all opacity-70 hover:opacity-100"
            title="Duplicera lapp"
            aria-label="Duplicera lapp"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          {/* Download / Export note as PNG */}
          <button
            id={`btn-export-png-${note.id}`}
            type="button"
            onClick={handleDownloadNoteAsPng}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/10 active:scale-95 transition-all opacity-70 hover:opacity-100"
            title="Ladda ner lappen som PNG-bild"
            aria-label="Ladda ner som bild"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right side: Clickable Timestamp & Corner Resize */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            type="button"
            id={`btn-timestamp-${note.id}`}
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              setShowHistoryModal(true);
            }}
            className="text-[10px] opacity-60 hover:opacity-100 font-mono truncate max-w-[55px] sm:max-w-[70px] hover:underline cursor-pointer flex items-center gap-0.5"
            title={`Senast ändrad: ${new Date(note.updatedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })} - Klicka för ändringshistorik`}
          >
            <Clock className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{formatTimestamp(note.updatedAt)}</span>
          </button>

          {/* Size & Dimensions Quick Button */}
          <button
            type="button"
            id={`btn-size-modal-${note.id}`}
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              setShowSizeModal(true);
            }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md hover:bg-black/10 active:scale-95 transition-all text-[10px] font-mono opacity-70 hover:opacity-100 font-semibold cursor-pointer shrink-0"
            title={`Storlek: ${note.width} × ${note.height} px - Klicka för format, sliders & full storlekskontroll`}
            aria-label="Storlekskontroll"
          >
            <Maximize2 className="h-2.5 w-2.5 shrink-0" />
            <span>{note.width}×{note.height}</span>
          </button>

          {/* Primary Corner Resize Handle (Bottom-Right) */}
          <div
            id={`postit-resize-handle-${note.id}`}
            data-no-drag="true"
            onPointerDown={(e) => handleResizePointerDown(e, 'se')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            className="touch-drag-area -mr-1 flex h-7 w-7 items-center justify-center cursor-nwse-resize active:scale-110 transition-transform opacity-40 hover:opacity-90 hover:text-amber-800 dark:hover:text-amber-300 shrink-0 z-30"
            title="Dra i hörnet för att ändra storlek"
            aria-label="Ändra storlek"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="9" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* 8-Way Edge & Corner Resizing Zones for Full Interactive Size Control */}
      {/* Right Edge (Width) */}
      <div
        id={`postit-resize-e-${note.id}`}
        data-no-drag="true"
        onPointerDown={(e) => handleResizePointerDown(e, 'e')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute top-6 right-0 bottom-6 w-2.5 cursor-ew-resize hover:bg-black/10 transition-colors z-20"
        title="Dra för att ändra bredd"
      />
      {/* Bottom Edge (Height) */}
      <div
        id={`postit-resize-s-${note.id}`}
        data-no-drag="true"
        onPointerDown={(e) => handleResizePointerDown(e, 's')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute bottom-0 left-6 right-8 h-2.5 cursor-ns-resize hover:bg-black/10 transition-colors z-20"
        title="Dra för att ändra höjd"
      />
      {/* Left Edge (Width from Left) */}
      <div
        id={`postit-resize-w-${note.id}`}
        data-no-drag="true"
        onPointerDown={(e) => handleResizePointerDown(e, 'w')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute top-6 left-0 bottom-6 w-2.5 cursor-ew-resize hover:bg-black/10 transition-colors z-20"
        title="Dra för att ändra bredd från vänster"
      />
      {/* Top Edge (Height from Top) */}
      <div
        id={`postit-resize-n-${note.id}`}
        data-no-drag="true"
        onPointerDown={(e) => handleResizePointerDown(e, 'n')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute top-0 left-8 right-8 h-1.5 cursor-ns-resize hover:bg-black/10 transition-colors z-20"
        title="Dra för att ändra höjd från toppen"
      />
      {/* Bottom-Left Corner */}
      <div
        id={`postit-resize-sw-${note.id}`}
        data-no-drag="true"
        onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute bottom-0 left-0 w-5 h-5 cursor-nesw-resize hover:bg-black/10 rounded-bl-2xl transition-colors z-20"
        title="Dra för att ändra storlek"
      />
      {/* Top-Right Corner */}
      <div
        id={`postit-resize-ne-${note.id}`}
        data-no-drag="true"
        onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize hover:bg-black/10 rounded-tr-2xl transition-colors z-20"
        title="Dra för att ändra storlek"
      />
      {/* Top-Left Corner */}
      <div
        id={`postit-resize-nw-${note.id}`}
        data-no-drag="true"
        onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize hover:bg-black/10 rounded-tl-2xl transition-colors z-20"
        title="Dra för att ändra storlek"
      />

      {/* Live Dimension HUD overlay during active resizing */}
      {isResizing && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 py-1 rounded-full bg-slate-900/95 text-white text-xs font-mono font-bold shadow-2xl backdrop-blur-md flex items-center gap-1.5 border border-white/20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-75">
          <Maximize2 className="h-3.5 w-3.5 text-amber-400" />
          <span>{note.width} × {note.height} px</span>
          <span className="text-white/60 text-[10px]">({(note.width / note.height).toFixed(2)}:1)</span>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCapturePhoto}
        noteTitle={note.title}
      />

      {/* Note Version History & Timeline Modal */}
      <NoteHistoryModal
        note={note}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onRestore={(restoredNote) => {
          onUpdate(restoredNote, true);
        }}
      />

      {/* Note Size & Dimensions Full Control Modal */}
      <PostItSizeModal
        note={note}
        isOpen={showSizeModal}
        onClose={() => setShowSizeModal(false)}
        onApplySize={handleApplyCustomSize}
      />
    </div>
  );
};
