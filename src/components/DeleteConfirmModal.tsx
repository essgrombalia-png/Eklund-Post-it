import React from 'react';
import { PostItNote, COLOR_CONFIGS } from '../types';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  note: PostItNote | null;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  note,
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !note) return null;

  const colorConfig = COLOR_CONFIGS[note.color];
  const previewText = note.title || note.content.slice(0, 40) || 'Tom lapp';

  return (
    <div
      id="delete-confirm-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-modal-overlay bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        id="delete-confirm-dialog"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon button */}
        <button
          id="btn-close-modal"
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
          aria-label="Stäng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Flytta till papperskorgen?
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Lappen flyttas till <span className="font-semibold text-slate-800 dark:text-zinc-200">Papperskorgen</span> och sparas i 30 dagar innan den försvinner permanent. Du kan när som helst återställa den.
            </p>

            {/* Note preview pill */}
            <div className={`mt-3.5 flex items-center gap-2.5 rounded-lg px-3 py-2 border ${colorConfig.bgClass} ${colorConfig.borderClass}`}>
              <div className={`h-3 w-3 rounded-full ${colorConfig.swatchClass} shrink-0`} />
              <span className={`text-sm font-medium truncate ${colorConfig.textColorClass}`}>
                "{previewText}"
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons - large touch targets for iPad */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-98 transition-all"
          >
            Avbryt
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold shadow-md shadow-red-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Flytta till papperskorg
          </button>
        </div>
      </div>
    </div>
  );
};
