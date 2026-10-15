import type { Member } from "./types";

export interface Analysis {
  byId: Map<string, Member>;
  secondary: Set<string>;
  children: Map<string, string[]>;
  roots: string[];
  gen: Map<string, number>;
  primaryOf: (id: string) => string;
}

/** Pure: figures out couples, parent→children and generations. */
export function analyze(members: Member[]): Analysis {
  const byId = new Map(members.map((m) => [m.id, m]));
  const index = new Map(members.map((m, i) => [m.id, i]));
  const secondary = new Set<string>();
  for (const m of members) {
    const sp = m.spouseId ? byId.get(m.spouseId) : undefined;
    if (!sp || (m.parentId && byId.has(m.parentId))) continue;
    const spHasParent = !!(sp.parentId && byId.has(sp.parentId));
    if (spHasParent || (index.get(sp.id) ?? 0) < (index.get(m.id) ?? 0)) secondary.add(m.id);
  }
  const primaryOf = (id: string) => {
    const m = byId.get(id);
    return m && secondary.has(id) && m.spouseId ? m.spouseId : id;
  };
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const m of members) {
    if (secondary.has(m.id)) continue;
    if (m.parentId && byId.has(m.parentId)) {
      const p = primaryOf(m.parentId);
      const siblings = children.get(p) ?? [];
      siblings.push(m.id);
      children.set(p, siblings);
    } else roots.push(m.id);
  }
  const gen = new Map<string, number>();
  const walk = (id: string, g: number) => {
    if (gen.has(id)) return;
    gen.set(id, g);
    const sp = byId.get(id)?.spouseId;
    if (sp && secondary.has(sp)) gen.set(sp, g);
    for (const c of children.get(id) ?? []) walk(c, g + 1);
  };
  roots.forEach((r) => walk(r, 1));
  return { byId, secondary, children, roots, gen, primaryOf };
}

export interface LayoutOpts {
  cardW: number;
  cardH: number;
  gapX: number;
  gapY: number;
  spouseGap: number;
}
export interface NodePos {
  id: string;
  x: number;
  y: number;
  gen: number;
}
export interface Edge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  jy: number;
  childId: string;
}
export interface Layout {
  nodes: NodePos[];
  edges: Edge[];
  spouseLinks: { x1: number; x2: number; y: number }[];
  width: number;
  height: number;
}

/** Pure top-to-bottom layout: center each couple above its descendant branches. */
export function layoutTree(members: Member[], o: LayoutOpts): Layout {
  const a = analyze(members);
  const rowH = o.cardH + Math.max(o.gapY, 72);
  const pos = new Map<string, NodePos>();
  const widths = new Map<string, number>();
  const coupleWidth = (id: string) => {
    const sp = a.byId.get(id)?.spouseId;
    return sp && a.secondary.has(sp) ? o.cardW * 2 + o.spouseGap : o.cardW;
  };
  const measure = (id: string): number => {
    const kids = a.children.get(id) ?? [];
    const childWidth = kids.reduce((sum, child) => sum + measure(child), 0) + Math.max(0, kids.length - 1) * o.gapX;
    const width = Math.max(coupleWidth(id), childWidth);
    widths.set(id, width);
    return width;
  };
  a.roots.forEach(measure);
  let cursor = 0;
  const place = (id: string, left: number) => {
    const g = a.gen.get(id) ?? 1;
    const kids = a.children.get(id) ?? [];
    const width = widths.get(id) ?? coupleWidth(id);
    const x = left + (width - coupleWidth(id)) / 2;
    const y = (g - 1) * rowH;
    pos.set(id, { id, x, y, gen: g });
    const sp = a.byId.get(id)?.spouseId;
    if (sp && a.secondary.has(sp)) pos.set(sp, { id: sp, x: x + o.cardW + o.spouseGap, y, gen: g });
    const childWidth = kids.reduce((sum, child) => sum + (widths.get(child) ?? 0), 0) + Math.max(0, kids.length - 1) * o.gapX;
    let childLeft = left + (width - childWidth) / 2;
    for (const child of kids) {
      place(child, childLeft);
      childLeft += (widths.get(child) ?? 0) + o.gapX;
    }
  };
  a.roots.forEach((r) => {
    place(r, cursor);
    cursor += (widths.get(r) ?? 0) + o.gapX;
  });
  const edges: Edge[] = [];
  const spouseLinks: Layout["spouseLinks"] = [];
  for (const [pid, kids] of a.children) {
    const p = pos.get(pid);
    if (!p) continue;
    const sp = a.byId.get(pid)?.spouseId;
    const hasSp = !!(sp && a.secondary.has(sp));
    const fx = p.x + (hasSp ? o.cardW + o.spouseGap / 2 : o.cardW / 2);
    const from = { x: fx, y: p.y + o.cardH };
    for (const k of kids) {
      const c = pos.get(k);
      if (!c) continue;
      const to = { x: c.x + o.cardW / 2, y: c.y };
      edges.push({ from, to, jy: (from.y + to.y) / 2, childId: k });
    }
  }
  for (const p of pos.values()) {
    const sp = a.byId.get(p.id)?.spouseId;
    if (sp && a.secondary.has(sp))
      spouseLinks.push({ x1: p.x + o.cardW, x2: p.x + o.cardW + o.spouseGap, y: p.y + o.cardH / 2 });
  }
  const nodes = [...pos.values()];
  const width = Math.max(0, ...nodes.map((n) => n.x + o.cardW));
  const height = Math.max(0, ...nodes.map((n) => n.y + o.cardH));
  return { nodes, edges, spouseLinks, width, height };
}

export function edgePath(e: Edge, style: "straight" | "curved") {
  const { from, to, jy } = e;
  if (style === "straight") return `M${from.x},${from.y} V${jy} H${to.x} V${to.y}`;
  return `M${from.x},${from.y} C${from.x},${jy} ${to.x},${jy} ${to.x},${to.y}`;
}
