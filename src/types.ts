export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'purple';

export type DeskTheme =
  | 'light'
  | 'dark'
  | 'cork'
  | 'wood'
  | 'dark-wood'
  | 'paper'
  | 'blueprint';

export interface DeskThemeConfig {
  id: DeskTheme;
  name: string;
  category: 'grid' | 'texture' | 'minimalist';
  description: string;
  icon: string;
  bgClass: string;
  swatchGradient: string;
  isDark: boolean;
}

export const DESK_THEMES: Record<DeskTheme, DeskThemeConfig> = {
  light: {
    id: 'light',
    name: 'Ljust rutnät',
    category: 'grid',
    description: 'Rent skrivbord med diskreta prickar',
    icon: '☀️',
    bgClass: 'desk-grid-light',
    swatchGradient: 'bg-slate-100 border-slate-300',
    isDark: false,
  },
  dark: {
    id: 'dark',
    name: 'Mörkt rutnät',
    category: 'grid',
    description: 'Dämpat mörkt skrivbord för kvällsarbete',
    icon: '🌙',
    bgClass: 'desk-grid-dark',
    swatchGradient: 'bg-slate-900 border-slate-700',
    isDark: true,
  },
  cork: {
    id: 'cork',
    name: 'Korktavla',
    category: 'texture',
    description: 'Klassisk anslagstavla med varm korkstruktur',
    icon: '📌',
    bgClass: 'desk-cork',
    swatchGradient: 'bg-[#d2a679] border-[#b88c5e]',
    isDark: false,
  },
  wood: {
    id: 'wood',
    name: 'Ek / Ljust trä',
    category: 'texture',
    description: 'Varmt träskrivbord med levande träådring',
    icon: '🪵',
    bgClass: 'desk-wood',
    swatchGradient: 'bg-[#c49a6c] border-[#a87f52]',
    isDark: false,
  },
  'dark-wood': {
    id: 'dark-wood',
    name: 'Mörk valnöt',
    category: 'texture',
    description: 'Exklusiv mörk valnöt med djup ton',
    icon: '🌲',
    bgClass: 'desk-dark-wood',
    swatchGradient: 'bg-[#2b1d16] border-[#442c22]',
    isDark: true,
  },
  paper: {
    id: 'paper',
    name: 'Minimalistiskt papper',
    category: 'minimalist',
    description: 'Taktilt premiumpapper med mjuk fiberstruktur',
    icon: '📜',
    bgClass: 'desk-paper',
    swatchGradient: 'bg-[#f7f4ec] border-[#e2dcce]',
    isDark: false,
  },
  blueprint: {
    id: 'blueprint',
    name: 'Teknisk ritning / Blueprint',
    category: 'grid',
    description: 'Arkitektritningsbord i teknisk djupblå',
    icon: '📐',
    bgClass: 'desk-blueprint',
    swatchGradient: 'bg-[#1a365d] border-[#2a4d7d]',
    isDark: true,
  },
};

export type FontFamilyType = 'handwriting' | 'kalam' | 'casual' | 'sans';

export type FontSizeType = 'sm' | 'base' | 'lg';

export type NotePaperStyle = 'plain' | 'lined' | 'grid' | 'dots';

export type PressureCurveType = 'soft' | 'balanced' | 'firm' | 'fixed';
export type SmoothingLevelType = 'off' | 'smooth' | 'studio';

export interface StylusCalibrationSettings {
  pressureCurve: PressureCurveType; // 'soft' | 'balanced' | 'firm' | 'fixed'
  smoothing: SmoothingLevelType; // 'off' | 'smooth' | 'studio'
  streamlineTension: number; // 0.0 to 1.0
  pressureSensitivity: number; // 0.5 to 2.0 (default 1.0)
  nibFriction: number; // 0 to 1 (pen drag resistance)
  palmRejection: boolean;
  snapShapes: boolean;
  directPencilInking: boolean; // Auto-activate ink when Apple Pencil touches note
  twoFingerUndo: boolean; // Two-finger tap = Undo, three-finger tap = Redo
  pencilHoverPreview: boolean; // Apple Pencil Hover cursor on iPad Pro
  proMotion120Hz: boolean; // ProMotion 120Hz coalesced events
}

export const DEFAULT_STYLUS_CALIBRATION: StylusCalibrationSettings = {
  pressureCurve: 'balanced',
  smoothing: 'smooth',
  streamlineTension: 0.45,
  pressureSensitivity: 1.0,
  nibFriction: 0.15,
  palmRejection: true,
  snapShapes: true,
  directPencilInking: true,
  twoFingerUndo: true,
  pencilHoverPreview: true,
  proMotion120Hz: true,
};

export type ImageFitMode = 'cover' | 'contain' | 'auto';

export type ImageFilterMode = 'none' | 'grayscale' | 'sepia' | 'vivid';

