import type { Member } from "./types";
import { parentsOf, spousesOf } from "./types";

/** One marriage between two members (each marriage is a separate relationship). */
export interface Marriage {
  id: string;
  partners: [string, string];
}

/**
 * A rendered family unit: one marriage couple (or a solo parent with children)
 * placed inside the block of its owner, with the children that belong to it.
 */
export interface Unit {
  id: string;
  owner: string;
  /** Members shown in this unit: [anchor, spouse?] — the anchor repeats per marriage. */
  members: string[];
  childIds: string[];
}

export interface Analysis {
  byId: Map<string, Member>;
  secondary: Set<string>;
  spouseIdsOf: Map<string, string[]>;
  parentIdsOf: Map<string, string[]>;
  marriages: Marriage[];
  /** Marriage/solo units shown inside each block owner's row, in marriage order. */
  unitsOf: Map<string, Unit[]>;
  unitOfChild: Map<string, Unit>;
  children: Map<string, string[]>;
  childrenByParent: Map<string, string[]>;
  roots: string[];
  gen: Map<string, number>;
  primaryOf: (id: string) => string;
}

/** Pure: figures out marriages, family units, parent→children and generations. */
export function analyze(members: Member[]): Analysis {
  const byId = new Map(members.map((m) => [m.id, m]));
  const index = new Map(members.map((m, i) => [m.id, i]));

  const spouseIdsOf = new Map<string, string[]>();
  const parentIdsOf = new Map<string, string[]>();
  for (const m of members) {
    const sps = [...new Set(spousesOf(m).filter((s) => s !== m.id && byId.has(s)))];
    const ps = [...new Set(parentsOf(m).filter((p) => p !== m.id && byId.has(p)))];
    spouseIdsOf.set(m.id, sps);
    parentIdsOf.set(m.id, ps);
  }

  // A person who married in (no parents here) renders inside their spouse's block.
  const secondary = new Set<string>();
  for (const m of members) {
    const sps = spouseIdsOf.get(m.id) ?? [];
    if (!sps.length || (parentIdsOf.get(m.id)?.length ?? 0) > 0) continue;
    const senior = (s: string) =>
      (parentIdsOf.get(s)?.length ?? 0) > 0 || (index.get(s) ?? 0) < (index.get(m.id) ?? 0);
    if (sps.some(senior)) secondary.add(m.id);
  }
  const primaryOf = (id: string) => {
    if (!secondary.has(id)) return id;
    const sps = spouseIdsOf.get(id) ?? [];
    const withParents = sps.find((s) => (parentIdsOf.get(s)?.length ?? 0) > 0);
    if (withParents) return withParents;
    if (!sps.length) return id;
    let best = sps[0]!;
    for (const s of sps) if ((index.get(s) ?? 0) < (index.get(best) ?? 0)) best = s;
    return best;
  };

  // Each spouseIds entry becomes one marriage; anchor = the lineal partner.
  const seenPair = new Set<string>();
  const marriages: Marriage[] = [];
  const unitsOf = new Map<string, Unit[]>();
  const unitList: Unit[] = [];
  for (const m of members) {
    for (const sp of spouseIdsOf.get(m.id) ?? []) {
      const key = [m.id, sp].sort().join("|");
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      const mOwn = !secondary.has(m.id);
      const spOwn = !secondary.has(sp);
      const anchor =
        mOwn && !spOwn ? m.id : spOwn && !mOwn ? sp : (index.get(m.id) ?? 0) <= (index.get(sp) ?? 0) ? m.id : sp;
      const other = anchor === m.id ? sp : m.id;
      marriages.push({ id: key, partners: [anchor, other] });
      const owner = primaryOf(anchor);
      const unit: Unit = { id: `${owner}#${unitList.length}`, owner, members: [anchor, other], childIds: [] };
      unitsOf.set(owner, [...(unitsOf.get(owner) ?? []), unit]);
      unitList.push(unit);
    }
  }

  const unitOfChild = new Map<string, Unit>();
  const children = new Map<string, string[]>();
  const childrenByParent = new Map<string, string[]>();
  const roots: string[] = [];
  const soloUnit = (owner: string): Unit => {
    const unit: Unit = { id: `${owner}#solo`, owner, members: [owner], childIds: [] };
    unitsOf.set(owner, [...(unitsOf.get(owner) ?? []), unit]);
    unitList.push(unit);
    return unit;
  };

  for (const m of members) {
    if (secondary.has(m.id)) continue;
    const ps = parentIdsOf.get(m.id) ?? [];
    if (!ps.length) {
      roots.push(m.id);
      continue;
    }
    const eff = [...new Set(ps.map(primaryOf))];
    const cand = new Set([...ps, ...eff]);
    let unit = unitList.find(
      (u) => u.members.length > 1 && cand.has(u.members[0]!) && cand.has(u.members[1]!),
    );
    // 2. A raw parent appears in a unit (e.g. linked to the married-in parent).
    if (!unit) unit = unitList.find((u) => ps.some((p) => u.members.includes(p)));
    // 3. Legacy fallback: single parent with spouses → first marriage of that parent.
    if (!unit && eff.length) {
      const list = unitsOf.get(eff[0]!);
      if (list?.length) unit = list[0];
    }
    const chosen = unit ?? (eff.length ? soloUnit(eff[0]!) : undefined);
    if (!chosen) {
      roots.push(m.id);
      continue;
    }
    chosen.childIds.push(m.id);
    unitOfChild.set(m.id, chosen);
    children.set(chosen.owner, [...(children.get(chosen.owner) ?? []), m.id]);
    for (const mid of chosen.members)
      childrenByParent.set(mid, [...(childrenByParent.get(mid) ?? []), m.id]);
  }

  const gen = new Map<string, number>();
  const walk = (id: string, g: number) => {
    if (gen.has(id)) return;
    gen.set(id, g);
    for (const u of unitsOf.get(id) ?? []) {
      for (const mid of u.members) if (!gen.has(mid)) gen.set(mid, g);
      for (const c of u.childIds) walk(c, g + 1);
    }
  };
  roots.forEach((r) => walk(r, 1));
  return {
    byId,
    secondary,
    spouseIdsOf,
    parentIdsOf,
    marriages,
    unitsOf,
    unitOfChild,
    children,
    childrenByParent,
    roots,
    gen,
    primaryOf,
  };
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
  /** Unique per rendered card — a person with several marriages has one node per unit. */
  key: string;
  x: number;
  y: number;
  gen: number;
}
export interface Edge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Vertical layouts: y of the horizontal jog. Horizontal layouts: x of the vertical jog. Both always set. */
  jy: number;
  jx: number;
  childId: string;
}
export interface Layout {
  nodes: NodePos[];
  edges: Edge[];
  spouseLinks: { x1: number; y1: number; x2: number; y2: number }[];
  width: number;
  height: number;
}

