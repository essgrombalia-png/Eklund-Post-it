import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  Check,
  Sliders,
  Ratio,
  ArrowRight,
} from 'lucide-react';
import {
  PostItNote,
  MIN_NOTE_WIDTH,
  MIN_NOTE_HEIGHT,
  MAX_NOTE_WIDTH,
  MAX_NOTE_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
} from '../types';

interface PostItSizeModalProps {
  note: PostItNote;
  isOpen: boolean;
  onClose: () => void;
  onApplySize: (width: number, height: number) => void;
}

interface SizePreset {
  id: string;
  name: string;
  desc: string;
  icon: string;
  width: number;
  height: number;
}

const PRESETS: SizePreset[] = [
  {
    id: 'standard',
    name: 'Standard Kvadrat',
    desc: 'Klassisk Post-it storlek',
    icon: '📌',
    width: 290,
    height: 280,
  },
  {
    id: 'mini',
    name: 'Kompakt / Mini',
    desc: 'Etikett, tag eller kort memo',
    icon: '🏷️',
    width: 180,
    height: 160,
  },
  {
    id: 'tall',
    name: 'Lång Att-göra-lista',
    desc: 'Optimal för punktlistor',
    icon: '📋',
    width: 260,
    height: 450,
  },
  {
    id: 'banner',
    name: 'Bred Banner / Header',
    desc: 'Översiktsrubrik eller tidslinje',
    icon: '📰',
    width: 500,
    height: 220,
  },
  {
    id: 'sketch',
    name: 'Ritbord & Skiss',
    desc: 'Generös yta för Apple Pencil',
    icon: '🎨',
    width: 540,
    height: 480,
  },
  {
    id: 'large',
    name: 'Widescreen Canvas',
    desc: 'Stor arbetsyta och brainstorming',
    icon: '🖥️',
    width: 760,
    height: 480,
  },
];

