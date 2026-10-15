export const EXPORT_PADDING = 48;

/** Keep raster exports within browser canvas limits without dropping branches. */
export function rasterRatio(width: number, height: number) {
  return Math.min(2, 16384 / width, 16384 / height, Math.sqrt(24_000_000 / (width * height)));
}

/** Overlapping tiles preserve detail in PDFs that would be unreadable on one sheet. */
export function pdfTiles(width: number, height: number) {
  const tileW = 1120, tileH = 1500, overlap = 80;
  const columns = Math.max(1, Math.ceil((width - overlap) / (tileW - overlap)));
  const rows = Math.max(1, Math.ceil((height - overlap) / (tileH - overlap)));
  return Array.from({ length: rows * columns }, (_, i) => ({
    x: (i % columns) * (tileW - overlap),
    y: Math.floor(i / columns) * (tileH - overlap),
    width: Math.min(tileW, width - (i % columns) * (tileW - overlap)),
    height: Math.min(tileH, height - Math.floor(i / columns) * (tileH - overlap)),
  }));
}