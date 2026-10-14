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
    if (spHasParent || index.get(sp.id)! < index.get(m.id)!) secondary.add(m.id);
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
      if (!children.has(p)) children.set(p, []);
      children.get(p)!.push(m.id);
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
  jx: number;
  childId: string;
}
export interface Layout {
  nodes: NodePos[];
  edges: Edge[];
  spouseLinks: { x1: number; x2: number; y: number }[];
  width: number;
  height: number;
}

/** Pure left-to-right layout: couples side by side, children in the next column. */
export function layoutTree(members: Member[], o: LayoutOpts): Layout {
  const a = analyze(members);
  const colStep = o.cardW * 2 + o.spouseGap + o.gapX;
  const rowH = o.cardH + o.gapY;
  const pos = new Map<string, NodePos>();
  let cursor = 0;
  const place = (id: string): number => {
    const g = a.gen.get(id) ?? 1;
    const kids = a.children.get(id) ?? [];
    let y: number;
    if (!kids.length) {
      y = cursor * rowH;
      cursor++;
    } else {
      const ys = kids.map(place);
      y = (ys[0]! + ys[ys.length - 1]!) / 2;
    }
    const x = (g - 1) * colStep;
    pos.set(id, { id, x, y, gen: g });
    const sp = a.byId.get(id)?.spouseId;
    if (sp && a.secondary.has(sp)) pos.set(sp, { id: sp, x: x + o.cardW + o.spouseGap, y, gen: g });
    return y;
  };
  a.roots.forEach((r, i) => {
    if (i > 0) cursor += 0.5;
    place(r);
  });
  const edges: Edge[] = [];
  const spouseLinks: Layout["spouseLinks"] = [];
  for (const [pid, kids] of a.children) {
    const p = pos.get(pid)!;
    const sp = a.byId.get(pid)?.spouseId;
    const hasSp = !!(sp && a.secondary.has(sp));
    const fx = p.x + (hasSp ? o.cardW * 2 + o.spouseGap : o.cardW);
    const from = { x: fx, y: p.y + o.cardH / 2 };
    for (const k of kids) {
      const c = pos.get(k)!;
      edges.push({ from, to: { x: c.x, y: c.y + o.cardH / 2 }, jx: fx + o.gapX / 2, childId: k });
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
  const { from, to, jx } = e;
  if (style === "straight") return `M${from.x},${from.y} H${jx} V${to.y} H${to.x}`;
  const mx = (jx + to.x) / 2;
  return `M${from.x},${from.y} H${jx} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`;
}
