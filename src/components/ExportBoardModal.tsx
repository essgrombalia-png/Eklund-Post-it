import React, { useState } from 'react';
import { PostItNote, DeskTheme, DESK_THEMES } from '../types';
import { exportBoardToImage } from '../utils/exportBoardImage';
import { exportNotesToJson } from '../utils/storage';
import {
  Download,
  Image as ImageIcon,
  FileCode,
  Layers,
  Monitor,
  X,
  Check,
  Sparkles,
} from 'lucide-react';

interface ExportBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: PostItNote[];
  theme: DeskTheme;
  zoom: number;
  panOffset: { x: number; y: number };
}

export const ExportBoardModal: React.FC<ExportBoardModalProps> = ({
  isOpen,
  onClose,
  notes,
  theme,
  zoom,
  panOffset,
}) => {
  const [exportMode, setExportMode] = useState<'all_notes' | 'current_view'>('all_notes');
  const [isExporting, setIsExporting] = useState(false);
  const [hasExported, setHasExported] = useState(false);

  if (!isOpen) return null;

  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      await exportBoardToImage({
        notes,
        theme,
        mode: exportMode,
        zoom,
        panOffset,
      });
      setHasExported(true);
      setTimeout(() => setHasExported(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = () => {
    exportNotesToJson(notes);
    setHasExported(true);
    setTimeout(() => setHasExported(false), 3000);
  };

  return (
    <div
      id="export-board-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 safe-area-modal-overlay"
      onClick={onClose}
    >
      <div
        id="export-board-modal-content"
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 font-bold shadow-sm">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Exportera & Dela
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Ladda ner högupplöst bild eller säkerhetskopia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 block">
              Bildexport (Högupplöst PNG)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: All Notes */}
              <button
                type="button"
                id="btn-export-scope-all"
                onClick={() => setExportMode('all_notes')}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                  exportMode === 'all_notes'
                    ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/40 shadow-xs'
                    : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  {exportMode === 'all_notes' && (
                    <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <span className="font-bold text-xs">Hela skrivbordet</span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Alla {notes.length} lappar automatiskt inramade
                </span>
              </button>

              {/* Option 2: Current View */}
              <button
                type="button"
                id="btn-export-scope-view"
                onClick={() => setExportMode('current_view')}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                  exportMode === 'current_view'
                    ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/40 shadow-xs'
                    : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-400/20 text-sky-600 dark:text-sky-400">
                    <Monitor className="h-4 w-4" />
                  </div>
                  {exportMode === 'current_view' && (
                    <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <span className="font-bold text-xs">Nuvarande vy</span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Exakt utsnitt som visas på skärmen
                </span>
              </button>
            </div>
          </div>

          {/* Theme details badge */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
              <span className="text-base">{DESK_THEMES[theme]?.icon || '🎨'}</span>
              <span>Bakgrundstema: <strong>{DESK_THEMES[theme]?.name}</strong></span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
              2x Retina HD
            </span>
          </div>

          {/* Action button for PNG */}
          <button
            type="button"
            id="btn-confirm-export-image"
            onClick={handleExportPng}
            disabled={isExporting || notes.length === 0}
            className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-sm shadow-md active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            <ImageIcon className="h-4 w-4" />
            <span>
              {isExporting
                ? 'Skapar högupplöst bild...'
                : hasExported
                ? 'Bild nedladdad! ✨'
                : 'Ladda ner högupplöst PNG-bild'}
            </span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-zinc-800" />
            <span className="shrink-0 mx-3 text-[11px] uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              eller
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-zinc-800" />
          </div>

          {/* JSON Backup Export */}
          <button
            type="button"
            id="btn-export-backup-json"
            onClick={handleExportJson}
            disabled={notes.length === 0}
            className="flex w-full items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 text-slate-700 dark:text-zinc-200 font-semibold text-xs active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileCode className="h-4 w-4 text-emerald-600" />
            <span>Spara säkerhetskopia (JSON med alla ändringar & skisser)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
