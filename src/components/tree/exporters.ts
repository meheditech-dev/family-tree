import { getState } from "@/lib/tree/store";
import { downloadBlob } from "@/lib/tree/deliver-file";
import { EXPORT_PADDING, pdfTiles, rasterRatio } from "@/lib/tree/export-geometry";

export function exportJson() {
  const { members, settings } = getState();
  const blob = new Blob([JSON.stringify({ members, settings }, null, 2)], { type: "application/json" });
  downloadBlob(blob, "treemind-backup.json");
}

export type ExportFormat = "png" | "jpg" | "pdf";
export interface PreparedExport { blob: Blob; filename: string }

function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob); else reject(new Error("Image encoding failed"));
  }, type, 0.95));
}

/** Capture an offscreen copy, never the panned, zoomed or filtered viewport. */
export async function prepareTreeExport(format: ExportFormat): Promise<PreparedExport> {
  const source = document.getElementById("tree-content");
  if (!source) throw new Error("Tree unavailable");
  await document.fonts.ready;
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.querySelectorAll(".no-print, [data-export-exclude]").forEach((el) => el.remove());
  clone.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
    el.style.opacity = "1";
    el.classList.remove("ring-4", "ring-primary/30", "ring-warning");
  });
  clone.querySelectorAll<SVGElement>("g[opacity]").forEach((el) => el.setAttribute("opacity", "1"));
  const width = Number(source.dataset["treeWidth"]) + EXPORT_PADDING * 2;
  const height = Number(source.dataset["treeHeight"]) + EXPORT_PADDING * 2;
  if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error("Invalid tree dimensions");
  const wrapper = document.createElement("div");
  wrapper.className = "tree-export-surface";
  Object.assign(wrapper.style, { width: `${width}px`, height: `${height}px` });
  Object.assign(clone.style, { left: `${EXPORT_PADDING}px`, top: `${EXPORT_PADDING}px`, transform: "none" });
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  try {
    await Promise.all(Array.from(clone.querySelectorAll("img"), (img) => img.decode()));
    const { toCanvas } = await import("html-to-image");
    const backgroundColor = getComputedStyle(wrapper).backgroundColor;
    const capture = (w: number, h: number, ratio: number) => toCanvas(wrapper, {
      width: w, height: h, pixelRatio: ratio, backgroundColor,
      skipAutoScale: true, style: { position: "relative", left: "0", top: "0", opacity: "1", zIndex: "auto" },
    });
    if (format !== "pdf") {
      const canvas = await capture(width, height, rasterRatio(width, height));
      return { blob: await canvasBlob(canvas, format === "jpg" ? "image/jpeg" : "image/png"), filename: `treemind-tree.${format}` };
    }
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: width > height ? "landscape" : "portrait", unit: "pt", format: "a3", compress: true });
    const addCanvas = (canvas: HTMLCanvasElement) => {
      const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
      const margin = 32;
      const scale = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
      const w = canvas.width * scale, h = canvas.height * scale;
      pdf.addImage(canvas, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
    };
    // First sheet always contains the whole tree. Large trees also get readable detail sheets.
    addCanvas(await capture(width, height, rasterRatio(width, height)));
    const tiles = pdfTiles(width, height);
    if (tiles.length > 1) {
      for (const tile of tiles) {
        wrapper.style.width = `${tile.width}px`;
        wrapper.style.height = `${tile.height}px`;
        clone.style.left = `${EXPORT_PADDING - tile.x}px`;
        clone.style.top = `${EXPORT_PADDING - tile.y}px`;
        pdf.addPage("a3", "portrait");
        addCanvas(await capture(tile.width, tile.height, 2));
      }
    }
    return { blob: pdf.output("blob"), filename: "treemind-tree.pdf" };
  } finally { wrapper.remove(); }
}
