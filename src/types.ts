export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'purple';

export type DeskTheme = 'light' | 'dark' | 'cork';

export type FontFamilyType = 'handwriting' | 'sans';

export type FontSizeType = 'sm' | 'base' | 'lg';

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
export const MIN_NOTE_WIDTH = 220;
export const MIN_NOTE_HEIGHT = 200;
export const MAX_NOTE_WIDTH = 560;
export const MAX_NOTE_HEIGHT = 650;

export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface TrashNote extends PostItNote {
  deletedAt: number; // Timestamp when note was moved to trash
}
