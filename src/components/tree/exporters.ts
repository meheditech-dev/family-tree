/**
 * Tree export pipeline.
 *
 * PDF path
 * ─────────
 * 1. Build a standalone <svg> element with every card and connector drawn as
 *    native SVG primitives (rect, text, circle, path).  No foreignObject,
 *    no pan/zoom, no CSS variable resolution issues.
 * 2. Serialize the SVG to a Blob (image/svg+xml).
 * 3. Rasterise it to a canvas at a safe pixel ratio by loading it into an
 *    <img> element via a Blob URL.  This keeps Bangla text sharp because the
 *    browser's own SVG renderer draws it (same engine as the screen).
 * 4. Slice the canvas into A3-landscape page-sized tiles and embed them in
 *    jsPDF.  Each tile is a separate page; the first page is always an
 *    overview that fits the whole tree.
 *
 * Raster path (PNG / JPG)
 * ────────────────────────
 * Same SVG → canvas pipeline at full resolution, exported as image/png or
 * image/jpeg.  Canvas size is capped to avoid browser limits.
 *
 * No svg2pdf.js, no html-to-image for the PDF path, no DOM cloning.
 */

import { getState } from "@/lib/tree/store";
import { downloadBlob } from "@/lib/tree/deliver-file";
import {
  EXPORT_PADDING,
  cardDimensions,
  checkOverlaps,
} from "@/lib/tree/export-geometry";
import {
  analyze,
  edgePath,
  layoutTree,
  layoutTreeHorizontal,
} from "@/lib/tree/layout";
import type { Member } from "@/lib/tree/types";
import { relationKey } from "@/lib/tree/helpers";

// ─── public API ───────────────────────────────────────────────────────────────

