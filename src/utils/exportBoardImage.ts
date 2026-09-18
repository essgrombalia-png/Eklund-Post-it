import { PostItNote, DeskTheme, DESK_THEMES, COLOR_CONFIGS } from '../types';

export interface BoardExportOptions {
  notes: PostItNote[];
  theme: DeskTheme;
  mode: 'all_notes' | 'current_view';
  zoom?: number;
  panOffset?: { x: number; y: number };
  viewportWidth?: number;
  viewportHeight?: number;
}

/**
 * Exports the entire Post-it board or current view to a high-resolution PNG image
 */
export async function exportBoardToImage({
  notes,
  theme,
  mode,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight - 100,
}: BoardExportOptions): Promise<void> {
  const dpr = 2; // High-resolution Retina export multiplier

  let exportX = 0;
  let exportY = 0;
  let exportWidth = 1920;
  let exportHeight = 1080;

  if (mode === 'all_notes' && notes.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    notes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 100;
    exportX = minX - padding;
    exportY = minY - padding;
    exportWidth = Math.max(800, maxX - minX + padding * 2);
    exportHeight = Math.max(600, maxY - minY + padding * 2);
  } else if (mode === 'current_view') {
    exportX = -panOffset.x / zoom;
    exportY = -panOffset.y / zoom;
    exportWidth = viewportWidth / zoom;
    exportHeight = viewportHeight / zoom;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(exportWidth * dpr);
  canvas.height = Math.round(exportHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.translate(-exportX, -exportY);

  // 1. Draw Desk Background
  drawDeskBackground(ctx, exportX, exportY, exportWidth, exportHeight, theme);

  // 2. Sort notes by zIndex so they stack realistically
  const sortedNotes = [...notes].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

  // 3. Draw each note
  for (const note of sortedNotes) {
    // Check if within bounds
    if (
      note.x + note.width < exportX ||
      note.x > exportX + exportWidth ||
      note.y + note.height < exportY ||
      note.y > exportY + exportHeight
    ) {
      continue;
    }

    await drawSingleNote(ctx, note);
  }

  // 4. Download file
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `postit-skrivbord-${dateStr}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Draws realistic textures/patterns for desk backgrounds
 */
function drawDeskBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: DeskTheme
) {
  if (theme === 'dark') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#334155';
    for (let gx = Math.floor(x / 24) * 24; gx < x + w; gx += 24) {
      for (let gy = Math.floor(y / 24) * 24; gy < y + h; gy += 24) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme === 'cork') {
    ctx.fillStyle = '#cca479';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(120, 60, 15, 0.08)';
    for (let gx = Math.floor(x / 28) * 28; gx < x + w; gx += 28) {
      for (let gy = Math.floor(y / 28) * 28; gy < y + h; gy += 28) {
        ctx.beginPath();
        ctx.arc(gx + (gy % 14), gy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme === 'wood') {
    ctx.fillStyle = '#c49a6c';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    for (let gx = Math.floor(x / 50) * 50; gx < x + w; gx += 50) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
  } else if (theme === 'dark-wood') {
    ctx.fillStyle = '#271a14';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let gx = Math.floor(x / 60) * 60; gx < x + w; gx += 60) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
  } else if (theme === 'paper') {
    ctx.fillStyle = '#fbf9f4';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d6cec0';
    for (let gx = Math.floor(x / 20) * 20; gx < x + w; gx += 20) {
      for (let gy = Math.floor(y / 20) * 20; gy < y + h; gy += 20) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme === 'blueprint') {
    ctx.fillStyle = '#162a45';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.18)';
    ctx.lineWidth = 1;
    for (let gx = Math.floor(x / 30) * 30; gx < x + w; gx += 30) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gy = Math.floor(y / 30) * 30; gy < y + h; gy += 30) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
  } else {
    // Default light grid
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#94a3b8';
    for (let gx = Math.floor(x / 24) * 24; gx < x + w; gx += 24) {
      for (let gy = Math.floor(y / 24) * 24; gy < y + h; gy += 24) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Draws a single post-it note including background, adhesive strip, text, photos, patterns & sketches
 */
async function drawSingleNote(ctx: CanvasRenderingContext2D, note: PostItNote) {
  const bgMap: Record<string, { bg: string; header: string; text: string; border: string }> = {
    yellow: { bg: '#fef9c3', header: '#fef08a', text: '#451a03', border: '#fde047' },
    pink: { bg: '#fce7f3', header: '#fbcfe8', text: '#500724', border: '#f9a8d4' },
    blue: { bg: '#e0f2fe', header: '#bae6fd', text: '#082f49', border: '#7dd3fc' },
    green: { bg: '#dcfce7', header: '#bbf7d0', text: '#052e16', border: '#86efac' },
    orange: { bg: '#ffedd5', header: '#fed7aa', text: '#431407', border: '#fdba74' },
    purple: { bg: '#f3e8ff', header: '#e9d5ff', text: '#3b0764', border: '#d8b4fe' },
  };

  const scheme = bgMap[note.color] || bgMap.yellow;

  ctx.save();
  ctx.translate(note.x + note.width / 2, note.y + note.height / 2);
  ctx.rotate(((note.rotation || 0) * Math.PI) / 180);
  ctx.translate(-note.width / 2, -note.height / 2);

  // Note Drop Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // Note Card Body
  ctx.fillStyle = scheme.bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, note.width, note.height, 14);
  ctx.fill();

  // Reset shadow for inner elements
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = scheme.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top adhesive strip
  ctx.fillStyle = scheme.header;
  ctx.beginPath();
  ctx.roundRect(0, 0, note.width, 36, [14, 14, 0, 0]);
  ctx.fill();

  // Title
  if (note.title) {
    ctx.fillStyle = scheme.text;
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(note.title, 14, 23, note.width - 28);
  }

  // Draw paper pattern if configured
  if (note.paperStyle === 'lined') {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let y = 50; y < note.height - 20; y += 28) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(note.width - 10, y);
      ctx.stroke();
    }
  } else if (note.paperStyle === 'grid') {
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let x = 16; x < note.width - 10; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, note.height - 10);
      ctx.stroke();
    }
    for (let y = 48; y < note.height - 10; y += 20) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(note.width - 10, y);
      ctx.stroke();
    }
  } else if (note.paperStyle === 'dots') {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    for (let x = 18; x < note.width - 12; x += 18) {
      for (let y = 50; y < note.height - 12; y += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  let yPos = 56;

  // Attached Photo
  if (note.imageUrl) {
    try {
      const img = new Image();
      img.src = note.imageUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      const photoH = Math.min(note.imageConfig?.height || 140, Math.round(note.height * 0.55));
      const photoW = note.width - 28;
      ctx.drawImage(img, 14, yPos, photoW, photoH);
      yPos += photoH + 14;
    } catch {
      // ignore
    }
  }

  // Text Content
  const fontSizePx = note.fontSize === 'sm' ? 14 : note.fontSize === 'lg' ? 20 : 16;
  let fontFamily = '"Plus Jakarta Sans", sans-serif';
  if (note.fontFamily === 'handwriting') {
    fontFamily = 'Caveat, cursive';
  } else if (note.fontFamily === 'kalam') {
    fontFamily = 'Kalam, cursive';
  } else if (note.fontFamily === 'casual') {
    fontFamily = '"Patrick Hand", cursive';
  }

  ctx.font = `${fontSizePx}px ${fontFamily}`;
  ctx.fillStyle = scheme.text;

  const lines = note.content.split('\n');
  const lineHeight = fontSizePx * 1.45;
  for (const line of lines) {
    if (yPos > note.height - 20) break;
    ctx.fillText(line, 14, yPos, note.width - 28);
    yPos += lineHeight;
  }

  // Freehand Sketch
  if (note.drawingData) {
    try {
      const sketchImg = new Image();
      sketchImg.src = note.drawingData;
      await new Promise((resolve) => {
        sketchImg.onload = resolve;
        sketchImg.onerror = resolve;
      });
      ctx.drawImage(sketchImg, 0, 36, note.width, Math.max(10, note.height - 36));
    } catch {
      // ignore
    }
  }

  // Realistic Pushpin if pinned
  if (note.isPinned) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(note.width / 2, 16, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pin highlight
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(note.width / 2 - 2, 14, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
