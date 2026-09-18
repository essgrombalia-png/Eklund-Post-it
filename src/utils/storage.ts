import {
  PostItNote,
  TrashNote,
  DeskTheme,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  MIN_NOTE_WIDTH,
  MIN_NOTE_HEIGHT,
  TRASH_RETENTION_MS,
  TRASH_RETENTION_DAYS,
} from '../types';

const STORAGE_KEY_NOTES = 'postit_notes_v1';
const STORAGE_KEY_TRASH = 'postit_trash_v1';
const STORAGE_KEY_THEME = 'postit_theme_v1';

export const INITIAL_DEMO_NOTES: PostItNote[] = [];

const LEGACY_DEMO_IDS = new Set([
  'note-welcome',
  'note-touch-tips',
  'note-todo',
  'note-ideas',
  'note-apple-pencil-sketch',
]);

export function loadNotesFromStorage(): PostItNote[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NOTES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Exclude legacy demo notes so the desk starts completely clean
        const userNotes = parsed.filter(
          (n: PostItNote) =>
            n &&
            typeof n.id === 'string' &&
            !LEGACY_DEMO_IDS.has(n.id) &&
            !n.id.startsWith('note-welcome') &&
            !n.id.startsWith('note-touch-tips') &&
            !n.id.startsWith('note-todo') &&
            !n.id.startsWith('note-ideas') &&
            !n.id.startsWith('note-apple-pencil-sketch')
        );

        if (userNotes.length > 0) {
          return userNotes.map((n: PostItNote) => ({
            ...n,
            width: Math.max(n.width || DEFAULT_NOTE_WIDTH, MIN_NOTE_WIDTH),
            height: Math.max(n.height || DEFAULT_NOTE_HEIGHT, MIN_NOTE_HEIGHT),
          }));
        }
      }
    }
  } catch (error) {
    console.warn('Could not load notes from localStorage', error);
  }
  return [];
}

export function saveNotesToStorage(notes: PostItNote[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
    return true;
  } catch (error) {
    console.error('Could not save notes to localStorage', error);
    return false;
  }
}

export function loadThemeFromStorage(): DeskTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME) as DeskTheme;
    const validThemes: DeskTheme[] = [
      'light',
      'dark',
      'cork',
      'wood',
      'dark-wood',
      'paper',
      'blueprint',
    ];
    if (saved && validThemes.includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'light';
}

export function saveThemeToStorage(theme: DeskTheme) {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch {
    // ignore
  }
}

export function exportNotesToJson(notes: PostItNote[]) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `post-it-export-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseImportedNotes(jsonString: string): PostItNote[] | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Validate that items look like PostItNotes
      const validNotes = parsed.filter(
        (item) => item && typeof item.id === 'string' && typeof item.content === 'string'
      );
      if (validNotes.length > 0) {
        return validNotes;
      }
    }
  } catch (err) {
    console.error('Kunde inte läsa JSON-fil för import', err);
  }
  return null;
}

/**
 * Loads trashed notes and automatically purges any notes older than 30 days.
 */
export function loadTrashFromStorage(): TrashNote[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TRASH);
    if (!saved) return [];

    const parsed: TrashNote[] = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    // Filter out notes older than 30 days
    const activeTrash = parsed.filter((note) => {
      const deletedAt = note.deletedAt || note.updatedAt || now;
      return now - deletedAt <= TRASH_RETENTION_MS;
    });

    // If any expired notes were removed, update localStorage
    if (activeTrash.length !== parsed.length) {
      saveTrashToStorage(activeTrash);
    }

    return activeTrash;
  } catch (error) {
    console.warn('Could not load trash from localStorage', error);
    return [];
  }
}

/**
 * Saves trashed notes, ensuring retention rules (max 30 days).
 */
export function saveTrashToStorage(trash: TrashNote[]): boolean {
  try {
    const now = Date.now();
    const activeTrash = trash.filter((note) => {
      const deletedAt = note.deletedAt || note.updatedAt || now;
      return now - deletedAt <= TRASH_RETENTION_MS;
    });
    localStorage.setItem(STORAGE_KEY_TRASH, JSON.stringify(activeTrash));
    return true;
  } catch (error) {
    console.error('Could not save trash to localStorage', error);
    return false;
  }
}

/**
 * Calculates remaining days in trash before permanent deletion (1-30 days).
 */
export function getDaysRemainingInTrash(deletedAt: number): number {
  const now = Date.now();
  const elapsedMs = Math.max(0, now - deletedAt);
  const remainingMs = Math.max(0, TRASH_RETENTION_MS - elapsedMs);
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

/**
 * Formats deleted timestamp to human-readable Swedish date/time string.
 */
export function formatDeletedDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Idag kl. ${timeStr}`;
  }
  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
