import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Shield,
  RotateCcw,
  Check,
  X,
  PenTool,
  Feather,
  Pencil,
  Eye,
  Activity,
  Zap,
} from 'lucide-react';
import {
  StylusCalibrationSettings,
  DEFAULT_STYLUS_CALIBRATION,
  PressureCurveType,
  SmoothingLevelType,
} from '../types';

interface StylusCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StylusCalibrationSettings;
  onSaveSettings: (newSettings: StylusCalibrationSettings) => void;
}

export const StylusCalibrationModal: React.FC<StylusCalibrationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [current, setCurrent] = useState<StylusCalibrationSettings>(settings);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingTestRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number; pressure: number } | null>(null);
  const [livePressure, setLivePressure] = useState<number>(0);

  useEffect(() => {
    setCurrent(settings);
  }, [settings, isOpen]);

  // Handle live test pad rendering
  useEffect(() => {
    if (!isOpen) return;
    const canvas = testCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const calculateCalibratedPressure = (rawP: number): number => {
    const raw = Math.max(0.05, Math.min(1.0, rawP));
    switch (current.pressureCurve) {
      case 'soft':
        return Math.min(1.0, Math.pow(raw, 0.55) * current.pressureSensitivity);
      case 'firm':
        return Math.min(1.0, Math.pow(raw, 1.8) * current.pressureSensitivity);
      case 'fixed':
        return 0.7;
      case 'balanced':
      default:
        return Math.min(1.0, Math.pow(raw, 1.2) * current.pressureSensitivity);
    }
  };

  const clearTestCanvas = () => {
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setLivePressure(0);
  };

  const handleTestPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rawP = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    const p = calculateCalibratedPressure(rawP);
    setLivePressure(rawP);

    isDrawingTestRef.current = true;
    lastPointRef.current = { x, y, pressure: p };

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, p * 4), 0, Math.PI * 2);
    ctx.fill();
  };

  const handleTestPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingTestRef.current || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rawP = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    const p = calculateCalibratedPressure(rawP);
    setLivePressure(rawP);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tension =
      current.smoothing === 'studio' ? 0.65 : current.smoothing === 'smooth' ? 0.35 : 0.05;
    const smoothedX = lastPointRef.current.x * tension + x * (1 - tension);
    const smoothedY = lastPointRef.current.y * tension + y * (1 - tension);

    ctx.save();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1.5, p * 6);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(smoothedX, smoothedY);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = { x: smoothedX, y: smoothedY, pressure: p };
  };

  const handleTestPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingTestRef.current = false;
    lastPointRef.current = null;
    const canvas = testCanvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleSaveAndApply = () => {
    onSaveSettings(current);
    try {
      localStorage.setItem('postit_stylus_calibration', JSON.stringify(current));
    } catch {
      // ignore
    }
    onClose();
  };

  const handleResetDefaults = () => {
    setCurrent(DEFAULT_STYLUS_CALIBRATION);
  };

  return (
    <div
      id="modal-stylus-calibration-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="modal-stylus-calibration"
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Kalibrering av Skiss & Handskrift
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Finjustera tryckkurva, linjestabilisering och Apple Pencil-känsla
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-stylus-calibration"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-note-scrollbar">
          {/* 1. Tryckkänslighet & Kurva */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Tryckkänslighetskurva</span>
              <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400 font-mono">
                {current.pressureCurve === 'soft'
                  ? 'Mjuk (Lätt hand)'
                  : current.pressureCurve === 'firm'
                  ? 'Fast (Kräver tryck)'
                  : current.pressureCurve === 'fixed'
                  ? 'Fast linjetjocklek'
                  : 'Balanserad (Naturlig)'}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'soft', title: 'Mjuk', desc: 'Lätt handstil' },
                { id: 'balanced', title: 'Balanserad', desc: 'Standard / iPad' },
                { id: 'firm', title: 'Fast', desc: 'Bestämt tryck' },
                { id: 'fixed', title: 'Fast linje', desc: 'Monoline / Fineliner' },
              ].map((curve) => (
                <button
                  key={curve.id}
                  type="button"
                  id={`btn-curve-${curve.id}`}
                  onClick={() =>
                    setCurrent((prev) => ({
                      ...prev,
                      pressureCurve: curve.id as PressureCurveType,
                    }))
                  }
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    current.pressureCurve === curve.id
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-500/10 text-slate-900 dark:text-white shadow-xs ring-1 ring-amber-500/40'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-300'
                  }`}
                >
                  <p className="font-semibold text-xs">{curve.title}</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-0.5">{curve.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Linjeglättning & Handskriftsstabilisering */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Linjestabilisering & Handskrift</span>
              <span className="text-[11px] font-normal text-sky-600 dark:text-sky-400 font-mono">
                {current.smoothing === 'off'
                  ? 'Rå input (0ms)'
                  : current.smoothing === 'studio'
                  ? 'Studio (Hög jämnhet)'
                  : 'Mjuk (Rekommenderad)'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'off', title: 'Rå input', desc: 'Snabbaste respons' },
                { id: 'smooth', title: 'Mjuk skrift', desc: 'Anti-jitter / Handstil' },
                { id: 'studio', title: 'Studio', desc: 'Perfekta kurvor' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  id={`btn-smooth-${lvl.id}`}
                  onClick={() =>
                    setCurrent((prev) => ({
                      ...prev,
                      smoothing: lvl.id as SmoothingLevelType,
                    }))
                  }
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    current.smoothing === lvl.id
                      ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-500/10 text-slate-900 dark:text-white shadow-xs ring-1 ring-sky-500/40'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-300'
                  }`}
                >
                  <p className="font-semibold text-xs">{lvl.title}</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-0.5">{lvl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Känslighet & Flödesskala */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-zinc-300">Tryckmultiplikator</span>
              <span className="font-mono text-slate-500 dark:text-zinc-400">
                {current.pressureSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              id="slider-stylus-sensitivity"
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={current.pressureSensitivity}
              onChange={(e) =>
                setCurrent((prev) => ({
                  ...prev,
                  pressureSensitivity: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* 4. iPad Pro & Apple Pencil Specialinställningar */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              iPad Pro & Apple Pencil Optimeringar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Palm Rejection */}
              <div
                onClick={() => setCurrent((prev) => ({ ...prev, palmRejection: !prev.palmRejection }))}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">Handflatsavvisning</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-400">
                      Avvisar handloven mot skärmen
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.palmRejection}
                  onChange={() => {}}
                  className="accent-emerald-500 h-4 w-4 rounded pointer-events-none"
                />
              </div>

              {/* Direct Pencil Inking */}
              <div
                onClick={() =>
                  setCurrent((prev) => ({ ...prev, directPencilInking: !prev.directPencilInking }))
                }
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <PenTool className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">Direkt Pencil-ritning</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-400">
                      Aktivera skiss direkt vid pennkontakt
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.directPencilInking}
                  onChange={() => {}}
                  className="accent-amber-500 h-4 w-4 rounded pointer-events-none"
                />
              </div>

              {/* Two-finger Undo */}
              <div
                onClick={() =>
                  setCurrent((prev) => ({ ...prev, twoFingerUndo: !prev.twoFingerUndo }))
                }
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="h-4 w-4 text-sky-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">Fingersnabbval (Ångra/Gör om)</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-400">
                      2 fingrar = Ångra, 3 fingrar = Gör om
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.twoFingerUndo}
                  onChange={() => {}}
                  className="accent-sky-500 h-4 w-4 rounded pointer-events-none"
                />
              </div>

              {/* Apple Pencil Hover Preview */}
              <div
                onClick={() =>
                  setCurrent((prev) => ({ ...prev, pencilHoverPreview: !prev.pencilHoverPreview }))
                }
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="h-4 w-4 text-purple-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">Apple Pencil Hover</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-400">
                      Visar spetsens form vid svävning
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.pencilHoverPreview}
                  onChange={() => {}}
                  className="accent-purple-500 h-4 w-4 rounded pointer-events-none"
                />
              </div>

              {/* ProMotion 120Hz Coalesced Events */}
              <div
                onClick={() =>
                  setCurrent((prev) => ({ ...prev, proMotion120Hz: !prev.proMotion120Hz }))
                }
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">120Hz ProMotion</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-400">
                      Sub-pixel precision utan fördröjning
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.proMotion120Hz}
                  onChange={() => {}}
                  className="accent-emerald-500 h-4 w-4 rounded pointer-events-none"
                />
              </div>

              {/* Smart Shapes */}
              <div
                onClick={() => setCurrent((prev) => ({ ...prev, snapShapes: !prev.snapShapes }))}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">Smarta Raka Linjer</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-400">
                      Håll stilla för att snäppa linje
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.snapShapes}
                  onChange={() => {}}
                  className="accent-amber-500 h-4 w-4 rounded pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* 5. Live Test Pad / Kalibreringsscratchpad */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <PenTool className="h-3.5 w-3.5 text-amber-500" />
                Provskriv & Testa Kalibrering
              </span>
              <div className="flex items-center gap-2">
                {livePressure > 0 && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                    Tryck: {Math.round(livePressure * 100)}%
                  </span>
                )}
                <button
                  type="button"
                  id="btn-clear-test-canvas"
                  onClick={clearTestCanvas}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 underline transition-colors"
                >
                  Rensa testruta
                </button>
              </div>
            </div>

            <div className="relative h-32 w-full rounded-2xl border border-slate-300 dark:border-zinc-700 overflow-hidden bg-slate-50 shadow-inner">
              <canvas
                ref={testCanvasRef}
                onPointerDown={handleTestPointerDown}
                onPointerMove={handleTestPointerMove}
                onPointerUp={handleTestPointerUp}
                onPointerCancel={handleTestPointerUp}
                style={{ touchAction: 'none' }}
                className="w-full h-full cursor-crosshair"
              />
              <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-slate-400 select-none">
                Rita eller skriv här med penna / touch
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80">
          <button
            type="button"
            id="btn-reset-stylus-calibration"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Återställ standard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-cancel-calibration"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="button"
              id="btn-save-apply-calibration"
              onClick={handleSaveAndApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md active:scale-95 transition-all"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Spara & Tillämpa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
