import type { Settings } from "./types";

export const EXPORT_PADDING = 48;

// ─── Shared card-size constants ─────────────────────────────────────────────
//
// "vertical"  = top-down portrait card (used by the on-screen tree and
//               vertical PDF export).
// "horizontal" = compact row-style card (used by horizontal PDF export).
//
// Both the layout engine and the export pipeline must call `cardDimensions()`
// so that a single change here propagates everywhere without drift.

/** Base dimensions before the user's nodeSize scale is applied. */
const BASE = {
  vertical: { w: 150, h: 148 },
  horizontal: { w: 320, h: 76 },
} as const;

export type CardMode = "vertical" | "horizontal";

/**
 * Returns the pixel dimensions of a card at the given settings.
 * For vertical mode the height is also floored so the photo fits.
 */
export function cardDimensions(
  settings: Pick<Settings, "nodeSize" | "photoSize">,
  mode: CardMode = "vertical",
): { cardW: number; cardH: number } {
  const scale = settings.nodeSize / 100;
  if (mode === "horizontal") {
    return {
      cardW: Math.round(BASE.horizontal.w * scale),
      cardH: Math.round(BASE.horizontal.h * scale),
    };
  }
  return {
    cardW: Math.round(BASE.vertical.w * scale),
    cardH: Math.max(Math.round(BASE.vertical.h * scale), settings.photoSize + 72),
  };
}

/** Keep raster exports within browser canvas limits without dropping branches. */
export function rasterRatio(width: number, height: number) {
  return Math.min(2, 16384 / width, 16384 / height, Math.sqrt(24_000_000 / (width * height)));
}

/** Overlapping tiles preserve detail in PDFs that would be unreadable on one sheet. */
export function pdfTiles(width: number, height: number, landscape = false) {
  const tileW = landscape ? 1500 : 1120,
    tileH = landscape ? 1120 : 1500,
    overlap = 80;
  const columns = Math.max(1, Math.ceil((width - overlap) / (tileW - overlap)));
  const rows = Math.max(1, Math.ceil((height - overlap) / (tileH - overlap)));
  return Array.from({ length: rows * columns }, (_, i) => ({
    x: (i % columns) * (tileW - overlap),
    y: Math.floor(i / columns) * (tileH - overlap),
    width: Math.min(tileW, width - (i % columns) * (tileW - overlap)),
    height: Math.min(tileH, height - Math.floor(i / columns) * (tileH - overlap)),
  }));
}

// ─── Dev-only overlap check ──────────────────────────────────────────────────

export interface NodeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Logs an error for every pair of nodes whose rectangles overlap.
 * Only runs in development builds (import.meta.env.DEV).
 */
export function checkOverlaps(nodes: NodeRect[]): void {
  if (!import.meta.env.DEV) return;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
      const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
      if (overlapX && overlapY) {
        console.error(
          `[TreeMind] Layout overlap: node "${a.id}" and "${b.id}" intersect.\n` +
            `  A: x=${a.x} y=${a.y} w=${a.w} h=${a.h}\n` +
            `  B: x=${b.x} y=${b.y} w=${b.w} h=${b.h}`,
        );
      }
    }
  }
}