export function exportJson() {
  const { members, settings } = getState();
  const blob = new Blob([JSON.stringify({ members, settings }, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "treemind-backup.json");
}

export type ExportFormat   = "png" | "jpg" | "pdf";
export type PdfLayout      = "vertical" | "horizontal";
export interface PreparedExport { blob: Blob; filename: string }

// re-export so callers only need one import
export { cardDimensions } from "@/lib/tree/export-geometry";

// ─── SVG namespace helper ──────────────────────────────────────────────────────

const NS = "http://www.w3.org/2000/svg";

/** Bootstrap heart-fill (16×16 viewBox); centred on each marriage's midpoint. */
const HEART_PATH = "M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z";
function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
}
function set(el: Element, attrs: Record<string, string | number>) {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
}

// ─── colour resolution ────────────────────────────────────────────────────────

/** Read a CSS custom property from :root and resolve oklch() to rgb() */
const _colorCache = new Map<string, string>();

function resolveColor(raw: string): string {
  if (!raw.startsWith("oklch")) return raw;
  // Use a temporary, document-attached element so getComputedStyle works
  const el = document.createElement("span");
  el.style.cssText = `position:absolute;visibility:hidden;color:${raw}`;
  document.body.appendChild(el);
  const result = getComputedStyle(el).color || "#888888";
  el.remove();
  return result;
}

function color(varName: string, fallback = "#888888"): string {
  if (_colorCache.has(varName)) return _colorCache.get(varName)!;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const resolved = resolveColor(raw || fallback);
  _colorCache.set(varName, resolved);
  return resolved;
}

// Clear the cache each export so theme changes are picked up
function clearColorCache() { _colorCache.clear(); }

// ─── colour shortcuts ─────────────────────────────────────────────────────────

const FONT = "'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif";
const R    = 12; // card corner radius

function borderColor(m: Member) {
  return m.deathYear ? color("--deceased", "#9ca3af") : color("--primary", "#14b8a6");
}
function genderDotColor(m: Member) {
  if (m.deathYear) return color("--deceased", "#9ca3af");
  return m.gender === "male" ? color("--male", "#60a5fa") : color("--female", "#f472b6");
}
function genDotColor(gen: number) {
  return color(`--gen-${Math.min(gen, 4)}`, "#888");
}
function presentStr() {
  return getState().settings.language === "bn" ? "বর্তমান" : "Present";
}

// ─── card SVG builders ────────────────────────────────────────────────────────

interface CardArgs {
  m:       Member;
  x:       number;
  y:       number;
  w:       number;
  h:       number;
  photo:   number;
  gen:     number;
  rel:     string;
  opacity: number;
  variant: "vertical" | "row";
}

/** Portrait card (vertical layout) */
function buildVerticalCard(a: CardArgs): SVGGElement {
  const { m, x, y, w, h, photo, gen, rel, opacity } = a;
  const dead   = !!m.deathYear;
  const fg     = dead ? color("--muted-foreground", "#9ca3af") : color("--foreground", "#111827");
  const muted  = color("--muted-foreground", "#6b7280");
  const bg     = color("--card", "#ffffff");
  const border = borderColor(m);
  const relClr = color("--relation", border);

  const g = svgEl("g");
  set(g, { transform: `translate(${x},${y})`, opacity: String(opacity) });

  // Background
  const rect = svgEl("rect");
  set(rect, { x:0, y:0, width:w, height:h, rx:R, ry:R, fill:bg, stroke:border, "stroke-width":1.5 });
  g.appendChild(rect);

  // Avatar area
  const cx = w / 2;
  const cy = 14 + photo / 2;

  const ring = svgEl("circle");
  set(ring, { cx, cy, r: photo/2+2, fill:"none", stroke:border, "stroke-width":2, opacity:0.5 });
  g.appendChild(ring);

  // Avatar placeholder (person silhouette)
  const avBg = svgEl("circle");
  set(avBg, { cx, cy, r:photo/2, fill:color("--muted","#f3f4f6") });
  g.appendChild(avBg);
  if (m.photo) {
    const clipId = `c${m.id}_${x}_${y}`;
    const defs = svgEl("defs"); const cp = svgEl("clipPath"); cp.id = clipId;
    const cc = svgEl("circle"); set(cc, { cx, cy, r:photo/2 });
    cp.appendChild(cc); defs.appendChild(cp); g.appendChild(defs);
    const img = svgEl("image");
    set(img, { x:cx-photo/2, y:cy-photo/2, width:photo, height:photo,
               href:m.photo, "clip-path":`url(#${clipId})` });
    g.appendChild(img);
  } else {
    const hd = svgEl("circle");
    set(hd, { cx, cy:cy - photo*0.13, r:photo*0.19, fill:muted });
    g.appendChild(hd);
    const bd = svgEl("path");
    const br = photo*0.25, by2 = cy+photo*0.08;
    set(bd, { d:`M${cx-br},${by2+br*1.2}A${br},${br*1.1} 0 0 1 ${cx+br},${by2+br*1.2}`, fill:muted });
    g.appendChild(bd);
  }

  // Text block
  const ty = 14 + photo + 10;
  const tw = w - 12;

  const nm = svgEl("text");
  set(nm, { x:cx, y:ty, "font-family":FONT, "font-size":13, "font-weight":700,
            fill:fg, "text-anchor":"middle", "dominant-baseline":"hanging" });
  nm.textContent = m.name.length > 16 ? m.name.slice(0,15)+"…" : m.name;
  g.appendChild(nm);

  const gd = svgEl("circle");
  set(gd, { cx:cx + Math.min(m.name.length*4, tw/2)+6, cy:ty+7, r:3.5, fill:genderDotColor(m) });
  g.appendChild(gd);

  if (rel) {
    const rt = svgEl("text");
    set(rt, { x:cx, y:ty+17, "font-family":FONT, "font-size":10, "font-weight":500,
              fill:relClr, "text-anchor":"middle", "dominant-baseline":"hanging" });
    rt.textContent = rel.length > 18 ? rel.slice(0,17)+"…" : rel;
    g.appendChild(rt);
  }

  const life = `${m.birthYear ?? "?"} – ${m.deathYear ?? presentStr()}`;
  const lt = svgEl("text");
  set(lt, { x:cx, y:ty+30, "font-family":FONT, "font-size":10, fill:muted,
            "text-anchor":"middle", "dominant-baseline":"hanging" });
  lt.textContent = life;
  g.appendChild(lt);

  const genD = svgEl("circle");
  set(genD, { cx:cx - life.length*3 - 7, cy:ty+35, r:3.5, fill:genDotColor(gen) });
  g.appendChild(genD);

  return g;
}

/** Compact row card (horizontal layout) */
function buildRowCard(a: CardArgs): SVGGElement {
  const { m, x, y, w, h, photo, gen, rel, opacity } = a;
  const dead   = !!m.deathYear;
  const fg     = dead ? color("--muted-foreground","#9ca3af") : color("--foreground","#111827");
  const muted  = color("--muted-foreground","#6b7280");
  const bg     = color("--card","#ffffff");
  const border = borderColor(m);
  const relClr = color("--relation", border);

  const g = svgEl("g");
  set(g, { transform:`translate(${x},${y})`, opacity:String(opacity) });

  // Background
  const rect = svgEl("rect");
  set(rect, { x:0, y:0, width:w, height:h, rx:R, ry:R, fill:bg, stroke:border, "stroke-width":1.5 });
  g.appendChild(rect);

  // Left colour strip (4 px)
  const STRIP = 4;
  const s1 = svgEl("rect"); set(s1, { x:0, y:0, width:STRIP, height:h, rx:R, ry:R, fill:border }); g.appendChild(s1);
  const s2 = svgEl("rect"); set(s2, { x:STRIP/2, y:0, width:STRIP/2, height:h, fill:border });     g.appendChild(s2);

  // Avatar
  const cx  = STRIP + 10 + photo/2;
  const cy  = h/2;
  const ring = svgEl("circle");
  set(ring, { cx, cy, r:photo/2+2, fill:"none", stroke:border, "stroke-width":2, opacity:0.5 });
  g.appendChild(ring);

  const avBg = svgEl("circle"); set(avBg, { cx, cy, r:photo/2, fill:color("--muted","#f3f4f6") }); g.appendChild(avBg);
  if (m.photo) {
    const clipId = `cr${m.id}_${x}_${y}`;
    const defs = svgEl("defs"); const cp = svgEl("clipPath"); cp.id = clipId;
    const cc = svgEl("circle"); set(cc, { cx, cy, r:photo/2 });
    cp.appendChild(cc); defs.appendChild(cp); g.appendChild(defs);
    const img = svgEl("image");
    set(img, { x:cx-photo/2, y:cy-photo/2, width:photo, height:photo,
               href:m.photo, "clip-path":`url(#${clipId})` });
    g.appendChild(img);
  } else {
    const hd = svgEl("circle"); set(hd, { cx, cy:cy-photo*0.13, r:photo*0.19, fill:muted }); g.appendChild(hd);
    const bd = svgEl("path");
    const br = photo*0.25, by2 = cy+photo*0.08;
    set(bd, { d:`M${cx-br},${by2+br*1.2}A${br},${br*1.1} 0 0 1 ${cx+br},${by2+br*1.2}`, fill:muted });
    g.appendChild(bd);
  }

  // Text
  const tx = STRIP + 10*2 + photo;
  const tw = w - tx - 38;

  const nm = svgEl("text");
  set(nm, { x:tx, y:h*0.36, "font-family":FONT, "font-size":13, "font-weight":700,
            fill:fg, "text-anchor":"start", "dominant-baseline":"middle" });
  nm.textContent = m.name.length > 20 ? m.name.slice(0,19)+"…" : m.name;
  g.appendChild(nm);

  const gd = svgEl("circle");
  set(gd, { cx:tx + Math.min(m.name.length*7.5, tw*0.7)+6, cy:h*0.36, r:3.5, fill:genderDotColor(m) });
  g.appendChild(gd);

  // Relation pill
  if (rel) {
    const pillW = Math.min(80, tw*0.45), pillH = 15, pillX = w - 38 - pillW;
    const pb = svgEl("rect");
    set(pb, { x:pillX, y:(h-pillH)/2, width:pillW, height:pillH, rx:7, ry:7,
              fill:border, opacity:0.15 });
    g.appendChild(pb);
    const pt = svgEl("text");
    set(pt, { x:pillX+pillW/2, y:h/2, "font-family":FONT, "font-size":9, "font-weight":600,
              fill:relClr, "text-anchor":"middle", "dominant-baseline":"middle" });
    pt.textContent = rel.length > 14 ? rel.slice(0,13)+"…" : rel;
    g.appendChild(pt);
  }

  const life = `${m.birthYear ?? "?"} – ${m.deathYear ?? presentStr()}`;
  const lt = svgEl("text");
  set(lt, { x:tx, y:h*0.66, "font-family":FONT, "font-size":10, fill:muted,
            "text-anchor":"start", "dominant-baseline":"middle" });
  lt.textContent = life;
  g.appendChild(lt);

  const genD = svgEl("circle");
  set(genD, { cx:tx + life.length*5.5 + 6, cy:h*0.66, r:3.5, fill:genDotColor(gen) });
  g.appendChild(genD);

  return g;
}

// ─── Full-tree SVG builder ────────────────────────────────────────────────────

function buildTreeSVG(horizontal: boolean): SVGSVGElement {
  const { members, settings, ui } = getState();
  const cardMode = horizontal ? "horizontal" : "vertical";
  const { cardW, cardH } = cardDimensions(settings, cardMode);

  const opts = horizontal
    ? { cardW, cardH, gapX: cardW + 60, gapY: cardH + 24, spouseGap: 32 }
    : { cardW, cardH, gapX: 72, gapY: 28, spouseGap: 28 };

  const layout   = horizontal ? layoutTreeHorizontal(members, opts) : layoutTree(members, opts);
  const analysis = analyze(members);

  checkOverlaps(layout.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, w: cardW, h: cardH })));

  const PAD  = EXPORT_PADDING;
  const svgW = layout.width  + PAD * 2;
  const svgH = layout.height + PAD * 2;

  const svg = svgEl("svg");
  set(svg, { xmlns:NS, width:svgW, height:svgH, viewBox:`0 0 ${svgW} ${svgH}` });

  // Background
  const bgR = svgEl("rect");
  set(bgR, { x:0, y:0, width:svgW, height:svgH, fill:color("--canvas","#f8fafc") });
  svg.appendChild(bgR);

  // Connectors
  const connG = svgEl("g");
  set(connG, { transform:`translate(${PAD},${PAD})` });
  const pri = color("--primary","#14b8a6");
  const lineStyle = settings.lineStyle;

  for (const l of layout.spouseLinks) {
    // Hub links are diagonal (hub above → spouse below); couple links are inline.
    const isHub = horizontal ? l.x1 !== l.x2 : l.y1 !== l.y2;
    if (isHub) {
      const ln = svgEl("path");
      set(ln, {
        d: `M${l.x1},${l.y1} L${l.x2},${l.y2}`,
        fill: "none",
        stroke: pri,
        "stroke-width": 2,
        "stroke-dasharray": "4 3",
        opacity: 0.6,
      });
      connG.appendChild(ln);
    }
    const h = svgEl("path");
    set(h, {
      d: HEART_PATH,
      transform: `translate(${(l.x1 + l.x2) / 2 - 8}, ${(l.y1 + l.y2) / 2 - 8})`,
      fill: color("--love", "#f472b6"),
    });
    connG.appendChild(h);
  }

  const dimOf = (id: string) =>
    ui.genFilter > 0 && Math.min(analysis.gen.get(id) ?? 1, 4) !== ui.genFilter;

  for (const e of layout.edges) {
    const eg = svgEl("g");
    set(eg, { opacity: dimOf(e.childId) ? "0.2" : "1" });
    const p = svgEl("path");
    set(p, { d:edgePath(e, lineStyle, horizontal ? "horizontal" : "vertical"),
             fill:"none", stroke:pri, "stroke-width":2 });
    eg.appendChild(p);
    const d = svgEl("circle");
    set(d, { cx:e.from.x, cy:e.from.y, r:3.5, fill:pri });
    eg.appendChild(d);
    connG.appendChild(eg);
  }
  svg.appendChild(connG);

  // Cards
  const cardG = svgEl("g");
  set(cardG, { transform:`translate(${PAD},${PAD})` });

  // Mini translation dict (no React hook available here)
  const lang = settings.language;
  const i = (bn: string, en: string) => lang === "bn" ? bn : en;
  const DICT: Record<string, string> = {
    patriarch:"প্রধান মাঝি|Patriarch", spouse:"জীবনসঙ্গী|Spouse", self:"নিজে|Self",
    father:"বাবা|Father", mother:"মা|Mother",
    grandfather:"দাদা/নানা|Grandfather", grandmother:"দাদি/নানি|Grandmother",
    greatGrandfather:"প্রপিতামহ|Great-grandfather", greatGrandmother:"প্রমাতামহী|Great-grandmother",
    ancestor:"পূর্বপুরুষ|Ancestor", descendant:"বংশধর|Descendant",
    son:"ছেলে|Son", daughter:"মেয়ে|Daughter",
    grandson:"নাতি|Grandson", granddaughter:"নাতনি|Granddaughter",
    ggson:"পুতি|Great-grandson", ggdaughter:"পুতনি|Great-granddaughter",
    brother:"ভাই|Brother", sister:"বোন|Sister",
    uncle:"চাচা/মামা|Uncle", aunt:"চাচি/মামি|Aunt",
    nephew:"ভাতিজা|Nephew", niece:"ভাতিজি|Niece",
    cousin:"কাজিন|Cousin", relative:"আত্মীয়|Relative", unrelated:"সম্পর্ক নেই|Unrelated",
    fatherInLaw:"শ্বশুর|Father-in-law", motherInLaw:"শাশুড়ি|Mother-in-law",
    sonInLaw:"জামাই|Son-in-law", daughterInLaw:"পুত্রবধূ|Daughter-in-law",
    brotherInLaw:"শ্যালক|Brother-in-law", sisterInLaw:"শ্যালিকা|Sister-in-law",
    relativeInLaw:"বৈবাহিক আত্মীয়|Relative by marriage",
  };
  function tr(key: string): string {
    const pair = DICT[key];
    if (!pair) return key;
    const [bn, en] = pair.split("|");
    return i(bn!, en!);
  }

  for (const n of layout.nodes) {
    const m = analysis.byId.get(n.id);
    if (!m) continue;
    const relKey = relationKey(m, analysis, ui.selectedId);
    const relText = relKey ? tr(relKey) : (m.role ?? "");

    const card = (horizontal ? buildRowCard : buildVerticalCard)({
      m, x:n.x, y:n.y, w:cardW, h:cardH,
      photo:settings.photoSize, gen:n.gen,
      rel:relText, opacity:dimOf(n.id) ? 0.25 : 1,
      variant: horizontal ? "row" : "vertical",
    });
    cardG.appendChild(card);
  }
  svg.appendChild(cardG);

  // Header
  const title = i("ট্রিমাইন্ড — পারিবারিক বৃক্ষ", "TreeMind — Family Tree");
  const date  = new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB",
    { year:"numeric", month:"long", day:"numeric" });

  const tt = svgEl("text");
  set(tt, { x:PAD, y:16, "font-family":FONT, "font-size":14, "font-weight":700,
            fill:color("--foreground","#111827"), "dominant-baseline":"hanging" });
  tt.textContent = title;
  svg.appendChild(tt);

  const dt = svgEl("text");
  set(dt, { x:svgW-PAD, y:16, "font-family":FONT, "font-size":10,
            fill:color("--muted-foreground","#6b7280"),
            "text-anchor":"end", "dominant-baseline":"hanging" });
  dt.textContent = date;
  svg.appendChild(dt);

  return svg;
}

