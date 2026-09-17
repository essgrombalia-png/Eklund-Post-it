import React, { useState, useMemo } from 'react';
import { TrashNote, COLOR_CONFIGS } from '../types';
import {
  getDaysRemainingInTrash,
  formatDeletedDate,
} from '../utils/storage';
import {
  Trash2,
  RotateCcw,
  X,
  Clock,
  Search,
  AlertTriangle,
  PenTool,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface TrashModalProps {
  isOpen: boolean;
  trashNotes: TrashNote[];
  onClose: () => void;
  onRestoreNote: (note: TrashNote) => void;
  onRestoreAll: () => void;
  onPermanentlyDeleteNote: (noteId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  trashNotes,
  onClose,
  onRestoreNote,
  onRestoreAll,
  onPermanentlyDeleteNote,
  onEmptyTrash,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmPermanentId, setConfirmPermanentId] = useState<string | null>(null);

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return trashNotes;
    const q = searchQuery.toLowerCase().trim();
    return trashNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [trashNotes, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      id="trash-modal-overlay"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-modal-overlay bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        id="trash-modal-container"
        className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden text-slate-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Papperskorg</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  {trashNotes.length} {trashNotes.length === 1 ? 'lapp' : 'lappar'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Sparas automatiskt i 30 dagar innan de försvinner permanent
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {trashNotes.length > 0 && (
              <>
                <button
                  id="btn-restore-all-trash"
                  type="button"
                  onClick={onRestoreAll}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95 transition-all flex items-center gap-1.5"
                  title="Återställ alla lappar till skrivbordet"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Återställ alla</span>
                </button>

                {!confirmEmpty ? (
                  <button
                    id="btn-empty-trash"
                    type="button"
                    onClick={() => setConfirmEmpty(true)}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-95 transition-all flex items-center gap-1.5"
                    title="Töm alla lappar ur papperskorgen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Töm papperskorg</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/60 p-1 rounded-xl border border-red-200 dark:border-red-900/50 animate-in fade-in duration-150">
                    <span className="text-xs text-red-700 dark:text-red-300 font-medium px-2">Säkert?</span>
                    <button
                      id="btn-confirm-empty-trash"
                      type="button"
                      onClick={() => {
                        onEmptyTrash();
                        setConfirmEmpty(false);
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 active:scale-95 transition-all"
                    >
                      Ja, töm allt
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmEmpty(false)}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-semibold active:scale-95"
                    >
                      Avbryt
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              id="btn-close-trash-modal"
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              aria-label="Stäng papperskorg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search bar inside trash if > 2 notes */}
        {trashNotes.length > 2 && (
          <div className="px-5 sm:px-6 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <input
                id="input-search-trash"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök bland raderade lappar..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500/50 placeholder-slate-400 dark:placeholder-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notes List Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {trashNotes.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 mb-4">
                <Trash2 className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
                Papperskorgen är tom
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                När du raderar lappar från skrivbordet sparas de tryggt här i 30 dagar innan de försvinner permanent. Du kan när som helst återställa dem.
              </p>
            </div>
          ) : filteredNotes.length === 0 ? (
            /* Search filter with 0 matches */
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 dark:text-zinc-400">
              <Search className="h-8 w-8 stroke-[1.5] mb-2 text-slate-400" />
              <p className="text-sm font-medium">Inga lappar matchade din sökning "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                Rensa sökning
              </button>
            </div>
          ) : (
            /* Grid of deleted notes */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map((note) => {
                const colorConfig = COLOR_CONFIGS[note.color] || COLOR_CONFIGS.yellow;
                const daysRemaining = getDaysRemainingInTrash(note.deletedAt);
                const isUrgent = daysRemaining <= 3;
                const isConfirmingDelete = confirmPermanentId === note.id;

                return (
                  <div
                    key={note.id}
                    id={`trash-item-${note.id}`}
                    className={`relative flex flex-col justify-between rounded-xl border p-4 shadow-sm transition-all ${colorConfig.bgClass} ${colorConfig.borderClass} ${colorConfig.textColorClass}`}
                  >
                    {/* Top adhesive simulation */}
                    <div
                      className={`h-1.5 -mx-4 -mt-4 mb-3 rounded-t-xl ${colorConfig.accentBar} opacity-60`}
                    />

                    <div>
                      {/* Title & Sketch Badge */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-base leading-snug line-clamp-1">
                          {note.title || 'Namnlös lapp'}
                        </h4>
                        {note.drawingData && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/10 text-current shrink-0"
                            title="Innehåller Apple Pencil-skiss"
                          >
                            <PenTool className="h-3 w-3" />
                            Skiss
                          </span>
                        )}
                      </div>

                      {/* Content snippet */}
                      <p className="text-sm opacity-90 line-clamp-3 whitespace-pre-wrap break-words leading-relaxed">
                        {note.content || (note.drawingData ? '(Skissritning sparad)' : 'Tom lapp')}
                      </p>
                    </div>

                    {/* Footer Info & Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Time info and days remaining badge */}
                      <div className="flex flex-col text-[11px] opacity-75">
                        <span>Raderades {formatDeletedDate(note.deletedAt)}</span>
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isUrgent ? 'text-red-700 font-bold' : ''
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {daysRemaining === 1
                            ? 'Raderas permanent inom 24 timmar'
                            : `Raderas automatiskt om ${daysRemaining} dagar`}
                        </span>
                      </div>

                      {/* Actions: Restore or Delete Permanently */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          id={`btn-restore-note-${note.id}`}
                          type="button"
                          onClick={() => onRestoreNote(note)}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 hover:bg-white text-slate-800 dark:text-zinc-100 text-xs font-bold shadow-xs hover:shadow active:scale-95 transition-all flex items-center gap-1.5 border border-black/10"
                          title="Återställ till skrivbordet"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Återställ</span>
                        </button>

                        {!isConfirmingDelete ? (
                          <button
                            id={`btn-perm-delete-${note.id}`}
                            type="button"
                            onClick={() => setConfirmPermanentId(note.id)}
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-black/10 text-red-700 dark:text-red-800 active:scale-95 transition-all"
                            title="Radera permanent nu"
                            aria-label="Radera permanent"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 p-1 rounded-lg border border-red-300 shadow-sm animate-in fade-in duration-100">
                            <span className="text-[10px] font-bold text-red-600 px-1">Ta bort helt?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onPermanentlyDeleteNote(note.id);
                                setConfirmPermanentId(null);
                              }}
                              className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold active:scale-95"
                            >
                              Ja
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPermanentId(null)}
                              className="px-1.5 py-1 text-slate-600 dark:text-zinc-400 text-[10px]"
                            >
                              Nej
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3.5 sm:px-6 bg-slate-50 dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Återställda lappar placeras på sin tidigare plats på skrivbordet</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-95 transition-all"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
