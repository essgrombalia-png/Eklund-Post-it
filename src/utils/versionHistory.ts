import { PostItNote, NoteVersion, NoteChangeType } from '../types';

export function createVersionSnapshot(
  note: PostItNote,
  changeType: NoteChangeType = 'content_edit',
  summary?: string
): NoteVersion {
  return {
    id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    title: note.title,
    content: note.content,
    color: note.color,
    drawingData: note.drawingData,
    imageUrl: note.imageUrl,
    imageConfig: note.imageConfig ? { ...note.imageConfig } : undefined,
    fontFamily: note.fontFamily,
    fontSize: note.fontSize,
    changeType,
    summary,
  };
}

export function ensureNoteVersions(note: PostItNote): NoteVersion[] {
  if (note.versions && note.versions.length > 0) {
    return note.versions;
  }
  // Initialize with creation snapshot
  const initialSnapshot: NoteVersion = {
    id: `ver-init-${note.id}`,
    timestamp: note.createdAt || Date.now(),
    title: note.title,
    content: note.content,
    color: note.color,
    drawingData: note.drawingData,
    imageUrl: note.imageUrl,
    imageConfig: note.imageConfig ? { ...note.imageConfig } : undefined,
    fontFamily: note.fontFamily,
    fontSize: note.fontSize,
    changeType: 'created',
    summary: 'Lapp skapad',
  };
  return [initialSnapshot];
}

export function addVersionSnapshot(
  note: PostItNote,
  changeType: NoteChangeType = 'content_edit',
  summary?: string,
  maxVersions = 30
): PostItNote {
  const existing = ensureNoteVersions(note);
  const latest = existing[0];

  // Check if content/state actually changed compared to latest snapshot
  if (
    latest &&
    latest.title === note.title &&
    latest.content === note.content &&
    latest.color === note.color &&
    latest.drawingData === note.drawingData &&
    latest.imageUrl === note.imageUrl &&
    latest.fontFamily === note.fontFamily &&
    latest.fontSize === note.fontSize &&
    JSON.stringify(latest.imageConfig || null) === JSON.stringify(note.imageConfig || null)
  ) {
    return note;
  }

  const newSnapshot = createVersionSnapshot(note, changeType, summary);
  const updatedVersions = [newSnapshot, ...existing].slice(0, maxVersions);

  return {
    ...note,
    versions: updatedVersions,
    updatedAt: Date.now(),
  };
}

export function restoreNoteVersion(
  currentNote: PostItNote,
  versionToRestore: NoteVersion
): PostItNote {
  const timeStr = new Date(versionToRestore.timestamp).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = new Date(versionToRestore.timestamp).toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
  });

  const updatedNote: PostItNote = {
    ...currentNote,
    title: versionToRestore.title,
    content: versionToRestore.content,
    color: versionToRestore.color,
    drawingData: versionToRestore.drawingData,
    imageUrl: versionToRestore.imageUrl,
    imageConfig: versionToRestore.imageConfig ? { ...versionToRestore.imageConfig } : undefined,
    fontFamily: versionToRestore.fontFamily || currentNote.fontFamily,
    fontSize: versionToRestore.fontSize || currentNote.fontSize,
    updatedAt: Date.now(),
  };

  // Record this restoration in history
  return addVersionSnapshot(
    updatedNote,
    'restored',
    `Återställd till version från ${dateStr} kl ${timeStr}`
  );
}

export function getChangeTypeDetails(changeType?: NoteChangeType) {
  switch (changeType) {
    case 'created':
      return {
        label: 'Skapad',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        iconName: 'Sparkles',
      };
    case 'content_edit':
      return {
        label: 'Textändring',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        iconName: 'FileEdit',
      };
    case 'drawing':
      return {
        label: 'Apple Pencil / Skiss',
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        iconName: 'Pencil',
      };
    case 'photo':
      return {
        label: 'Foto / Bild',
        badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        iconName: 'Camera',
      };
    case 'color':
      return {
        label: 'Färgändring',
        badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800',
        iconName: 'Palette',
      };
    case 'font':
      return {
        label: 'Typsnitt / Stil',
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        iconName: 'Type',
      };
    case 'restored':
      return {
        label: 'Återställd version',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        iconName: 'RotateCcw',
      };
    default:
      return {
        label: 'Uppdatering',
        badgeClass: 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
        iconName: 'Clock',
      };
  }
}

export function formatRelativeTimelineTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 15) return 'Just nu';
  if (diffSec < 60) return `För ${diffSec} sek sedan`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `För ${diffMin} min sedan`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `För ${diffHours} tim sedan`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Igår';
  if (diffDays < 7) return `För ${diffDays} dagar sedan`;
  return new Date(timestamp).toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
  });
}