// ─── SVG → Canvas rasteriser ──────────────────────────────────────────────────

/**
 * Rasterise an SVG element to a canvas at the given pixel ratio.
 * Works by serialising to a Blob URL, painting it onto a canvas via an Image.
 * This is the only approach that reliably renders Bangla text because it
 * delegates entirely to the browser's SVG renderer.
 */
function svgToCanvas(svgEl: SVGSVGElement, ratio: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const w = Number(svgEl.getAttribute("width"))  || 800;
    const h = Number(svgEl.getAttribute("height")) || 600;

    // Inline the font stack so the off-screen renderer picks it up
    svgEl.style.fontFamily = FONT;

    const serial = new XMLSerializer().serializeToString(svgEl);
    const blob   = new Blob([serial], { type: "image/svg+xml;charset=utf-8" });
    const url    = URL.createObjectURL(blob);
    const img    = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas unavailable")); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };
    img.src = url;
  });
}

/** Safe pixel ratio — stays within browser canvas limits. */
function safeRatio(w: number, h: number): number {
  const maxSide = "ontouchstart" in window ? 8_000 : 16_384;
  const maxArea = 100_000_000;
  return Math.min(2, maxSide / w, maxSide / h, Math.sqrt(maxArea / (w * h)));
}

/** True only when the canvas has zero usable pixels — a genuine render failure. */
function isBlank(canvas: HTMLCanvasElement): boolean {
  // Only flag canvases that have zero area — a uniform colour is NOT blank
  // because the SVG background fill is intentional.
  return canvas.width === 0 || canvas.height === 0;
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => b ? res(b) : rej(new Error("Encoding failed")), type, 0.95),
  );
}

