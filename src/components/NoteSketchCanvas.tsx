import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Pencil,
  Highlighter,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Check,
  Circle,
  PenTool,
  Feather,
  Grid,
  Maximize2,
  Minimize2,
  Download,
  Shield,
  Sparkles,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import {
  StylusCalibrationSettings,
  DEFAULT_STYLUS_CALIBRATION,
} from '../types';
import { StylusCalibrationModal } from './StylusCalibrationModal';

interface NoteSketchCanvasProps {
  noteId: string;
  width: number;
  height: number;
  drawingData?: string;
  isSketchMode: boolean;
  onSaveDrawing: (dataUrl: string | undefined) => void;
  onCloseSketchMode: () => void;
  onActivateSketchMode?: () => void;
}

export type SketchToolType = 'pen' | 'pencil' | 'fountain' | 'highlighter' | 'eraser';
export type GuidePatternType = 'none' | 'dots' | 'grid' | 'lines';

interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  altitudeAngle?: number;
  azimuthAngle?: number;
  time: number;
}

interface InkColorOption {
  id: string;
  value: string;
  label: string;
  isHighlighter?: boolean;
}

const INK_COLORS: InkColorOption[] = [
  { id: 'charcoal', value: '#1e293b', label: 'Kol / Svart bläck' },
  { id: 'navy', value: '#1d4ed8', label: 'Marinblå kulspets' },
  { id: 'crimson', value: '#dc2626', label: 'Karmosinröd' },
  { id: 'emerald', value: '#15803d', label: 'Skogsgrön' },
  { id: 'amber', value: '#d97706', label: 'Varm bärnsten' },
  { id: 'purple', value: '#9333ea', label: 'Lila tusch' },
  { id: 'graphite', value: '#64748b', label: 'Mjuk grafitgrå' },
  { id: 'neon-yellow', value: '#facc15', label: 'Neon gul överstrykare', isHighlighter: true },
];

