import React, { useState, useRef, useEffect } from 'react';
import {
  PostItColor,
  COLOR_CONFIGS,
  DeskTheme,
  PostItNote,
} from '../types';
import {
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  X,
  Sun,
  Moon,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  FileStack,
  ChevronDown,
  Pin,
  Download,
  Upload,
  Sparkles,
  Layers,
  HelpCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { parseImportedNotes } from '../utils/storage';

interface ToolbarProps {
  noteCount: number;
  pinnedCount: number;
  trashCount: number;
  onOpenTrash: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeColorFilter: PostItColor | 'all' | 'pinned';
  onColorFilterChange: (filter: PostItColor | 'all' | 'pinned') => void;
  onAddNote: (color?: PostItColor) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitAllNotes?: () => void;
  onArrangeNotes: () => void;
  onStackNotes: (mode?: 'center' | 'corner' | 'fan') => void;
  theme: DeskTheme;
  onToggleTheme: (theme: DeskTheme) => void;
  onExport: () => void;
  onImportNotes?: (notes: PostItNote[]) => void;
  isAutoSaved: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  noteCount,
  pinnedCount,
  trashCount,
  onOpenTrash,
  searchQuery,
  onSearchChange,
  activeColorFilter,
  onColorFilterChange,
  onAddNote,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitAllNotes,
  onArrangeNotes,
  onStackNotes,
  theme,
  onToggleTheme,
  onExport,
  onImportNotes,
  isAutoSaved,
}) => {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showStackMenu, setShowStackMenu] = useState(false);
  const [lastStackMode, setLastStackMode] = useState<'center' | 'corner' | 'fan'>('center');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stackMenuRef = useRef<HTMLDivElement>(null);

  // Close stack menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        stackMenuRef.current &&
        !stackMenuRef.current.contains(e.target as Node)
      ) {
        setShowStackMenu(false);
      }
    };
    if (showStackMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showStackMenu]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseImportedNotes(content);
        if (parsed && onImportNotes) {
          onImportNotes(parsed);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const colors: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];

  return (
    <header
      id="main-app-toolbar"
      className="sticky top-0 left-0 right-0 z-40 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 transition-colors px-3 sm:px-5 py-2.5 shadow-xs"
    >
      <div className="flex flex-col gap-2 max-w-7xl mx-auto">
        {/* Primary Top Bar Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & App Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-amber-950 shadow-sm border border-amber-400/50 transform -rotate-3">
              <span className="font-extrabold text-lg">P</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Post-it
                </h1>
                <span className="hidden md:inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                  iPad Pro
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                {noteCount} {noteCount === 1 ? 'lapp' : 'lappar'}
                {isAutoSaved && ' · Sparad'}
              </span>
            </div>
          </div>

          {/* Quick Create Note Button + Color Dropdown */}
          <div className="relative flex items-center gap-1">
            <button
              id="btn-add-note-main"
              type="button"
              onClick={() => onAddNote()}
              className="flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-amber-950 font-bold text-sm shadow-sm active:scale-98 transition-all"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              <span className="hidden xs:inline">Ny lapp</span>
            </button>

            {/* Quick color dots next to add button */}
            <div className="hidden lg:flex items-center bg-slate-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/60 ml-1">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  id={`btn-quick-create-${c}`}
                  onClick={() => onAddNote(c)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:scale-110 active:scale-95 transition-transform"
                  title={`Skapa ny ${COLOR_CONFIGS[c].name.toLowerCase()} lapp`}
                  aria-label={`Skapa ny ${COLOR_CONFIGS[c].name.toLowerCase()} lapp`}
                >
                  <span className={`h-5 w-5 rounded-full ${COLOR_CONFIGS[c].swatchClass} border border-black/15 shadow-xs`} />
                </button>
              ))}
            </div>
          </div>

          {/* Search Field (Tablet & Desktop) */}
          <div className="flex-1 max-w-xs sm:max-w-sm relative min-w-[130px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              id="search-notes-input"
              type="text"
              placeholder="Sök lappar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 transition-all"
            />
            {searchQuery && (
              <button
                id="btn-clear-search"
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                aria-label="Rensa sökning"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Action & Tool Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Undo Button */}
            <button
              id="btn-undo"
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 ${
                canUndo
                  ? 'hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95'
                  : 'opacity-40 cursor-not-allowed'
              } transition-all`}
              title="Ångra (Ctrl/Cmd+Z)"
              aria-label="Ångra ändring"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Redo Button */}
            <button
              id="btn-redo"
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 ${
                canRedo
                  ? 'hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95'
                  : 'opacity-40 cursor-not-allowed'
              } transition-all`}
              title="Gör om (Ctrl/Cmd+Y)"
              aria-label="Gör om ändring"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Auto Arrange Notes in Grid */}
            <button
              id="btn-arrange-grid"
              type="button"
              onClick={onArrangeNotes}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title="Ordna i snyggt rutnät"
              aria-label="Ordna lappar i rutnät"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>

            {/* Stack Notes Button & Dropdown */}
            <div className="relative flex items-center">
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                <button
                  id="btn-stack-notes"
                  type="button"
                  onClick={() => onStackNotes(lastStackMode)}
                  className="flex min-h-[44px] px-2.5 items-center gap-1.5 rounded-l-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
                  title="Stapla alla lappar snyggt med mjuk animation (klicka på pilen för hörn/solfjäder)"
                  aria-label="Stapla alla lappar"
                >
                  <FileStack className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="hidden md:inline text-xs font-semibold">Stapla</span>
                </button>
                <button
                  id="btn-stack-options"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStackMenu((prev) => !prev);
                  }}
                  className="flex min-h-[44px] w-6 items-center justify-center rounded-r-xl border-l border-slate-200 dark:border-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
                  title="Alternativ för stapling"
                  aria-label="Alternativ för stapling"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${showStackMenu ? 'rotate-180 text-amber-500' : ''}`} />
                </button>
              </div>

              {/* Stack Options Menu */}
              {showStackMenu && (
                <div
                  ref={stackMenuRef}
                  id="menu-stack-options"
                  className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Välj staplingsstil
                  </div>

                  <button
                    type="button"
                    id="btn-stack-center"
                    onClick={() => {
                      setLastStackMode('center');
                      onStackNotes('center');
                      setShowStackMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors ${
                      lastStackMode === 'center'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                        : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs shadow-2xs">
                      ❖
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">Stapla i mitten</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400">Centrerad kortlek med mjuk animation</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="btn-stack-corner"
                    onClick={() => {
                      setLastStackMode('corner');
                      onStackNotes('corner');
                      setShowStackMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors ${
                      lastStackMode === 'corner'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                        : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs shadow-2xs">
                      ◤
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">Stapla i hörnet</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400">Prydlig hög i övre vänstra hörnet</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="btn-stack-fan"
                    onClick={() => {
                      setLastStackMode('fan');
                      onStackNotes('fan');
                      setShowStackMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors ${
                      lastStackMode === 'fan'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                        : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs shadow-2xs">
                      🂠
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">Solfjäder (Kortlek)</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400">Fläka ut lapparna i en snygg båge</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Theme Desk Mode Picker */}
            <button
              id="btn-toggle-theme"
              type="button"
              onClick={() => {
                const nextTheme: DeskTheme =
                  theme === 'light' ? 'dark' : theme === 'dark' ? 'cork' : 'light';
                onToggleTheme(nextTheme);
              }}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title={`Skrivbordstema: ${
                theme === 'light' ? 'Ljust rutnät' : theme === 'dark' ? 'Mörkt rutnät' : 'Korktavla'
              }`}
              aria-label="Växla tema"
            >
              {theme === 'light' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : theme === 'dark' ? (
                <Moon className="h-4 w-4 text-sky-400" />
              ) : (
                <Layers className="h-4 w-4 text-amber-700" />
              )}
            </button>

            {/* Papperskorg / Trash Button */}
            <button
              id="btn-open-trash"
              type="button"
              onClick={onOpenTrash}
              className={`relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-all active:scale-95 ${
                trashCount > 0
                  ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-950/40'
                  : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title={`Papperskorg (${trashCount} ${trashCount === 1 ? 'lapp sparad' : 'lappar sparade'})`}
              aria-label="Öppna papperskorg"
            >
              <Trash2 className="h-4 w-4" />
              {trashCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-xs">
                  {trashCount}
                </span>
              )}
            </button>

            {/* Export Backup Button */}
            <button
              id="btn-export-backup"
              type="button"
              onClick={onExport}
              className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title="Spara säkerhetskopia (JSON)"
              aria-label="Exportera lappar"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Import Backup Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              id="btn-import-backup"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title="Läs in säkerhetskopia (JSON)"
              aria-label="Importera lappar"
            >
              <Upload className="h-4 w-4" />
            </button>

            {/* iPad Guide Button */}
            <button
              id="btn-open-guide"
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-amber-300 dark:border-amber-600/40 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 active:scale-95 transition-all"
              title="iPad Pro & Apple Pencil guide"
              aria-label="Öppna iPad guide"
            >
              <HelpCircle className="h-4 w-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Secondary Sub-Bar: Filters & Zoom controls for iPad quick ergonomics */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 pt-0.5 text-xs">
          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mr-1 hidden sm:inline">
              Filter:
            </span>

            {/* All notes */}
            <button
              id="filter-chip-all"
              type="button"
              onClick={() => onColorFilterChange('all')}
              className={`min-h-[36px] px-3 rounded-lg font-medium transition-all ${
                activeColorFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              Alla ({noteCount})
            </button>

            {/* Pinned notes only */}
            <button
              id="filter-chip-pinned"
              type="button"
              onClick={() => onColorFilterChange('pinned')}
              className={`min-h-[36px] px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeColorFilter === 'pinned'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Pin className="h-3 w-3 fill-current rotate-45" />
              <span>Fästa ({pinnedCount})</span>
            </button>

            {/* Color Filter Dots */}
            {colors.map((c) => {
              const isSelected = activeColorFilter === c;
              return (
                <button
                  key={`filter-${c}`}
                  id={`filter-chip-color-${c}`}
                  type="button"
                  onClick={() => onColorFilterChange(isSelected ? 'all' : c)}
                  className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-all ${
                    isSelected
                      ? 'ring-2 ring-slate-900 dark:ring-white bg-slate-200 dark:bg-zinc-700'
                      : 'hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                  title={`Filtrera på ${COLOR_CONFIGS[c].name}`}
                >
                  <span className={`h-4 w-4 rounded-full ${COLOR_CONFIGS[c].swatchClass} border border-black/15 shadow-2xs`} />
                </button>
              );
            })}
          </div>

          {/* Zoom controls & Scale indicator with iPad Fit button */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/70">
            <button
              id="btn-zoom-out"
              type="button"
              onClick={onZoomOut}
              className="flex h-8 w-8 items-center justify-center rounded text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95"
              title="Zooma ut"
              aria-label="Zooma ut"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>

            <button
              id="btn-zoom-reset"
              type="button"
              onClick={onResetZoom}
              className="px-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
              title="Återställ zoom till 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              id="btn-zoom-in"
              type="button"
              onClick={onZoomIn}
              className="flex h-8 w-8 items-center justify-center rounded text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95"
              title="Zooma in"
              aria-label="Zooma in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>

            {onFitAllNotes && (
              <button
                id="btn-fit-screen"
                type="button"
                onClick={onFitAllNotes}
                className="flex h-8 w-8 items-center justify-center rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 active:scale-95 ml-0.5"
                title={'Passa för iPad 11" Pro / Skärmen (Visa alla lappar, Cmd+0)'}
                aria-label="Passa för iPad 11 Pro"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* iPad Pro & Touch Guide Dialog Modal */}
      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 overflow-hidden flex flex-col gap-4 text-slate-900 dark:text-zinc-100 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-amber-950 font-bold">
                  iPad
                </div>
                <div>
                  <h3 className="font-bold text-base">iPad 11" Pro & Touch Guide</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Optimerad för Apple Pencil, Touch & Magic Keyboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700 dark:text-zinc-300 py-1 max-h-[60vh] overflow-y-auto">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50">
                <span className="text-xl">✌️</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Knip & zooma (Pinch-to-zoom)</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Använd två fingrar på skrivbordet för att zooma in/ut och panorera smidigt. Tryck på <Maximize2 className="inline h-3 w-3 text-amber-500" /> för att direkt anpassa alla lappar till iPad 11" Pro-skärmen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50">
                <span className="text-xl">✏️</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Apple Pencil & Stylus Stöd</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Tryck på penn-ikonen i lappens rubrik för att rita frihand. Appen har inbyggd handflatsavvisning (palm rejection) och stödjer pennstreck med justerbar tjocklek och färg.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50">
                <span className="text-xl">⌨️</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">iPad Magic Keyboard Genvägar</p>
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5 text-xs">
                    <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">⌘ + N : Ny lapp</span>
                    <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">⌘ + Z : Ångra</span>
                    <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">⌘ + ⇧ + Z : Gör om</span>
                    <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">⌘ + F : Sök lappar</span>
                    <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">⌘ + 0 : Passa skärm</span>
                    <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">⌘ + D : Rutnät</span>
                    <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">⌘ + S : Spara backup</span>
                    <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">Esc : Lämna fokus</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50">
                <span className="text-xl">👆</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Dubbeltryck för snabblapp</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Dubbeltryck var som helst på det tomma skrivbordet för att skapa en lapp på exakt den platsen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50">
                <span className="text-xl">📌</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Fästa viktiga lappar</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Tryck på kartnålen i lappens toppmeny för att fästa den överst och filtrera snabbt i verktygsfältet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50">
                <span className="text-xl">🗂️</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Stapla & Ändringshistorik</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Klicka på "Stapla" för att samla alla lappar i mitten, hörn eller solfjäder. Klicka på klockan eller historikikonen på en lapp för att återställa tidigare versioner.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-sm active:scale-95 transition-all"
              >
                Uppfattat!
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