/**
 * Pure top-to-bottom layout.
 *
 * Properties:
 * - Root centering: each root couple/person sits on the horizontal centre of
 *   its whole subtree, so the tree is balanced on both sides of the root.
 * - Generation alignment: every member of a generation shares one row (y).
 * - Subtree centering: each couple is centred above its children's row, and
 *   each child's own subtree is centred beneath it.
 * - Connectors: parent→child elbows jog in the gap between rows; marriage
 *   lines are separate (solid for side-by-side couples, diagonal for hubs).
 * - Multiple marriages: a person with 2+ marriages renders once at the top
 *   (hub); spouses sit in a row underneath, each joined by a marriage line,
 *   and each spouse's children hang centred below their own parent's column.
 */
export function layoutTree(members: Member[], o: LayoutOpts): Layout {
  const a = analyze(members);
  // Rows must clear the hub's extra spouse row (anchor + gap + spouse card).
  const rowH = Math.max(o.cardH + Math.max(o.gapY, 72), 2 * o.cardH + o.spouseGap + 16);
  const unitGap = o.gapX;
  const pos = new Map<string, NodePos>();
  const firstPos = new Map<string, NodePos>();
  const unitLoc = new Map<string, { x: number; y: number }>();
  const hubAnchor = new Map<string, { x: number; y: number }>();
  const widths = new Map<string, number>();
  const unitWidths = new Map<string, number>();
  const coupleW = (u: Unit) => (u.members.length > 1 ? o.cardW * 2 + o.spouseGap : o.cardW);
  const childSpan = (u: Unit) =>
    u.childIds.reduce((sum, c) => sum + measure(c), 0) +
    Math.max(0, u.childIds.length - 1) * o.gapX;
  const isHub = (units: Unit[]) => units.length > 1 && !!units[0] && units[0].members.length > 1;
  /** Width of one spouse column in the hub row (spouse card + its child branch). */
  const spouseSlot = (u: Unit) =>
    Math.max(
      o.cardW,
      u.childIds.reduce((s, c) => s + measure(c), 0) +
        Math.max(0, u.childIds.length - 1) * o.gapX,
    );
  const hubRowW = (units: Unit[]) =>
    units.reduce((s, u) => s + spouseSlot(u), 0) + (units.length - 1) * unitGap;
  function measure(id: string): number {
    const cached = widths.get(id);
    if (cached !== undefined) return cached;
    const units = a.unitsOf.get(id) ?? [];
    const width = units.length
      ? isHub(units)
        ? Math.max(o.cardW, hubRowW(units))
        : units.reduce((s, u) => {
            const w = Math.max(coupleW(u), childSpan(u));
            unitWidths.set(u.id, w);
            return s + w;
          }, 0) + (units.length - 1) * unitGap
      : o.cardW;
    widths.set(id, width);
    return width;
  }
  a.roots.forEach(measure);
  let cursor = 0;
  const place = (id: string, left: number) => {
    const g = a.gen.get(id) ?? 1;
    const y = (g - 1) * rowH;
    const units = a.unitsOf.get(id) ?? [];
    const width = widths.get(id) ?? o.cardW;
    const addNode = (mid: string, unitId: string, nx: number, ny: number) => {
      const n: NodePos = { id: mid, key: `${unitId}:${mid}`, x: nx, y: ny, gen: g };
      pos.set(n.key, n);
      if (!firstPos.has(mid)) firstPos.set(mid, n);
    };
    const placeKids = (u: Unit, cx: number, cw: number) => {
      const kids = u.childIds;
      const cs = kids.reduce((s, c) => s + (widths.get(c) ?? 0), 0) + Math.max(0, kids.length - 1) * o.gapX;
      let childLeft = cx + (cw - cs) / 2;
      for (const c of kids) {
        place(c, childLeft);
        childLeft += (widths.get(c) ?? 0) + o.gapX;
      }
    };
    if (isHub(units)) {
      const rowW = hubRowW(units);
      const innerX = left + (width - rowW) / 2;
      const ax = left + (width - o.cardW) / 2;
      hubAnchor.set(id, { x: ax, y });
      addNode(id, units[0]!.id, ax, y);
      let x = innerX;
      for (const u of units) {
        const sw = spouseSlot(u);
        const spouse = u.members[1] ?? u.owner;
        unitLoc.set(u.id, { x: x + sw / 2 - o.cardW / 2, y: y + o.cardH + o.spouseGap });
        addNode(spouse, u.id, x + sw / 2 - o.cardW / 2, y + o.cardH + o.spouseGap);
        placeKids(u, x, sw);
        x += sw + unitGap;
      }
      return;
    }
    const inner = units.length
      ? units.reduce((s, u) => s + (unitWidths.get(u.id) ?? coupleW(u)), 0) +
        (units.length - 1) * unitGap
      : o.cardW;
    let x = left + (width - inner) / 2;
    for (const u of units) {
      const uw = unitWidths.get(u.id) ?? coupleW(u);
      // Centre the couple/solo parent inside its block so the cards sit on
      // the same axis as the middle of their children's row.
      const coupleX = x + (uw - coupleW(u)) / 2;
      unitLoc.set(u.id, { x: coupleX, y });
      u.members.forEach((mid, mi) => addNode(mid, u.id, coupleX + mi * (o.cardW + o.spouseGap), y));
      placeKids(u, x, uw);
      x += uw + unitGap;
    }
    if (!units.length) addNode(id, `${id}:solo`, x, y);
  };
  a.roots.forEach((r) => {
    place(r, cursor);
    cursor += (widths.get(r) ?? 0) + o.gapX;
  });
  const edges: Edge[] = [];
  const spouseLinks: Layout["spouseLinks"] = [];
  for (const u of a.unitsOf.values()) {
    for (const unit of u) {
      const loc = unitLoc.get(unit.id);
      if (!loc) continue;
      if (unit.members.length > 1 && hubAnchor.has(unit.owner)) {
        // Hub: diagonal marriage line from the top person down to each spouse.
        const h = hubAnchor.get(unit.owner)!;
        spouseLinks.push({
          x1: h.x + o.cardW / 2,
          y1: h.y + o.cardH,
          x2: loc.x + o.cardW / 2,
          y2: loc.y,
        });
      } else if (unit.members.length > 1) {
        spouseLinks.push({
          x1: loc.x + o.cardW,
          y1: loc.y + o.cardH / 2,
          x2: loc.x + o.cardW + o.spouseGap,
          y2: loc.y + o.cardH / 2,
        });
      }
      if (!unit.childIds.length) continue;
      // Hub: children hang from the short line below each spouse card.
      // Inline couple: children hang from the junction between the pair.
      const fx = hubAnchor.has(unit.owner)
        ? loc.x + o.cardW / 2
        : loc.x + (unit.members.length > 1 ? o.cardW + o.spouseGap / 2 : o.cardW / 2);
      const from = { x: fx, y: loc.y + o.cardH };
      for (const k of unit.childIds) {
        const c = firstPos.get(k);
        if (!c) continue;
        const to = { x: c.x + o.cardW / 2, y: c.y };
        edges.push({ from, to, jy: (from.y + to.y) / 2, jx: (from.x + to.x) / 2, childId: k });
      }
    }
  }
  const nodes = [...pos.values()];
  const width = Math.max(0, ...nodes.map((n) => n.x + o.cardW));
  const height = Math.max(0, ...nodes.map((n) => n.y + o.cardH));
  return { nodes, edges, spouseLinks, width, height };
}

