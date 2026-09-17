import React from 'react';
import { RotateCcw, CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'undo';
  undoAction?: () => void;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div
      id="app-toast-notification"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-zinc-800/95 text-white shadow-2xl backdrop-blur-md border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-200 min-w-[280px] max-w-md justify-between"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {toast.type === 'undo' ? (
          <RotateCcw className="h-4 w-4 text-amber-400 shrink-0" />
        ) : (
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
        )}
        <span className="text-sm font-medium truncate">{toast.text}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {toast.undoAction && (
          <button
            id="btn-toast-undo"
            type="button"
            onClick={() => {
              toast.undoAction?.();
              onDismiss();
            }}
            className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs active:scale-95 transition-transform"
          >
            Ångra
          </button>
        )}
        <button
          id="btn-toast-dismiss"
          type="button"
          onClick={onDismiss}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white"
          aria-label="Stäng meddelande"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