export interface NoteImageConfig {
  height?: number; // e.g. 60 to 450px, default 140
  fit?: ImageFitMode; // 'cover' | 'contain' | 'auto'
  rotation?: number; // 0, 90, 180, 270
  filter?: ImageFilterMode; // 'none' | 'grayscale' | 'sepia' | 'vivid'
  rounded?: boolean; // default true (rounded-xl)
}

export type NoteChangeType =
  | 'created'
  | 'content_edit'
  | 'drawing'
  | 'photo'
  | 'color'
  | 'font'
  | 'restored';

export interface NoteVersion {
  id: string;
  timestamp: number;
  title: string;
  content: string;
  color: PostItColor;
  drawingData?: string;
  imageUrl?: string;
  imageConfig?: NoteImageConfig;
  fontFamily?: FontFamilyType;
  paperStyle?: NotePaperStyle;
  fontSize?: FontSizeType;
  changeType?: NoteChangeType;
  summary?: string;
}

export interface PostItNote {
  id: string;
  title: string;
  content: string;
  color: PostItColor;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isPinned: boolean;
  zIndex: number;
  fontFamily: FontFamilyType;
  paperStyle?: NotePaperStyle;
  fontSize: FontSizeType;
  drawingData?: string; // Base64 PNG data URL of Apple Pencil / touch freehand sketch
  isSketchMode?: boolean; // Whether pencil sketch mode is currently open for this note
  imageUrl?: string; // Downscaled photo/image attached to the note via camera or file
  imageConfig?: NoteImageConfig; // User controls for image size, fit, rotation, filters
  versions?: NoteVersion[]; // Timeline history of previous versions and revisions
  createdAt: number;
  updatedAt: number;
}

export interface ColorDefinition {
  id: PostItColor;
  name: string;
  swatchClass: string;
  bgClass: string;
  borderClass: string;
  headerClass: string;
  textColorClass: string;
  pinColor: string;
  accentBar: string;
}

export const COLOR_CONFIGS: Record<PostItColor, ColorDefinition> = {
  yellow: {
    id: 'yellow',
    name: 'Klassisk Gul',
    swatchClass: 'bg-amber-300',
    bgClass: 'bg-[#fef9c3]', // warm soft yellow
    borderClass: 'border-amber-200/80',
    headerClass: 'bg-amber-200/50',
    textColorClass: 'text-amber-950',
    pinColor: '#ef4444', // classic red pin
    accentBar: 'bg-amber-300',
  },
  pink: {
    id: 'pink',
    name: 'Pastell Rosa',
    swatchClass: 'bg-pink-300',
    bgClass: 'bg-[#fce7f3]', // soft pastel pink
    borderClass: 'border-pink-200/80',
    headerClass: 'bg-pink-200/50',
    textColorClass: 'text-pink-950',
    pinColor: '#ec4899',
    accentBar: 'bg-pink-300',
  },
  blue: {
    id: 'blue',
    name: 'Himmelsblå',
    swatchClass: 'bg-sky-300',
    bgClass: 'bg-[#e0f2fe]', // sky blue
    borderClass: 'border-sky-200/80',
    headerClass: 'bg-sky-200/50',
    textColorClass: 'text-sky-950',
    pinColor: '#0284c7',
    accentBar: 'bg-sky-300',
  },
  green: {
    id: 'green',
    name: 'Mintgrön',
    swatchClass: 'bg-emerald-300',
    bgClass: 'bg-[#dcfce7]', // soft mint
    borderClass: 'border-emerald-200/80',
    headerClass: 'bg-emerald-200/50',
    textColorClass: 'text-emerald-950',
    pinColor: '#059669',
    accentBar: 'bg-emerald-300',
  },
  orange: {
    id: 'orange',
    name: 'Solig Orange',
    swatchClass: 'bg-orange-300',
    bgClass: 'bg-[#ffedd5]', // soft peach/orange
    borderClass: 'border-orange-200/80',
    headerClass: 'bg-orange-200/50',
    textColorClass: 'text-orange-950',
    pinColor: '#ea580c',
    accentBar: 'bg-orange-300',
  },
  purple: {
    id: 'purple',
    name: 'Lavendel',
    swatchClass: 'bg-purple-300',
    bgClass: 'bg-[#f3e8ff]', // lavender
    borderClass: 'border-purple-200/80',
    headerClass: 'bg-purple-200/50',
    textColorClass: 'text-purple-950',
    pinColor: '#9333ea',
    accentBar: 'bg-purple-300',
  },
};

export const DEFAULT_NOTE_WIDTH = 290;
export const DEFAULT_NOTE_HEIGHT = 280;
export const MIN_NOTE_WIDTH = 140;
export const MIN_NOTE_HEIGHT = 120;
export const MAX_NOTE_WIDTH = 1200;
export const MAX_NOTE_HEIGHT = 1200;

export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface TrashNote extends PostItNote {
  deletedAt: number; // Timestamp when note was moved to trash
}