export const NoteSketchCanvas: React.FC<NoteSketchCanvasProps> = ({
  noteId,
  width,
  height,
  drawingData,
  isSketchMode,
  onSaveDrawing,
  onCloseSketchMode,
  onActivateSketchMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tools & Styling
  const [activeTool, setActiveTool] = useState<SketchToolType>('pen');
  const previousToolRef = useRef<SketchToolType>('pen');
  const [activeColor, setActiveColor] = useState<string>('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [hasContent, setHasContent] = useState<boolean>(Boolean(drawingData));
  const [guidePattern, setGuidePattern] = useState<GuidePatternType>('none');
  const [snapShapes, setSnapShapes] = useState<boolean>(true);
  const [palmRejection, setPalmRejection] = useState<boolean>(true);
  const [isApplePencilDetected, setIsApplePencilDetected] = useState<boolean>(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number; pressure?: number } | null>(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [gestureToast, setGestureToast] = useState<string | null>(null);
  const gestureToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // iPad touch & Apple Pencil gesture tracking
  const lastPencilTimeRef = useRef<number>(0);
  const activeTouchPointsRef = useRef<Map<number, { startX: number; startY: number; startTime: number }>>(new Map());
  const maxSketchTouchesRef = useRef<number>(0);

  const showGestureToast = useCallback((msg: string) => {
    setGestureToast(msg);
    if (gestureToastTimerRef.current) clearTimeout(gestureToastTimerRef.current);
    gestureToastTimerRef.current = setTimeout(() => setGestureToast(null), 1400);
  }, []);

  // Quick switch between active drawing tool and eraser (Apple Pencil 2 Double-Tap simulation)
  const toggleEraser = useCallback(() => {
    if (activeTool === 'eraser') {
      const restore = previousToolRef.current === 'eraser' ? 'pen' : previousToolRef.current;
      setActiveTool(restore);
      showGestureToast(`Penna återställd (${restore}) ✏️`);
    } else {
      previousToolRef.current = activeTool;
      setActiveTool('eraser');
      showGestureToast('Suddgummi aktiv 🧹');
    }
  }, [activeTool, showGestureToast]);

  // Stylus calibration settings
  const [calibration, setCalibration] = useState<StylusCalibrationSettings>(() => {
    try {
      const saved = localStorage.getItem('postit_stylus_calibration');
      if (saved) {
        return { ...DEFAULT_STYLUS_CALIBRATION, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_STYLUS_CALIBRATION;
  });

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Drawing state refs
  const isDrawingRef = useRef<boolean>(false);
  const strokePointsRef = useRef<StrokePoint[]>([]);
  const lastDrawnIndexRef = useRef<number>(0);
  const currentDrawnDataUrlRef = useRef<string | undefined>(drawingData);
  const prevDimsRef = useRef<{ width: number; height: number }>({ width, height });

  // Smart Shape hold detection timer
  const shapeHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSnappedShapeRef = useRef<boolean>(false);
  const beforeStrokeSnapshotRef = useRef<ImageData | null>(null);

  // Sync canvas size and scale with high DPI (Retina & iPad ProMotion)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // If note resized while drawing exists, preserve artwork smoothly
    if (prevDimsRef.current.width !== width || prevDimsRef.current.height !== height) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = Math.max(10, Math.round(width * dpr));
      canvas.height = Math.max(10, Math.round(height * dpr));
      ctx.scale(dpr, dpr);

      if (tempCtx && tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / dpr, tempCanvas.height / dpr);
      }
      prevDimsRef.current = { width, height };
    } else if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = Math.max(10, Math.round(width * dpr));
      canvas.height = Math.max(10, Math.round(height * dpr));
      ctx.scale(dpr, dpr);
    }

    // Load from external state if updated outside (e.g. undo/redo)
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

  // Save drawing snapshot to parent note state
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

  // Save snapshot to undo stack before a stroke
  const saveSnapshotForUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev.slice(-30), snapshot]);
    setRedoStack([]); // Clear redo on new action
  }, []);

  // Undo stroke
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newUndoStack = [...undoStack];
    const previousSnapshot = newUndoStack.pop();

    if (previousSnapshot) {
      setUndoStack(newUndoStack);
      setRedoStack((prev) => [...prev.slice(-30), currentSnapshot]);
      ctx.putImageData(previousSnapshot, 0, 0);
      commitCanvasToState();
    }
  }, [undoStack, commitCanvasToState]);

  // Redo stroke
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newRedoStack = [...redoStack];
    const nextSnapshot = newRedoStack.pop();

    if (nextSnapshot) {
      setRedoStack(newRedoStack);
      setUndoStack((prev) => [...prev.slice(-30), currentSnapshot]);
      ctx.putImageData(nextSnapshot, 0, 0);
      commitCanvasToState();
    }
  }, [redoStack, commitCanvasToState]);

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

  // Download sketch directly as standalone PNG
  const handleExportSketch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `skiss-lapp-${noteId}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to calculate realistic calibrated dynamic stroke width & alpha based on tool type & physics
  const getToolProperties = (
    tool: SketchToolType,
    rawPressure: number,
    baseWidth: number,
    color: string,
    dx: number = 0,
    dy: number = 0,
    tiltX: number = 0,
    tiltY: number = 0,
    altitudeAngle?: number
  ) => {
    // Apply calibrated pressure curve
    let normPressure = Math.max(0.1, Math.min(1.0, rawPressure));
    switch (calibration.pressureCurve) {
      case 'soft':
        normPressure = Math.min(1.2, Math.pow(normPressure, 0.55) * calibration.pressureSensitivity);
        break;
      case 'firm':
        normPressure = Math.min(1.2, Math.pow(normPressure, 1.8) * calibration.pressureSensitivity);
        break;
      case 'fixed':
        normPressure = 0.75;
        break;
      case 'balanced':
      default:
        normPressure = Math.min(1.2, Math.pow(normPressure, 1.25) * calibration.pressureSensitivity);
        break;
    }

    const speed = Math.hypot(dx, dy);

    switch (tool) {
      case 'pencil': {
        // Graphite pencil: tilt sensitivity widens the stroke, pressure adds graphite density
        const tiltMagnitude = Math.hypot(tiltX, tiltY);
        let tiltFactor = tiltMagnitude > 20 ? 1 + (tiltMagnitude - 20) / 40 : 1;
        // Native Apple Pencil altitude angle on iPad (0 = flat on glass, PI/2 = vertical)
        if (altitudeAngle !== undefined && altitudeAngle < 0.65) {
          tiltFactor = Math.max(tiltFactor, 1 + (0.65 - altitudeAngle) * 2.4);
        }
        const width = Math.max(1, baseWidth * (0.5 + Math.pow(normPressure, 1.2) * 0.9) * tiltFactor);
        const alpha = Math.min(0.9, Math.max(0.25, 0.4 + normPressure * 0.5));
        return {
          width,
          color,
          alpha,
          composite: 'source-over' as GlobalCompositeOperation,
          lineCap: 'round' as CanvasLineCap,
          lineJoin: 'round' as CanvasLineJoin,
        };
      }
      case 'fountain': {
        // Calligraphy nib: angle dynamics between stroke velocity and 45-degree chisel
        const angle = Math.atan2(dy, dx);
        const chiselAngle = Math.PI / 4;
        const angleMod = 0.35 + 0.85 * Math.abs(Math.sin(angle - chiselAngle));
        const width = Math.max(1.2, baseWidth * angleMod * (0.6 + normPressure * 0.8));
        return {
          width,
          color,
          alpha: 1.0,
          composite: 'source-over' as GlobalCompositeOperation,
          lineCap: 'round' as CanvasLineCap,
          lineJoin: 'round' as CanvasLineJoin,
        };
      }
      case 'highlighter': {
        // Semi-transparent luminous highlighter with broad flat line
        let width = baseWidth * 3.8;
        if (altitudeAngle !== undefined && altitudeAngle < 0.65) {
          width *= 1.35;
        }
        return {
          width,
          color,
          alpha: 0.35,
          composite: 'source-over' as GlobalCompositeOperation,
          lineCap: 'square' as CanvasLineCap,
          lineJoin: 'bevel' as CanvasLineJoin,
        };
      }
      case 'eraser': {
        // Clean pixel eraser with adjustable area
        return {
          width: baseWidth * 4.5,
          color: 'rgba(0,0,0,1)',
          alpha: 1.0,
          composite: 'destination-out' as GlobalCompositeOperation,
          lineCap: 'round' as CanvasLineCap,
          lineJoin: 'round' as CanvasLineJoin,
        };
      }
      case 'pen':
      default: {
        // Smooth technical fineliner calibrated specifically for clean handwriting
        const speedDamping = Math.max(0.75, 1 - speed / 140);
        const width = Math.max(1.2, baseWidth * (0.5 + normPressure * 0.75) * speedDamping);
        return {
          width,
          color,
          alpha: 1.0,
          composite: 'source-over' as GlobalCompositeOperation,
          lineCap: 'round' as CanvasLineCap,
          lineJoin: 'round' as CanvasLineJoin,
        };
      }
    }
  };

  // Check if stroke resembles a straight line or basic geometric shape
  const trySnapShape = (points: StrokePoint[]) => {
    if (points.length < 5 || (!snapShapes && !calibration.snapShapes) || activeTool === 'eraser')
      return false;

    const start = points[0];
    const end = points[points.length - 1];
    if (!start || !end) return false;

    const directDist = Math.hypot(end.x - start.x, end.y - start.y);
    if (directDist < 15) return false;

    let totalPathDist = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (prev && curr) {
        totalPathDist += Math.hypot(curr.x - prev.x, curr.y - prev.y);
      }
    }

    // Straight Line recognition: direct path distance vs accumulated curve distance is >86%
    const straightness = directDist / Math.max(1, totalPathDist);
    if (straightness > 0.86) {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx || !beforeStrokeSnapshotRef.current) return false;

      // Restore clean snapshot before stroke started
      ctx.putImageData(beforeStrokeSnapshotRef.current, 0, 0);

      // Draw crisp snapped straight line
      const props = getToolProperties(activeTool, 0.7, strokeWidth, activeColor);
      ctx.save();
      ctx.globalCompositeOperation = props.composite;
      ctx.globalAlpha = props.alpha;
      ctx.lineWidth = props.width;
      ctx.strokeStyle = props.color;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();

      isSnappedShapeRef.current = true;
      return true;
    }

    return false;
  };

  // Draw segment between stroke points using Catmull-Rom / Quadratic Bezier smoothing
  const drawSegment = (
    ctx: CanvasRenderingContext2D,
    p1: StrokePoint,
    p2: StrokePoint,
    p0?: StrokePoint
  ) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const avgPressure = (p1.pressure + p2.pressure) / 2;

    const props = getToolProperties(
      activeTool,
      avgPressure,
      strokeWidth,
      activeColor,
      dx,
      dy,
      p2.tiltX,
      p2.tiltY,
      p2.altitudeAngle
    );

    ctx.save();
    ctx.globalCompositeOperation = props.composite;
    ctx.globalAlpha = props.alpha;
    ctx.lineWidth = props.width;
    ctx.strokeStyle = props.color;
    ctx.lineCap = props.lineCap;
    ctx.lineJoin = props.lineJoin;

    ctx.beginPath();
    if (p0 && calibration.smoothing !== 'off') {
      // Smooth midpoint quadratic spline for natural handwriting curves
      const tension = calibration.smoothing === 'studio' ? 0.6 : 0.5;
      const mid1X = p0.x * (1 - tension) + p1.x * tension;
      const mid1Y = p0.y * (1 - tension) + p1.y * tension;
      const mid2X = p1.x * (1 - tension) + p2.x * tension;
      const mid2Y = p1.y * (1 - tension) + p2.y * tension;
      ctx.moveTo(mid1X, mid1Y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2X, mid2Y);
    } else {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Pointer Down (Apple Pencil, Touch, Mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If touched with Apple Pencil and not yet in sketch mode, auto-activate if directPencilInking is on
    if (!isSketchMode) {
      if (e.pointerType === 'pen' && calibration.directPencilInking) {
        onActivateSketchMode?.();
      } else {
        return;
      }
    }

    // iPad Palm rejection & multi-touch handling
    if (e.pointerType === 'pen') {
      setIsApplePencilDetected(true);
      lastPencilTimeRef.current = Date.now();
    } else if (e.pointerType === 'touch') {
      activeTouchPointsRef.current.set(e.pointerId, {
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
      });
      maxSketchTouchesRef.current = Math.max(
        maxSketchTouchesRef.current,
        activeTouchPointsRef.current.size
      );

      // Palm rejection: filter wide palm contacts
      const isLargeContact = (e.width && e.width > 24) || (e.height && e.height > 24);
      const isPalmRejectionActive = palmRejection && calibration.palmRejection;
      if (isPalmRejectionActive && isLargeContact) {
        return;
      }

      // If Apple Pencil was active recently, reject single-finger drawing strokes
      if (
        isPalmRejectionActive &&
        isApplePencilDetected &&
        Date.now() - lastPencilTimeRef.current < 2500
      ) {
        return;
      }

      // If user has 2 or more fingers down, don't ink — this is an undo/redo gesture
      if (activeTouchPointsRef.current.size >= 2) {
        return;
      }
    }

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Capture state for undo
    saveSnapshotForUndo();

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    beforeStrokeSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    isSnappedShapeRef.current = false;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : e.pointerType === 'pen' ? 0.5 : 0.6;
    const tiltX = (e as any).tiltX || 0;
    const tiltY = (e as any).tiltY || 0;
    const nativeEvt = e.nativeEvent as any;
    const altitudeAngle = typeof nativeEvt?.altitudeAngle === 'number' ? nativeEvt.altitudeAngle : undefined;
    const azimuthAngle = typeof nativeEvt?.azimuthAngle === 'number' ? nativeEvt.azimuthAngle : undefined;

    const startPoint: StrokePoint = {
      x,
      y,
      pressure,
      tiltX,
      tiltY,
      altitudeAngle,
      azimuthAngle,
      time: Date.now(),
    };

    isDrawingRef.current = true;
    strokePointsRef.current = [startPoint];
    lastDrawnIndexRef.current = 0;

    // Draw single dot on touch down
    const props = getToolProperties(
      activeTool,
      pressure,
      strokeWidth,
      activeColor,
      0,
      0,
      tiltX,
      tiltY,
      altitudeAngle
    );
    ctx.save();
    ctx.globalCompositeOperation = props.composite;
    ctx.globalAlpha = props.alpha;
    ctx.fillStyle = props.color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, props.width / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Pointer Move (with 120Hz Coalesced Events support for ProMotion iPad)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Update hover position for Apple Pencil hover indicator
    if (isSketchMode && calibration.pencilHoverPreview) {
      setHoverPosition({
        x: currentX,
        y: currentY,
        pressure: e.pressure,
      });
    }

    if (!isDrawingRef.current || !isSketchMode) return;

    // Palm rejection check
    const isPalmRejectionActive = palmRejection && calibration.palmRejection;
    if (
      isPalmRejectionActive &&
      isApplePencilDetected &&
      e.pointerType === 'touch' &&
      Date.now() - lastPencilTimeRef.current < 2500
    ) {
      return;
    }

    if (e.pointerType === 'touch' && activeTouchPointsRef.current.size >= 2) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Extract all coalesced events if supported (iPad ProMotion 120Hz)
    const nativeEvent = e.nativeEvent as any;
    const use120Hz = calibration.proMotion120Hz;
    const events: Array<{
      clientX: number;
      clientY: number;
      pressure?: number;
      tiltX?: number;
      tiltY?: number;
      altitudeAngle?: number;
      azimuthAngle?: number;
    }> =
      use120Hz &&
      typeof nativeEvent?.getCoalescedEvents === 'function' &&
      nativeEvent.getCoalescedEvents().length > 0
        ? nativeEvent.getCoalescedEvents()
        : [e];

    for (const evt of events) {
      const rawX = evt.clientX - rect.left;
      const rawY = evt.clientY - rect.top;
      const pressure = evt.pressure && evt.pressure > 0 ? evt.pressure : e.pointerType === 'pen' ? 0.5 : 0.6;
      const tiltX = evt.tiltX || 0;
      const tiltY = evt.tiltY || 0;
      const altitudeAngle = typeof evt.altitudeAngle === 'number' ? evt.altitudeAngle : undefined;
      const azimuthAngle = typeof evt.azimuthAngle === 'number' ? evt.azimuthAngle : undefined;

      // Apply streamline smoothing filter
      let smoothedX = rawX;
      let smoothedY = rawY;
      const pts = strokePointsRef.current;
      if (pts.length > 0 && calibration.smoothing !== 'off') {
        const lastPt = pts[pts.length - 1];
        if (lastPt) {
          const factor = calibration.smoothing === 'studio' ? 0.45 : 0.25;
          smoothedX = lastPt.x * factor + rawX * (1 - factor);
          smoothedY = lastPt.y * factor + rawY * (1 - factor);
        }
      }

      const newPoint: StrokePoint = {
        x: smoothedX,
        y: smoothedY,
        pressure,
        tiltX,
        tiltY,
        altitudeAngle,
        azimuthAngle,
        time: Date.now(),
      };

      strokePointsRef.current.push(newPoint);
    }

    // Draw all pending points with smooth bezier curves
    const points = strokePointsRef.current;
    while (lastDrawnIndexRef.current < points.length - 1) {
      const idx = lastDrawnIndexRef.current;
      const p1 = points[idx];
      const p2 = points[idx + 1];
      const p0 = idx > 0 ? points[idx - 1] : undefined;

      if (p1 && p2) {
        drawSegment(ctx, p1, p2, p0);
      }
      lastDrawnIndexRef.current++;
    }

    // Reset Smart Shape Hold Timer
    if (shapeHoldTimerRef.current) {
      clearTimeout(shapeHoldTimerRef.current);
    }

    if ((snapShapes || calibration.snapShapes) && !isSnappedShapeRef.current) {
      shapeHoldTimerRef.current = setTimeout(() => {
        if (isDrawingRef.current) {
          trySnapShape(strokePointsRef.current);
        }
      }, 420);
    }
  };

  // Pointer Up / End
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (shapeHoldTimerRef.current) {
      clearTimeout(shapeHoldTimerRef.current);
      shapeHoldTimerRef.current = null;
    }

    // Process touch gesture endings (2-finger tap = Undo, 3-finger tap = Redo)
    if (e.pointerType === 'touch') {
      activeTouchPointsRef.current.delete(e.pointerId);

      if (activeTouchPointsRef.current.size === 0) {
        const touchCount = maxSketchTouchesRef.current;
        if (calibration.twoFingerUndo) {
          if (touchCount === 2) {
            handleUndo();
            showGestureToast('Ångrade ändring (2 fingrar) ↩️');
          } else if (touchCount === 3) {
            handleRedo();
            showGestureToast('Gjorde om ändring (3 fingrar) ↪️');
          }
        }
        maxSketchTouchesRef.current = 0;
      }
    }

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
    strokePointsRef.current = [];
    lastDrawnIndexRef.current = 0;
    beforeStrokeSnapshotRef.current = null;

    commitCanvasToState();
  };

  return (
    <div
      ref={containerRef}
      id={`sketch-container-${noteId}`}
      className="absolute inset-0 z-20 flex flex-col pointer-events-none"
    >
      {/* Floating Apple Pencil Pro Stylus Palette (When in active Sketch Mode) */}
      {isSketchMode && (
        <div
          id={`sketch-toolbar-${noteId}`}
          data-no-drag="true"
          className="pointer-events-auto shrink-0 flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-900/95 text-white backdrop-blur-xl rounded-t-2xl border-b border-white/10 shadow-2xl select-none animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tool Arsenal: Pen, Pencil, Calligraphy, Highlighter, Eraser */}
          <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/10">
            {/* 1. Fineliner Pen */}
            <button
              type="button"
              id={`btn-tool-pen-${noteId}`}
              onClick={() => setActiveTool('pen')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                activeTool === 'pen'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm scale-105'
                  : 'text-white/80 hover:bg-white/15 active:scale-95'
              }`}
              title="Fineliner / Handskrift (Skarp & kalibrerad bläckpenna)"
              aria-label="Bläckpenna"
            >
              <PenTool className="h-4 w-4" />
            </button>

            {/* 2. Graphite Pencil */}
            <button
              type="button"
              id={`btn-tool-pencil-${noteId}`}
              onClick={() => setActiveTool('pencil')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                activeTool === 'pencil'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm scale-105'
                  : 'text-white/80 hover:bg-white/15 active:scale-95'
              }`}
              title="Blyertspenna (Tryck- & lutningskänslig grafit)"
              aria-label="Blyertspenna"
            >
              <Pencil className="h-4 w-4" />
            </button>

            {/* 3. Calligraphy / Fountain */}
            <button
              type="button"
              id={`btn-tool-fountain-${noteId}`}
              onClick={() => setActiveTool('fountain')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                activeTool === 'fountain'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm scale-105'
                  : 'text-white/80 hover:bg-white/15 active:scale-95'
              }`}
              title="Kalligrafi / Reservoarpenna (Dynamisk spetsvinkel)"
              aria-label="Kalligrafipenna"
            >
              <Feather className="h-4 w-4" />
            </button>

            {/* 4. Highlighter */}
            <button
              type="button"
              id={`btn-tool-highlighter-${noteId}`}
              onClick={() => setActiveTool('highlighter')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm scale-105'
                  : 'text-white/80 hover:bg-white/15 active:scale-95'
              }`}
              title="Överstrykningspenna (Ljus & transparent markör)"
              aria-label="Överstrykningspenna"
            >
              <Highlighter className="h-4 w-4" />
            </button>

            {/* 5. Eraser */}
            <button
              type="button"
              id={`btn-tool-eraser-${noteId}`}
              onClick={() => setActiveTool('eraser')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                activeTool === 'eraser'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm scale-105'
                  : 'text-white/80 hover:bg-white/15 active:scale-95'
              }`}
              title="Suddgummi (Dubbeltryck för att växla)"
              aria-label="Suddgummi"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>

          {/* Color Palette (When not erasing) */}
          {activeTool !== 'eraser' && (
            <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/10">
              {INK_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  id={`btn-color-${c.id}-${noteId}`}
                  onClick={() => setActiveColor(c.value)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg active:scale-95 transition-transform"
                  title={c.label}
                  aria-label={c.label}
                >
                  <span
                    className={`h-4 w-4 rounded-full border border-white/50 shadow-xs transition-transform ${
                      activeColor === c.value
                        ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 scale-125'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-0.5 bg-white/10 p-0.5 rounded-xl border border-white/10">
            {[
              { size: 1.5, label: 'Fin (1.5px)' },
              { size: 3, label: 'Medium (3px)' },
              { size: 6, label: 'Bred (6px)' },
              { size: 10, label: 'Fet (10px)' },
            ].map(({ size, label }) => (
              <button
                key={size}
                type="button"
                id={`btn-stroke-${size}-${noteId}`}
                onClick={() => setStrokeWidth(size)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                  strokeWidth === size ? 'bg-white/25 shadow-xs ring-1 ring-white/30' : 'hover:bg-white/10'
                }`}
                title={`Tjocklek: ${label}`}
                aria-label={label}
              >
                <span
                  className="rounded-full bg-white shadow-xs"
                  style={{
                    width: `${Math.min(16, size + 3)}px`,
                    height: `${Math.min(16, size + 3)}px`,
                  }}
                />
              </button>
            ))}
          </div>

          {/* Advanced Stylus Toggles: Calibration, Smart Shapes, Palm Rejection & Guides */}
          <div className="flex items-center gap-1">
            {/* Direct Stylus Calibration Button */}
            <button
              type="button"
              id={`btn-open-calibration-${noteId}`}
              onClick={() => setShowCalibrationModal(true)}
              className="flex h-7 px-2 items-center gap-1.5 rounded-lg text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30 active:scale-95 transition-all cursor-pointer"
              title="Kalibrera pennans tryckkänslighet, handskriftsjämnhet och spetsrespons"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Kalibrera</span>
            </button>

            {/* Smart Shapes (Hold for straight line) toggle */}
            <button
              type="button"
              id={`btn-toggle-shapes-${noteId}`}
              onClick={() => setSnapShapes((prev) => !prev)}
              className={`flex h-7 px-1.5 items-center gap-1 rounded-lg text-[11px] font-medium transition-all ${
                snapShapes
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-white/60 hover:bg-white/10'
              }`}
              title={snapShapes ? 'Smarta former aktivt: Håll i slutet av ett streck för rak linje' : 'Smarta former inaktivt'}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Former</span>
            </button>

            {/* Palm Rejection Toggle */}
            <button
              type="button"
              id={`btn-toggle-palm-${noteId}`}
              onClick={() => setPalmRejection((prev) => !prev)}
              className={`flex h-7 px-1.5 items-center gap-1 rounded-lg text-[11px] font-medium transition-all ${
                palmRejection
                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                  : 'text-white/60 hover:bg-white/10'
              }`}
              title={palmRejection ? 'Handflatsavvisning: Avvisar oavsiktliga handflatsberöringar' : 'Handflatsavvisning inaktiv'}
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Handflata</span>
            </button>

            {/* Background Writing Guides (Blank, Dots, Grid, Lines) */}
            <button
              type="button"
              id={`btn-toggle-guide-${noteId}`}
              onClick={() => {
                const order: GuidePatternType[] = ['none', 'dots', 'grid', 'lines'];
                const nextIdx = (order.indexOf(guidePattern) + 1) % order.length;
                setGuidePattern(order[nextIdx] || 'none');
              }}
              className={`flex h-7 px-1.5 items-center gap-1 rounded-lg text-[11px] font-medium transition-all ${
                guidePattern !== 'none'
                  ? 'bg-sky-400/20 text-sky-300 border border-sky-400/40'
                  : 'text-white/60 hover:bg-white/10'
              }`}
              title={`Pappersguide: ${guidePattern === 'dots' ? 'Prickat' : guidePattern === 'grid' ? 'Rutnät' : guidePattern === 'lines' ? 'Linjerat' : 'Blankt'}`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {guidePattern === 'none' ? 'Linjer' : guidePattern === 'dots' ? 'Prick' : guidePattern === 'grid' ? 'Rut' : 'Linje'}
              </span>
            </button>
          </div>

          {/* Action Tools: Undo, Redo, Clear, Export & Done */}
          <div className="flex items-center gap-1 border-l border-white/15 pl-1.5 ml-auto">
            {isApplePencilDetected && (
              <span
                className="hidden lg:inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono font-semibold"
                title="Apple Pencil ansluten & aktiv med 120Hz ProMotion"
              >
                ✏️ Apple Pencil
              </span>
            )}

            {/* Undo */}
            <button
              type="button"
              id={`btn-undo-stroke-${noteId}`}
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-25 active:scale-95 transition-all"
              title="Ångra pennstreck (Ctrl+Z)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Redo */}
            <button
              type="button"
              id={`btn-redo-stroke-${noteId}`}
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-25 active:scale-95 transition-all"
              title="Gör om pennstreck (Ctrl+Y)"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>

            {/* Clear All */}
            {hasContent && (
              <button
                type="button"
                id={`btn-clear-drawing-${noteId}`}
                onClick={handleClearDrawing}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
                title="Rensa hela skissen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Export sketch PNG */}
            {hasContent && (
              <button
                type="button"
                id={`btn-export-sketch-${noteId}`}
                onClick={handleExportSketch}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 active:scale-95 transition-all"
                title="Ladda ner skiss som PNG"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Finish sketch mode */}
            <button
              type="button"
              id={`btn-close-sketch-${noteId}`}
              onClick={onCloseSketchMode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all ml-1 cursor-pointer"
              title="Spara skiss och återgå till lappen"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Klar</span>
            </button>
          </div>
        </div>
      )}

      {/* Writing Guide Paper Overlays (Dots, Grid, Ruled lines) */}
      {isSketchMode && guidePattern !== 'none' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{
            top: '48px',
            backgroundImage:
              guidePattern === 'dots'
                ? 'radial-gradient(#000000 0.8px, transparent 0.8px)'
                : guidePattern === 'grid'
                ? 'linear-gradient(to right, rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px)'
                : 'linear-gradient(to bottom, transparent 23px, rgba(0,0,0,0.15) 24px)',
            backgroundSize:
              guidePattern === 'dots'
                ? '16px 16px'
                : guidePattern === 'grid'
                ? '20px 20px'
                : '100% 24px',
          }}
        />
      )}

      {/* Freehand Apple Pencil & Touch Canvas Layer */}
      <canvas
        ref={canvasRef}
        id={`sketch-canvas-${noteId}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setHoverPosition(null)}
        style={{
          touchAction: 'none',
        }}
        className={`w-full h-full flex-1 ${
          isSketchMode
            ? 'pointer-events-auto cursor-crosshair'
            : 'pointer-events-none opacity-95'
        }`}
      />

      {/* Floating iPad Pro Gesture Notification Badge */}
      {gestureToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5 border border-white/15">
          <span>{gestureToast}</span>
        </div>
      )}

      {/* Live Apple Pencil Hover Cursor Indicator */}
      {isSketchMode && calibration.pencilHoverPreview && hoverPosition && !isDrawingRef.current && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 shadow-xs transition-opacity duration-75"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
            width: `${Math.max(6, activeTool === 'highlighter' ? strokeWidth * 3.8 : activeTool === 'eraser' ? strokeWidth * 4.5 : strokeWidth * 1.5)}px`,
            height: `${Math.max(6, activeTool === 'highlighter' ? strokeWidth * 3.8 : activeTool === 'eraser' ? strokeWidth * 4.5 : strokeWidth * 1.5)}px`,
            backgroundColor: activeTool === 'eraser' ? 'rgba(255,255,255,0.4)' : activeColor,
            opacity: 0.75,
          }}
        />
      )}

      {/* Stylus & Freehand Calibration Modal */}
      {showCalibrationModal && (
        <StylusCalibrationModal
          isOpen={showCalibrationModal}
          onClose={() => setShowCalibrationModal(false)}
          settings={calibration}
          onSaveSettings={(newSettings) => setCalibration(newSettings)}
        />
      )}
    </div>
  );
};

