import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Pencil,
  Highlighter,
  Eraser,
  RotateCcw,
  Trash2,
  Check,
  Circle,
} from 'lucide-react';

interface NoteSketchCanvasProps {
  noteId: string;
  width: number;
  height: number;
  drawingData?: string;
  isSketchMode: boolean;
  onSaveDrawing: (dataUrl: string | undefined) => void;
  onCloseSketchMode: () => void;
}

type ToolType = 'pen' | 'highlighter' | 'eraser';

const INK_COLORS = [
  { id: 'black', value: '#1e293b', label: 'Svart bläck' },
  { id: 'blue', value: '#1d4ed8', label: 'Blå kulspets' },
  { id: 'red', value: '#dc2626', label: 'Röd korr' },
  { id: 'green', value: '#15803d', label: 'Grön' },
  { id: 'orange', value: '#ea580c', label: 'Orange' },
];

export const NoteSketchCanvas: React.FC<NoteSketchCanvasProps> = ({
  noteId,
  width,
  height,
  drawingData,
  isSketchMode,
  onSaveDrawing,
  onCloseSketchMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [activeColor, setActiveColor] = useState<string>('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [hasContent, setHasContent] = useState<boolean>(Boolean(drawingData));
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [isApplePencilActive, setIsApplePencilActive] = useState<boolean>(false);

  // Drawing state refs for smooth high-frequency pointer moves
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number; pressure: number } | null>(null);
  const currentDrawnDataUrlRef = useRef<string | undefined>(drawingData);
  const prevDimsRef = useRef<{ width: number; height: number }>({ width, height });

  // Sync canvas size and restore previous drawing without flickering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // If width or height changed and we already have drawn content, preserve it smoothly across resize!
    if (prevDimsRef.current.width !== width || prevDimsRef.current.height !== height) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = Math.max(10, width * dpr);
      canvas.height = Math.max(10, height * dpr);
      ctx.scale(dpr, dpr);

      if (tempCtx && tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / dpr, tempCanvas.height / dpr);
      }
      prevDimsRef.current = { width, height };
    } else if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = Math.max(10, width * dpr);
      canvas.height = Math.max(10, height * dpr);
      ctx.scale(dpr, dpr);
    }

    // Only load from image URL if external state changed (e.g. undo/redo or initial mount)
    if (drawingData !== currentDrawnDataUrlRef.current) {
      currentDrawnDataUrlRef.current = drawingData;
      if (drawingData) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          setHasContent(true);
        };
        img.src = drawingData;
      } else {
        ctx.clearRect(0, 0, width, height);
        setHasContent(false);
      }
    }
  }, [width, height, drawingData]);

  // Save drawing snapshot to note state
  const commitCanvasToState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasDrawnPixels = false;
    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] > 10) {
        hasDrawnPixels = true;
        break;
      }
    }

    if (hasDrawnPixels) {
      const dataUrl = canvas.toDataURL('image/png');
      currentDrawnDataUrlRef.current = dataUrl;
      setHasContent(true);
      onSaveDrawing(dataUrl);
    } else {
      currentDrawnDataUrlRef.current = undefined;
      setHasContent(false);
      onSaveDrawing(undefined);
    }
  }, [onSaveDrawing]);

  // Push snapshot to undo stack before starting a stroke
  const saveSnapshotForUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory((prev) => [...prev.slice(-25), snapshot]);
  }, []);

  // Undo last stroke
  const handleUndoStroke = useCallback(() => {
    if (strokeHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const newHistory = [...strokeHistory];
    const previousSnapshot = newHistory.pop();
    setStrokeHistory(newHistory);

    if (previousSnapshot) {
      ctx.putImageData(previousSnapshot, 0, 0);
      commitCanvasToState();
    }
  }, [strokeHistory, commitCanvasToState]);

  // Clear all drawings
  const handleClearDrawing = useCallback(() => {
    saveSnapshotForUndo();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    currentDrawnDataUrlRef.current = undefined;
    setHasContent(false);
    onSaveDrawing(undefined);
  }, [saveSnapshotForUndo, onSaveDrawing]);

  // Pointer Event Handlers for Apple Pencil and Touch
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSketchMode) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.pointerType === 'pen') {
      setIsApplePencilActive(true);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    saveSnapshotForUndo();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    isDrawingRef.current = true;
    lastPointRef.current = { x, y, pressure };

    // Draw single dot on tap
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(x, y, (strokeWidth * 3.5) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = activeColor;
      ctx.beginPath();
      ctx.arc(x, y, (strokeWidth * 3.5) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = activeColor;
      ctx.beginPath();
      const dotRadius = Math.max(1, (strokeWidth * (0.6 + pressure * 0.8)) / 2);
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isSketchMode || !lastPointRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 4.5;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = strokeWidth * 4;
      ctx.strokeStyle = activeColor;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      // Apple Pencil pressure modulation
      const dynamicWidth = Math.max(1.5, strokeWidth * (0.5 + pressure * 0.9));
      ctx.lineWidth = dynamicWidth;
      ctx.strokeStyle = activeColor;
    }

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    // Smooth midpoint interpolation
    const midX = (lastPointRef.current.x + currentX) / 2;
    const midY = (lastPointRef.current.y + currentY) / 2;
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.stroke();

    ctx.restore();

    lastPointRef.current = { x: midX, y: midY, pressure };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
    commitCanvasToState();
  };

  return (
    <div
      id={`sketch-container-${noteId}`}
      className="absolute inset-0 z-20 flex flex-col pointer-events-none"
    >
      {/* Floating Pencil Tool Toolbar (When in active Sketch Mode) */}
      {isSketchMode && (
        <div
          id={`sketch-toolbar-${noteId}`}
          data-no-drag="true"
          className="pointer-events-auto shrink-0 flex flex-wrap items-center justify-between gap-1 px-2.5 py-1.5 bg-slate-900/90 text-white backdrop-blur-md rounded-t-xl border-b border-white/10 shadow-lg select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tool selection: Pen, Highlighter, Eraser */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              id={`btn-tool-pen-${noteId}`}
              onClick={() => setActiveTool('pen')}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                activeTool === 'pen'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-white/80 hover:bg-white/10 active:scale-95'
              }`}
              title="Blyerts / Bläckpenna"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              type="button"
              id={`btn-tool-highlighter-${noteId}`}
              onClick={() => setActiveTool('highlighter')}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-white/80 hover:bg-white/10 active:scale-95'
              }`}
              title="Överstrykningspenna"
            >
              <Highlighter className="h-4 w-4" />
            </button>

            <button
              type="button"
              id={`btn-tool-eraser-${noteId}`}
              onClick={() => setActiveTool('eraser')}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                activeTool === 'eraser'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-white/80 hover:bg-white/10 active:scale-95'
              }`}
              title="Suddgummi"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>

          {/* Ink Colors (if not using eraser) */}
          {activeTool !== 'eraser' && (
            <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg">
              {INK_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveColor(c.value)}
                  className="flex h-7 w-7 items-center justify-center rounded-md active:scale-95 transition-transform"
                  title={c.label}
                >
                  <span
                    className={`h-4 w-4 rounded-full border border-white/40 shadow-xs ${
                      activeColor === c.value ? 'ring-2 ring-amber-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Stroke width selector */}
          <div className="flex items-center gap-0.5 bg-white/10 p-0.5 rounded-lg">
            {[2, 4, 7].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setStrokeWidth(size)}
                className={`flex h-7 w-7 items-center justify-center rounded-md ${
                  strokeWidth === size ? 'bg-white/20' : ''
                }`}
                title={`Tjocklek ${size}px`}
              >
                <span
                  className="rounded-full bg-white"
                  style={{ width: `${size + 2}px`, height: `${size + 2}px` }}
                />
              </button>
            ))}
          </div>

          {/* Undo stroke, Clear & Done Buttons */}
          <div className="flex items-center gap-1">
            {isApplePencilActive && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-300 bg-white/10 px-1.5 py-0.5 rounded font-mono">
                ✏️ Pencil
              </span>
            )}

            <button
              type="button"
              id={`btn-undo-stroke-${noteId}`}
              onClick={handleUndoStroke}
              disabled={strokeHistory.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30 active:scale-95"
              title="Ångra senaste pennstreck"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {hasContent && (
              <button
                type="button"
                id={`btn-clear-drawing-${noteId}`}
                onClick={handleClearDrawing}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-white/10 active:scale-95"
                title="Rensa hela skissen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              id={`btn-close-sketch-${noteId}`}
              onClick={onCloseSketchMode}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all ml-1"
              title="Avsluta skissläge och spara"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Klar</span>
            </button>
          </div>
        </div>
      )}

      {/* Freehand Sketch Canvas Layer */}
      <canvas
        ref={canvasRef}
        id={`sketch-canvas-${noteId}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          touchAction: 'none',
        }}
        className={`w-full h-full flex-1 ${
          isSketchMode
            ? 'pointer-events-auto cursor-crosshair'
            : 'pointer-events-none opacity-95'
        }`}
      />
    </div>
  );
};
