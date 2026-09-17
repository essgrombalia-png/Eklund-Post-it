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
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  FileStack,
  ChevronDown,
  Pin,
  Download,
  Upload,
  Layers,
  HelpCircle,
  Trash2,
  MoreHorizontal,
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
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [lastStackMode, setLastStackMode] = useState<'center' | 'corner' | 'fan'>('center');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stackMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (stackMenuRef.current && !stackMenuRef.current.contains(target)) {
        setShowStackMenu(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(target)) {
        setShowColorMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

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
      className="sticky top-0 left-0 right-0 z-40 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 transition-colors safe-area-header shadow-xs"
    >
      <div className="flex flex-col gap-2 max-w-7xl mx-auto py-1">
        {/* Primary Row: Brand, Main Actions, Search & Tools */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-sm border border-amber-300/60 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <span className="font-extrabold text-base sm:text-lg tracking-tighter">P</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                  Post-it
                </span>
                <span className="hidden md:inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                  iPad Pro
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-zinc-400 font-medium mt-0.5 leading-none">
                {noteCount} {noteCount === 1 ? 'lapp' : 'lappar'}
                {isAutoSaved && ' · Sparad'}
              </span>
            </div>
          </div>

          {/* New Note Button + Color Dropdown */}
          <div ref={colorMenuRef} className="relative flex items-center shrink-0">
            <div className="inline-flex rounded-xl shadow-sm">
              <button
                id="btn-add-note-main"
                type="button"
                onClick={() => onAddNote()}
                className="flex min-h-[40px] items-center gap-2 px-3.5 sm:px-4 py-2 rounded-l-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-amber-950 font-bold text-xs sm:text-sm active:scale-98 transition-all"
                title="Skapa ny lapp (⌘N)"
              >
                <Plus className="h-4 w-4 stroke-[2.8]" />
                <span>Ny lapp</span>
              </button>
              <button
                id="btn-add-note-color-toggle"
                type="button"
                onClick={() => setShowColorMenu((prev) => !prev)}
                className="flex min-h-[40px] w-8 items-center justify-center rounded-r-xl bg-amber-400 hover:bg-amber-500 text-amber-950 border-l border-amber-500/30 transition-colors"
                title="Välj färg för ny lapp"
                aria-label="Välj färg"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${showColorMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Quick Color Picker Dropdown */}
            {showColorMenu && (
              <div
                id="menu-quick-create-colors"
                className="absolute left-0 top-12 z-50 p-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
              >
                {colors.map((c) => (
                  <button
                    key={`quick-${c}`}
                    id={`btn-quick-create-${c}`}
                    type="button"
                    onClick={() => {
                      onAddNote(c);
                      setShowColorMenu(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:scale-115 active:scale-95 transition-transform"
                    title={`Skapa ${COLOR_CONFIGS[c].name} lapp`}
                  >
                    <span className={`h-5 w-5 rounded-full ${COLOR_CONFIGS[c].swatchClass} border border-black/15 shadow-2xs`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Field */}
          <div className="flex-1 max-w-xs sm:max-w-md relative min-w-[120px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              id="search-notes-input"
              type="text"
              placeholder="Sök lappar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full min-h-[40px] pl-8.5 pr-8 py-1.5 rounded-xl bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs sm:text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white dark:focus:bg-zinc-800 transition-all"
            />
            {searchQuery ? (
              <button
                id="btn-clear-search"
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                aria-label="Rensa sökning"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-200/60 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded">
                ⌘F
              </kbd>
            )}
          </div>

          {/* Right Grouped Toolbars */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Undo / Redo Group */}
            <div className="hidden xs:flex items-center bg-slate-100/80 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-zinc-700/80">
              <button
                id="btn-undo"
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 dark:text-zinc-200 ${
                  canUndo ? 'hover:bg-white dark:hover:bg-zinc-700 active:scale-95 shadow-2xs' : 'opacity-35 cursor-not-allowed'
                } transition-all`}
                title="Ångra (⌘Z)"
                aria-label="Ångra"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                id="btn-redo"
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 dark:text-zinc-200 ${
                  canRedo ? 'hover:bg-white dark:hover:bg-zinc-700 active:scale-95 shadow-2xs' : 'opacity-35 cursor-not-allowed'
                } transition-all`}
                title="Gör om (⌘Y)"
                aria-label="Gör om"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Organize & Arrange Group */}
            <div className="flex items-center bg-slate-100/80 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-zinc-700/80">
              {/* Grid Auto-Arrange */}
              <button
                id="btn-arrange-grid"
                type="button"
                onClick={onArrangeNotes}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-2xs"
                title="Ordna automatiskt i snyggt rutnät (⌘D)"
                aria-label="Ordna i rutnät"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>

              {/* Stack Notes with Dropdown */}
              <div ref={stackMenuRef} className="relative flex items-center">
                <button
                  id="btn-stack-notes"
                  type="button"
                  onClick={() => setShowStackMenu((prev) => !prev)}
                  className="flex h-8 px-2 items-center gap-1 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 active:scale-95 transition-all"
                  title="Stapla alla lappar"
                  aria-label="Stapla alla lappar"
                >
                  <FileStack className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden md:inline text-xs font-semibold">Stapla</span>
                  <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${showStackMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Stack Options Dropdown */}
                {showStackMenu && (
                  <div
                    id="menu-stack-options"
                    className="absolute right-0 top-10 z-50 w-56 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Staplingsstil
                    </div>

                    <button
                      type="button"
                      id="btn-stack-center"
                      onClick={() => {
                        setLastStackMode('center');
                        onStackNotes('center');
                        setShowStackMenu(false);
                      }}
                      className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                        lastStackMode === 'center'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                          : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-sm">🗂️</span>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">Centrerad trave</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">Samla i mitten</div>
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
                      className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                        lastStackMode === 'corner'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                          : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-sm">◤</span>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">Hörnstapling</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">Övre vänstra hörnet</div>
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
                      className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                        lastStackMode === 'fan'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                          : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-sm">🂠</span>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">Solfjäder</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">Fläka ut i en snygg båge</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
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
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shadow-2xs"
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
              className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 shadow-2xs ${
                trashCount > 0
                  ? 'border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100'
                  : 'border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title={`Papperskorg (${trashCount} ${trashCount === 1 ? 'lapp' : 'lappar'})`}
              aria-label="Öppna papperskorg"
            >
              <Trash2 className="h-4 w-4" />
              {trashCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold shadow-xs">
                  {trashCount}
                </span>
              )}
            </button>

            {/* More / Backup / Guide Dropdown */}
            <div ref={moreMenuRef} className="relative flex items-center">
              <button
                id="btn-more-options"
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shadow-2xs"
                title="Mer: Backup, import & iPad guide"
                aria-label="Mer alternativ"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showMoreMenu && (
                <div
                  id="menu-more-options"
                  className="absolute right-0 top-11 z-50 w-52 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    id="btn-export-backup"
                    onClick={() => {
                      onExport();
                      setShowMoreMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    <span>Spara backup (JSON)</span>
                  </button>

                  <button
                    type="button"
                    id="btn-import-backup"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowMoreMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Upload className="h-4 w-4 text-sky-600" />
                    <span>Läs in backup (JSON)</span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

                  <button
                    type="button"
                    id="btn-open-guide"
                    onClick={() => {
                      setShowGuideModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/80 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4 text-amber-600" />
                    <span>iPad & Kortkommandon</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Secondary Sub-Bar: Clean Filter Tabs on Left, Zoom Controls on Right */}
        <div className="flex items-center justify-between gap-3 pt-0.5 text-xs">
          
          {/* Segmented Filter Bar */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 custom-note-scrollbar shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mr-1 hidden sm:inline">
              Filter:
            </span>

            {/* All notes tab */}
            <button
              id="filter-chip-all"
              type="button"
              onClick={() => onColorFilterChange('all')}
              className={`min-h-[30px] px-2.5 rounded-lg text-xs font-medium transition-all ${
                activeColorFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-semibold'
                  : 'bg-slate-100/90 dark:bg-zinc-800/90 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              Alla ({noteCount})
            </button>

            {/* Pinned notes tab */}
            <button
              id="filter-chip-pinned"
              type="button"
              onClick={() => onColorFilterChange('pinned')}
              className={`min-h-[30px] px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeColorFilter === 'pinned'
                  ? 'bg-amber-500 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100/90 dark:bg-zinc-800/90 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Pin className="h-3 w-3 fill-current rotate-45" />
              <span>Fästa ({pinnedCount})</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1 hidden xs:block" />

            {/* Color Filter Dots with Clean Active Ring */}
            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-zinc-700/60">
              {colors.map((c) => {
                const isSelected = activeColorFilter === c;
                return (
                  <button
                    key={`filter-${c}`}
                    id={`filter-chip-color-${c}`}
                    type="button"
                    onClick={() => onColorFilterChange(isSelected ? 'all' : c)}
                    className={`h-6 w-6 rounded-md flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-700 shadow-2xs ring-1.5 ring-slate-900 dark:ring-white scale-105'
                        : 'hover:bg-white/60 dark:hover:bg-zinc-700/60'
                    }`}
                    title={`Filtrera på ${COLOR_CONFIGS[c].name}${isSelected ? ' (Aktiv)' : ''}`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full ${COLOR_CONFIGS[c].swatchClass} border border-black/15 shadow-2xs`} />
                  </button>
                );
              })}
            </div>

            {activeColorFilter !== 'all' && (
              <button
                type="button"
                onClick={() => onColorFilterChange('all')}
                className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded underline cursor-pointer ml-1"
              >
                Återställ
              </button>
            )}
          </div>

          {/* Zoom controls & Scale indicator with iPad Fit button */}
          <div className="flex items-center gap-0.5 shrink-0 bg-slate-100/90 dark:bg-zinc-800/90 p-0.5 rounded-lg border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs">
            <button
              id="btn-zoom-out"
              type="button"
              onClick={onZoomOut}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 active:scale-95 transition-all"
              title="Zooma ut"
              aria-label="Zooma ut"
            >
              <ZoomOut className="h-3 w-3" />
            </button>

            <button
              id="btn-zoom-reset"
              type="button"
              onClick={onResetZoom}
              className="px-1.5 text-[11px] font-semibold text-slate-700 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              title="Återställ zoom till 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              id="btn-zoom-in"
              type="button"
              onClick={onZoomIn}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 active:scale-95 transition-all"
              title="Zooma in"
              aria-label="Zooma in"
            >
              <ZoomIn className="h-3 w-3" />
            </button>

            {onFitAllNotes && (
              <button
                id="btn-fit-screen"
                type="button"
                onClick={onFitAllNotes}
                className="flex h-7 px-1.5 items-center justify-center gap-1 rounded bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-200/80 active:scale-95 ml-0.5 text-[10px] font-bold transition-all"
                title={'Passa alla lappar till iPad 11" Pro / Skärmen (⌘0)'}
                aria-label="Passa för iPad 11 Pro"
              >
                <Maximize2 className="h-3 w-3" />
                <span className="hidden sm:inline">Passa</span>
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
              <div className="flex items-center gap-2.5">
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

            <div className="space-y-3 text-sm text-slate-700 dark:text-zinc-300 py-1 max-h-[60vh] overflow-y-auto custom-note-scrollbar">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40">
                <span className="text-xl">🔍</span>
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-200">Fokus & Inzoomning (Dubbelklick)</p>
                  <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                    Dubbelklicka på en lapp för att direkt centrera och zooma in på just den lappen med en smidig övergång och isolerat fokus. Tryck <kbd className="font-mono bg-black/10 dark:bg-white/20 px-1 py-0.2 rounded">Esc</kbd>, klicka på skrivbordet eller dubbelklicka igen för att återgå.
                  </p>
                </div>
              </div>

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