// ─── main entry point ─────────────────────────────────────────────────────────

export async function prepareTreeExport(
  format:    ExportFormat,
  pdfLayout: PdfLayout = "vertical",
): Promise<PreparedExport> {
  await document.fonts.ready;
  clearColorCache(); // re-read colours every export (handles theme switches)

  const horizontal = format === "pdf" && pdfLayout === "horizontal";
  const treeSvg    = buildTreeSVG(horizontal);

  const svgW = Number(treeSvg.getAttribute("width"))  || 800;
  const svgH = Number(treeSvg.getAttribute("height")) || 600;

  // ── PNG / JPG ─────────────────────────────────────────────────────────────
  if (format !== "pdf") {
    const ratio  = safeRatio(svgW, svgH);
    const canvas = await svgToCanvas(treeSvg, ratio);
    if (isBlank(canvas)) throw new Error("Export produced an empty canvas — the tree may have no members");
    return {
      blob:     await toBlob(canvas, format === "jpg" ? "image/jpeg" : "image/png"),
      filename: `treemind-tree.${format}`,
    };
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  const { jsPDF } = await import("jspdf");

  // A3 landscape in pt (1 pt = 1/72 inch; we treat 1 px ≈ 0.75 pt = 96 dpi)
  const PAGE_W  = 1190.55, PAGE_H = 841.89; // A3 landscape
  const MARGIN  = 40;                        // pt
  const HEADER  = 28;                        // pt — title bar height

  const availW = PAGE_W - MARGIN * 2;
  const availH = PAGE_H - MARGIN * 2 - HEADER;

  // px → pt conversion: treat 1px = 0.75pt (96 dpi standard)
  const px2pt = 0.75;

  // Does the whole tree fit on one page at ≥ 60% scale?
  const fitScale = Math.min(availW / (svgW * px2pt), availH / (svgH * px2pt));
  const onePageFits = fitScale >= 0.6;

  const pdf = new jsPDF({ orientation:"landscape", unit:"pt", format:[PAGE_W,PAGE_H], compress:true });

  const drawHeader = () => {
    const lang  = getState().settings.language;
    const title = lang === "bn" ? "ট্রিমাইন্ড — পারিবারিক বৃক্ষ" : "TreeMind — Family Tree";
    const date  = new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB",
      { year:"numeric", month:"long", day:"numeric" });
    pdf.setFont("helvetica","bold"); pdf.setFontSize(11); pdf.setTextColor(40,40,40);
    pdf.text(title, MARGIN, MARGIN - 8);
    pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(120,120,120);
    pdf.text(date, PAGE_W - MARGIN, MARGIN - 8, { align:"right" });
  };

  const addCanvasPage = async (
    sx: number, sy: number,  // source SVG pixel offset
    sw: number, sh: number,  // source SVG pixel dimensions
    scale: number,           // px → pt scale for this page
  ) => {
    // Build a partial SVG view by shifting the viewBox
    treeSvg.setAttribute("viewBox", `${sx} ${sy} ${sw} ${sh}`);
    treeSvg.setAttribute("width",  String(sw));
    treeSvg.setAttribute("height", String(sh));

    const ratio  = safeRatio(sw, sh);
    const canvas = await svgToCanvas(treeSvg, ratio);
    if (isBlank(canvas))
      throw new Error("PDF tile produced an empty canvas");

    const ptW = sw * scale;
    const ptH = sh * scale;
    const ox  = MARGIN + (availW - ptW) / 2;
    const oy  = MARGIN + HEADER + (availH - ptH) / 2;
    pdf.addImage(canvas, "PNG", ox, oy, ptW, ptH, undefined, "FAST");
    drawHeader();
  };

  if (onePageFits) {
    // Single page — whole tree
    await addCanvasPage(0, 0, svgW, svgH, Math.min(fitScale, 1) * px2pt);
  } else {
    // Overview page (whole tree, scaled down)
    await addCanvasPage(0, 0, svgW, svgH, fitScale * px2pt);

    // Detail pages at 1:1 px→pt — each covers one A3 tile
    const tileW = Math.floor(availW / px2pt);
    const tileH = Math.floor(availH / px2pt);
    const cols  = Math.ceil(svgW / tileW);
    const rows  = Math.ceil(svgH / tileH);

    if (cols * rows > 1) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const sx = col * tileW, sy = row * tileH;
          const sw = Math.min(tileW, svgW - sx);
          const sh = Math.min(tileH, svgH - sy);
          pdf.addPage([PAGE_W, PAGE_H], "landscape");
          await addCanvasPage(sx, sy, sw, sh, px2pt);

          // Page label
          pdf.setFontSize(7); pdf.setTextColor(160,160,160);
          pdf.text(`${row*cols+col+1} / ${rows*cols}`, PAGE_W/2, PAGE_H-10, { align:"center" });
        }
      }
    }
  }

  // Restore original viewBox
  treeSvg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  treeSvg.setAttribute("width",  String(svgW));
  treeSvg.setAttribute("height", String(svgH));

  return {
    blob:     pdf.output("blob"),
    filename: horizontal ? "treemind-tree-horizontal.pdf" : "treemind-tree.pdf",
  };
}