export const PostItSizeModal: React.FC<PostItSizeModalProps> = ({
  note,
  isOpen,
  onClose,
  onApplySize,
}) => {
  const [width, setWidth] = useState<number>(note.width);
  const [height, setHeight] = useState<number>(note.height);
  const [lockRatio, setLockRatio] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<number>(note.width / note.height);

  useEffect(() => {
    if (isOpen) {
      setWidth(note.width);
      setHeight(note.height);
      setAspectRatio(note.width / note.height);
    }
  }, [isOpen, note.width, note.height]);

  if (!isOpen) return null;

  const handleWidthChange = (newWidth: number) => {
    const clampedWidth = Math.min(MAX_NOTE_WIDTH, Math.max(MIN_NOTE_WIDTH, Math.round(newWidth)));
    setWidth(clampedWidth);

    if (lockRatio) {
      const newHeight = Math.min(
        MAX_NOTE_HEIGHT,
        Math.max(MIN_NOTE_HEIGHT, Math.round(clampedWidth / aspectRatio))
      );
      setHeight(newHeight);
    }
  };

  const handleHeightChange = (newHeight: number) => {
    const clampedHeight = Math.min(
      MAX_NOTE_HEIGHT,
      Math.max(MIN_NOTE_HEIGHT, Math.round(newHeight))
    );
    setHeight(clampedHeight);

    if (lockRatio) {
      const newWidth = Math.min(
        MAX_NOTE_WIDTH,
        Math.max(MIN_NOTE_WIDTH, Math.round(clampedHeight * aspectRatio))
      );
      setWidth(newWidth);
    }
  };

  const toggleLockRatio = () => {
    if (!lockRatio) {
      setAspectRatio(width / height);
      setLockRatio(true);
    } else {
      setLockRatio(false);
    }
  };

  const applyPreset = (preset: SizePreset) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setAspectRatio(preset.width / preset.height);
  };

  const autoFitContent = () => {
    // Calculate approximate height based on note content length and line breaks
    const text = note.content || '';
    const lineCount = (text.match(/\n/g) || []).length + 1;
    const charCount = text.length;
    const estimatedTextLines = Math.max(lineCount, Math.ceil(charCount / 32));
    const baseHeaderFooterHeight = 90;
    const estimatedLineHeight = note.fontSize === 'lg' ? 28 : note.fontSize === 'sm' ? 20 : 24;
    const contentHeight = estimatedTextLines * estimatedLineHeight;
    const hasPhoto = Boolean(note.imageUrl);
    const photoHeight = hasPhoto ? 160 : 0;
    const calculatedHeight = Math.min(
      MAX_NOTE_HEIGHT,
      Math.max(MIN_NOTE_HEIGHT, baseHeaderFooterHeight + contentHeight + photoHeight + 40)
    );

    setHeight(Math.round(calculatedHeight));
    if (lockRatio) {
      setAspectRatio(width / calculatedHeight);
    }
  };

  const handleSave = () => {
    onApplySize(width, height);
    onClose();
  };

  const currentRatio = (width / height).toFixed(2);
  const ratioLabel =
    Math.abs(width - height) < 15
      ? '1:1 (Kvadrat)'
      : width > height
      ? `${currentRatio}:1 (Liggande)`
      : `1:${(height / width).toFixed(2)} (Stående)`;

  return (
    <div
      id="modal-postit-size"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-700 dark:text-amber-400">
              <Maximize2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Storlek & Dimensioner</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-mono">
                  {width} × {height} px
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Full kontroll över lappens bredd och höjd
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-note-scrollbar">
          {/* Proportional Preview & Dimension Info */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
            {/* Visual Mini Box representing aspect ratio */}
            <div className="w-24 h-20 bg-slate-200/70 dark:bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 border border-slate-300/60 dark:border-zinc-700">
              <div
                className="bg-amber-400 dark:bg-amber-500 rounded-md shadow-xs border border-amber-500 transition-all duration-150 flex items-center justify-center text-[9px] font-bold text-slate-950 font-mono"
                style={{
                  width: `${Math.max(24, Math.min(80, (width / Math.max(width, height)) * 80))}px`,
                  height: `${Math.max(20, Math.min(64, (height / Math.max(width, height)) * 64))}px`,
                }}
              >
                {Math.round(width)}×{Math.round(height)}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <span>Proportion</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">{ratioLabel}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Tillåtna gränser: {MIN_NOTE_WIDTH}–{MAX_NOTE_WIDTH}px bredd, {MIN_NOTE_HEIGHT}–{MAX_NOTE_HEIGHT}px höjd.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={toggleLockRatio}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    lockRatio
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                  }`}
                >
                  {lockRatio ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  <span>{lockRatio ? 'Låsta proportioner' : 'Lås proportioner'}</span>
                </button>

                <button
                  type="button"
                  onClick={autoFitContent}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                  title="Beräknar höjden automatiskt baserat på textens längd"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Auto-passa innehåll</span>
                </button>
              </div>
            </div>
          </div>

          {/* Width & Height Steppers & Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Width Control */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Bredd (X)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleWidthChange(width - 20)}
                    className="h-6 w-6 rounded-md bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 text-xs font-bold flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={MIN_NOTE_WIDTH}
                    max={MAX_NOTE_WIDTH}
                    value={width}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="w-16 text-center font-mono text-xs font-bold py-1 px-1.5 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleWidthChange(width + 20)}
                    className="h-6 w-6 rounded-md bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 text-xs font-bold flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">px</span>
                </div>
              </div>

              <input
                type="range"
                min={MIN_NOTE_WIDTH}
                max={MAX_NOTE_WIDTH}
                step={10}
                value={width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{MIN_NOTE_WIDTH}px</span>
                <span className="text-slate-600 dark:text-zinc-300 font-semibold">{width}px</span>
                <span>{MAX_NOTE_WIDTH}px</span>
              </div>
            </div>

            {/* Height Control */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Höjd (Y)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleHeightChange(height - 20)}
                    className="h-6 w-6 rounded-md bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 text-xs font-bold flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={MIN_NOTE_HEIGHT}
                    max={MAX_NOTE_HEIGHT}
                    value={height}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="w-16 text-center font-mono text-xs font-bold py-1 px-1.5 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleHeightChange(height + 20)}
                    className="h-6 w-6 rounded-md bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 text-xs font-bold flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">px</span>
                </div>
              </div>

              <input
                type="range"
                min={MIN_NOTE_HEIGHT}
                max={MAX_NOTE_HEIGHT}
                step={10}
                value={height}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{MIN_NOTE_HEIGHT}px</span>
                <span className="text-slate-600 dark:text-zinc-300 font-semibold">{height}px</span>
                <span>{MAX_NOTE_HEIGHT}px</span>
              </div>
            </div>
          </div>

          {/* Quick Presets Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Format & Snabbval
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRESETS.map((preset) => {
                const isSelected =
                  Math.abs(width - preset.width) < 10 && Math.abs(height - preset.height) < 10;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 ring-1 ring-amber-500/50 shadow-xs'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{preset.icon}</span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-400">
                        {preset.width}×{preset.height}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-800 dark:text-white truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-400 truncate mt-0.5">
                      {preset.desc}
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 absolute top-2.5 right-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => {
              setWidth(DEFAULT_NOTE_WIDTH);
              setHeight(DEFAULT_NOTE_HEIGHT);
              setAspectRatio(DEFAULT_NOTE_WIDTH / DEFAULT_NOTE_HEIGHT);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Återställ standard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md active:scale-95 transition-all"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Tillämpa storlek</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
