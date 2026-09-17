import React, { useState, useMemo } from 'react';
import { PostItNote, NoteVersion, COLOR_CONFIGS } from '../types';
import {
  ensureNoteVersions,
  getChangeTypeDetails,
  formatRelativeTimelineTime,
  restoreNoteVersion,
} from '../utils/versionHistory';
import {
  History,
  Clock,
  RotateCcw,
  Sparkles,
  Pencil,
  Camera,
  Palette,
  Type,
  Check,
  Copy,
  X,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface NoteHistoryModalProps {
  note: PostItNote;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (restoredNote: PostItNote) => void;
}

export const NoteHistoryModal: React.FC<NoteHistoryModalProps> = ({
  note,
  isOpen,
  onClose,
  onRestore,
}) => {
  const versions = useMemo(() => ensureNoteVersions(note), [note]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    versions[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Keep selected version in sync if versions change
  const selectedVersion = useMemo(() => {
    const found = versions.find((v) => v.id === selectedVersionId);
    return found || versions[0] || null;
  }, [versions, selectedVersionId]);

  if (!isOpen) return null;

  const filteredVersions = versions.filter((v) => {
    if (filterType === 'all') return true;
    if (filterType === 'content') return v.changeType === 'content_edit' || v.changeType === 'created' || v.changeType === 'restored';
    if (filterType === 'media') return v.changeType === 'drawing' || v.changeType === 'photo';
    if (filterType === 'style') return v.changeType === 'color' || v.changeType === 'font';
    return true;
  });

  const handleCopyContent = () => {
    if (!selectedVersion) return;
    const text = selectedVersion.title
      ? `${selectedVersion.title}\n\n${selectedVersion.content}`
      : selectedVersion.content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyRestore = () => {
    if (!selectedVersion) return;
    const restored = restoreNoteVersion(note, selectedVersion);
    onRestore(restored);
    onClose();
  };

  const isCurrentVersionSelected = selectedVersion?.id === versions[0]?.id;
  const selectedColorConfig = selectedVersion ? COLOR_CONFIGS[selectedVersion.color] || COLOR_CONFIGS.yellow : COLOR_CONFIGS.yellow;

  // Comparison metrics vs current note
  const currentChars = note.content.length;
  const versionChars = selectedVersion ? selectedVersion.content.length : 0;
  const charDiff = versionChars - currentChars;

  return (
    <div
      id={`note-history-modal-backdrop-${note.id}`}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-modal-overlay bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id={`note-history-modal-container-${note.id}`}
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200/80 dark:border-amber-800/80">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  Ändringshistorik & Tidslinje
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-zinc-800 font-medium text-slate-600 dark:text-zinc-300 shrink-0">
                  {versions.length} {versions.length === 1 ? 'version' : 'versioner'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                {note.title ? `"${note.title}"` : 'Namnlös lapp'} · Skapad {new Date(note.createdAt).toLocaleDateString('sv-SE')}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-history-modal"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            aria-label="Stäng historik"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Split View (Timeline List + Version Inspector) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-zinc-800">
          
          {/* Left Panel: Timeline List */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col shrink-0 bg-slate-50/40 dark:bg-zinc-950/30">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-2.5 border-b border-slate-200/80 dark:border-zinc-800/80 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-amber-400 text-amber-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                Alla ({versions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('content')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  filterType === 'content'
                    ? 'bg-amber-400 text-amber-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setFilterType('media')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  filterType === 'media'
                    ? 'bg-amber-400 text-amber-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                Media & Skiss
              </button>
              <button
                type="button"
                onClick={() => setFilterType('style')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  filterType === 'style'
                    ? 'bg-amber-400 text-amber-950 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                Stil & Färg
              </button>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-note-scrollbar">
              {filteredVersions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                  Inga ändringar matchar valt filter.
                </div>
              ) : (
                filteredVersions.map((version, index) => {
                  const isSelected = version.id === selectedVersion?.id;
                  const isLatest = index === 0;
                  const details = getChangeTypeDetails(version.changeType);
                  const verColor = COLOR_CONFIGS[version.color] || COLOR_CONFIGS.yellow;

                  return (
                    <button
                      key={version.id}
                      type="button"
                      id={`btn-version-${version.id}`}
                      onClick={() => setSelectedVersionId(version.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 relative cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-800 border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                          : 'bg-white/70 dark:bg-zinc-900/60 border-slate-200/70 dark:border-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800/80 hover:border-slate-300'
                      }`}
                    >
                      {/* Timeline Dot & Color Indicator */}
                      <div className="flex flex-col items-center pt-0.5 shrink-0">
                        <div
                          className={`h-4 w-4 rounded-full ${verColor.swatchClass} border-2 border-white dark:border-zinc-900 shadow-xs ring-1 ring-black/10`}
                          title={`Färg: ${verColor.name}`}
                        />
                        {index < filteredVersions.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-200 dark:bg-zinc-800 my-1 -mb-3 min-h-[20px]" />
                        )}
                      </div>

                      {/* Version Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${details.badgeClass}`}
                          >
                            {isLatest ? '● Nuvarande' : details.label}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                            {formatRelativeTimelineTime(version.timestamp)}
                          </span>
                        </div>

                        {version.title ? (
                          <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {version.title}
                          </div>
                        ) : null}

                        <div className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-2 mt-0.5 font-normal">
                          {version.content || (
                            <span className="italic text-slate-400">Ingen text (tom lapp)</span>
                          )}
                        </div>

                        {/* Extra indicators (photo, sketch, font) */}
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 dark:text-zinc-500">
                          {version.imageUrl && (
                            <span className="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400 font-medium">
                              <Camera className="h-2.5 w-2.5" /> Foto
                            </span>
                          )}
                          {version.drawingData && (
                            <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-medium">
                              <Pencil className="h-2.5 w-2.5" /> Skiss
                            </span>
                          )}
                          <span>
                            {new Date(version.timestamp).toLocaleTimeString('sv-SE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Selected Version Inspector & Visual Preview */}
          <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 bg-slate-100/60 dark:bg-zinc-900/40 overflow-y-auto custom-note-scrollbar">
            {selectedVersion ? (
              <div className="flex flex-col h-full space-y-4">
                {/* Version Title & Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {isCurrentVersionSelected ? 'Nuvarande version' : 'Tidigare revision'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {new Date(selectedVersion.timestamp).toLocaleString('sv-SE', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    {selectedVersion.summary && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        {selectedVersion.summary}
                      </p>
                    )}
                  </div>

                  {/* Character/word diff indicator */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-zinc-400">
                      {selectedVersion.content.length} tecken
                    </span>
                    {!isCurrentVersionSelected && (
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                          charDiff > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : charDiff < 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {charDiff > 0 ? `+${charDiff}` : charDiff} jmf. nu
                      </span>
                    )}
                  </div>
                </div>

                {/* Realistic Note Preview Card */}
                <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
                  <div
                    className={`w-full max-w-md rounded-2xl border shadow-lg overflow-hidden flex flex-col transition-all ${selectedColorConfig.bgClass} ${selectedColorConfig.borderClass} ${selectedColorConfig.textColorClass}`}
                    style={{ minHeight: '260px' }}
                  >
                    {/* Note Header */}
                    <div
                      className={`px-4 py-2.5 border-b border-black/5 flex items-center justify-between ${selectedColorConfig.headerClass}`}
                    >
                      <div className="font-bold text-sm truncate flex-1 pr-2">
                        {selectedVersion.title || <span className="opacity-40 italic">Utan titel</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] opacity-60 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(selectedVersion.timestamp).toLocaleTimeString('sv-SE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Note Body */}
                    <div className="p-4 flex-1 flex flex-col space-y-2 min-h-0">
                      {/* Photo if present */}
                      {selectedVersion.imageUrl && (
                        <div className="rounded-xl overflow-hidden max-h-[140px] border border-black/10 shadow-xs mb-2">
                          <img
                            src={selectedVersion.imageUrl}
                            alt="Foto i lappen"
                            className="w-full h-full object-cover max-h-[140px]"
                          />
                        </div>
                      )}

                      {/* Sketch if present */}
                      {selectedVersion.drawingData && (
                        <div className="rounded-xl overflow-hidden border border-black/10 bg-white/40 mb-2 p-1">
                          <img
                            src={selectedVersion.drawingData}
                            alt="Apple Pencil skiss"
                            className="w-full max-h-[100px] object-contain"
                          />
                        </div>
                      )}

                      {/* Text content */}
                      <div
                        className={`flex-1 whitespace-pre-wrap leading-relaxed text-sm ${
                          selectedVersion.fontFamily === 'handwriting'
                            ? 'font-handwriting font-bold'
                            : 'font-sans'
                        }`}
                      >
                        {selectedVersion.content || (
                          <span className="italic opacity-30">(Lappen hade inget textinnehåll)</span>
                        )}
                      </div>
                    </div>

                    {/* Note Footer */}
                    <div className="px-4 py-1.5 border-t border-black/5 bg-black/[0.02] flex items-center justify-between text-[11px] opacity-60">
                      <div className="flex items-center gap-2">
                        <span>Färg: {selectedColorConfig.name}</span>
                        <span>·</span>
                        <span>Stil: {selectedVersion.fontFamily === 'handwriting' ? 'Handskriven' : 'Standard'}</span>
                      </div>
                      <span>
                        {selectedVersion.content.split(/\s+/).filter(Boolean).length} ord
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    id="btn-copy-version-text"
                    onClick={handleCopyContent}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300">Kopierat!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Kopiera text</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                    >
                      Avbryt
                    </button>

                    <button
                      type="button"
                      id="btn-restore-version-confirm"
                      onClick={handleApplyRestore}
                      disabled={isCurrentVersionSelected}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                        isCurrentVersionSelected
                          ? 'bg-slate-200 text-slate-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed shadow-none'
                          : 'bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-amber-950 active:scale-95 cursor-pointer'
                      }`}
                      title={
                        isCurrentVersionSelected
                          ? 'Detta är redan den aktiva versionen'
                          : 'Återställ lappen till denna version'
                      }
                    >
                      <RotateCcw className="h-4 w-4 stroke-[2.5]" />
                      <span>Återställ denna version</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