/**
 * Left-to-right layout for horizontal PDF export.
 * Same couples/branches logic transposed: generations run
 * left→right, siblings stack top→bottom, each couple is centred on the
 * vertical axis of its children's column. Multi-marriage hubs keep the main
 * person at the left, spouses stacked in a column beside them, and each
 * spouse's children in their own branch column.
 */
export function layoutTreeHorizontal(members: Member[], o: LayoutOpts): Layout {
  const a = analyze(members);
  // Horizontal distance between generations; vertical density between siblings.
  const colW = o.cardW +
    Math.max(o.gapX, 72, o.cardW + o.spouseGap + 16);
  const unitGap = o.gapY;
  const pos = new Map<string, NodePos>();
  const firstPos = new Map<string, NodePos>();
  const unitLoc = new Map<string, { x: number; y: number }>();
  const hubAnchor = new Map<string, { x: number; y: number }>();
  const heights = new Map<string, number>();
  const unitHeights = new Map<string, number>();
  const coupleH = (u: Unit) => (u.members.length > 1 ? o.cardH * 2 + o.spouseGap : o.cardH);
  const childSpan = (u: Unit) =>
    u.childIds.reduce((sum, c) => sum + measure(c), 0) +
    Math.max(0, u.childIds.length - 1) * o.gapY;
  const isHub = (units: Unit[]) => units.length > 1 && !!units[0] && units[0].members.length > 1;
  /** Height of one spouse row in the hub column (spouse card + its child branch). */
  const spouseSlot = (u: Unit) =>
    Math.max(
      o.cardH,
      u.childIds.reduce((s, c) => s + measure(c), 0) +
        Math.max(0, u.childIds.length - 1) * o.gapY,
    );
  const hubColH = (units: Unit[]) =>
    units.reduce((s, u) => s + spouseSlot(u), 0) + (units.length - 1) * unitGap;
  function measure(id: string): number {
    const cached = heights.get(id);
    if (cached !== undefined) return cached;
    const units = a.unitsOf.get(id) ?? [];
    const height = units.length
      ? isHub(units)
        ? Math.max(o.cardH, hubColH(units))
        : units.reduce((s, u) => {
            const h = Math.max(coupleH(u), childSpan(u));
            unitHeights.set(u.id, h);
            return s + h;
          }, 0) + (units.length - 1) * unitGap
      : o.cardH;
    heights.set(id, height);
    return height;
  }
  a.roots.forEach(measure);
  let cursor = 0;
  const place = (id: string, top: number) => {
    const g = a.gen.get(id) ?? 1;
    const x = (g - 1) * colW;
    const units = a.unitsOf.get(id) ?? [];
    const height = heights.get(id) ?? o.cardH;
    const addNode = (mid: string, unitId: string, nx: number, ny: number) => {
      const n: NodePos = { id: mid, key: `${unitId}:${mid}`, x: nx, y: ny, gen: g };
      pos.set(n.key, n);
      if (!firstPos.has(mid)) firstPos.set(mid, n);
    };
    const placeKids = (u: Unit, cy: number, ch: number) => {
      const kids = u.childIds;
      const cs = kids.reduce((s, c) => s + (heights.get(c) ?? 0), 0) + Math.max(0, kids.length - 1) * o.gapY;
      let childTop = cy + (ch - cs) / 2;
      for (const c of kids) {
        place(c, childTop);
        childTop += (heights.get(c) ?? 0) + o.gapY;
      }
    };
    if (isHub(units)) {
      const colH = hubColH(units);
      const innerY = top + (height - colH) / 2;
      const ay = top + (height - o.cardH) / 2;
      hubAnchor.set(id, { x, y: ay });
      addNode(id, units[0]!.id, x, ay);
      let y = innerY;
      for (const u of units) {
        const sh = spouseSlot(u);
        const spouse = u.members[1] ?? u.owner;
        unitLoc.set(u.id, { x: x + o.cardW + o.spouseGap, y: y + sh / 2 - o.cardH / 2 });
        addNode(spouse, u.id, x + o.cardW + o.spouseGap, y + sh / 2 - o.cardH / 2);
        placeKids(u, y, sh);
        y += sh + unitGap;
      }
      return;
    }
    const inner = units.length
      ? units.reduce((s, u) => s + (unitHeights.get(u.id) ?? coupleH(u)), 0) +
        (units.length - 1) * unitGap
      : o.cardH;
    let y = top + (height - inner) / 2;
    for (const u of units) {
      const uh = unitHeights.get(u.id) ?? coupleH(u);
      // Centre the couple/solo parent inside its block so the cards sit on
      // the same axis as the middle of their children's column.
      const coupleY = y + (uh - coupleH(u)) / 2;
      unitLoc.set(u.id, { x, y: coupleY });
      u.members.forEach((mid, mi) => addNode(mid, u.id, x, coupleY + mi * (o.cardH + o.spouseGap)));
      placeKids(u, y, uh);
      y += uh + unitGap;
    }
    if (!units.length) addNode(id, `${id}:solo`, x, y);
  };
  a.roots.forEach((r) => {
    place(r, cursor);
    cursor += (heights.get(r) ?? 0) + o.gapY;
  });
  const edges: Edge[] = [];
  const spouseLinks: Layout["spouseLinks"] = [];
  for (const u of a.unitsOf.values()) {
    for (const unit of u) {
      const loc = unitLoc.get(unit.id);
      if (!loc) continue;
      if (unit.members.length > 1 && hubAnchor.has(unit.owner)) {
        // Hub: diagonal marriage line from the main person to each spouse.
        const h = hubAnchor.get(unit.owner)!;
        spouseLinks.push({
          x1: h.x + o.cardW,
          y1: h.y + o.cardH / 2,
          x2: loc.x,
          y2: loc.y + o.cardH / 2,
        });
      } else if (unit.members.length > 1) {
        spouseLinks.push({
          x1: loc.x + o.cardW / 2,
          y1: loc.y + o.cardH,
          x2: loc.x + o.cardW / 2,
          y2: loc.y + o.cardH + o.spouseGap,
        });
      }
      if (!unit.childIds.length) continue;
      // Hub: children branch from the right edge of each spouse card.
      // Inline couple: children branch from the junction between the pair.
      const fy = hubAnchor.has(unit.owner)
        ? loc.y + o.cardH / 2
        : loc.y + (unit.members.length > 1 ? o.cardH + o.spouseGap / 2 : o.cardH / 2);
      const from = { x: loc.x + o.cardW, y: fy };
      for (const k of unit.childIds) {
        const c = firstPos.get(k);
        if (!c) continue;
        const kUnits = a.unitsOf.get(k);
        const kHub = hubAnchor.has(k);
        const kCouple = !kHub && !!kUnits?.[0] && kUnits[0].members.length > 1;
        const to = {
          x: c.x,
          y: kHub
            ? hubAnchor.get(k)!.y + o.cardH / 2
            : c.y + (kCouple ? o.cardH + o.spouseGap / 2 : o.cardH / 2),
        };
        edges.push({ from, to, jy: (from.y + to.y) / 2, jx: (from.x + to.x) / 2, childId: k });
      }
    }
  }
  const nodes = [...pos.values()];
  const width = Math.max(0, ...nodes.map((n) => n.x + o.cardW));
  const height = Math.max(0, ...nodes.map((n) => n.y + o.cardH));
  return { nodes, edges, spouseLinks, width, height };
}

export function edgePath(
  e: Edge,
  style: "straight" | "curved",
  direction: "vertical" | "horizontal" = "vertical",
) {
  const { from, to, jy, jx } = e;
  if (direction === "horizontal") {
    if (style === "straight") return `M${from.x},${from.y} H${jx} V${to.y} H${to.x}`;
    return `M${from.x},${from.y} C${jx},${from.y} ${jx},${to.y} ${to.x},${to.y}`;
  }
  if (style === "straight") return `M${from.x},${from.y} V${jy} H${to.x} V${to.y}`;
  return `M${from.x},${from.y} C${from.x},${jy} ${to.x},${jy} ${to.x},${to.y}`;
}
