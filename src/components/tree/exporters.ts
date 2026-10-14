import { getState } from "@/lib/tree/store";
import { download } from "@/lib/tree/helpers";

export function exportJson() {
  const { members, settings } = getState();
  const blob = new Blob([JSON.stringify({ members, settings }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  download("treemind-backup.json", url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPng() {
  const el = document.getElementById("tree-content");
  if (!el) return;
  const { toPng } = await import("html-to-image");
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--canvas");
  const url = await toPng(el, { ...(bg ? { backgroundColor: bg } : {}), pixelRatio: 2, style: { transform: "none" } });
  download("treemind-tree.png", url);
}

export function exportPdf() {
  window.print();
}
