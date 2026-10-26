import { describe, expect, it } from "vitest";
import {
  analyze,
  edgePath,
  layoutTree,
  layoutTreeHorizontal,
  type Layout,
  type Unit,
} from "@/lib/tree/layout";
import { pdfTiles } from "@/lib/tree/export-geometry";
import { makeSeed } from "@/lib/tree/seed";
import type { Member } from "@/lib/tree/types";

const o = { cardW: 200, cardH: 70, gapX: 60, gapY: 20, spouseGap: 24 };

const twoWives: Member[] = [
  { id: "p1", name: "A", gender: "male", birthYear: 1950, spouseIds: ["s1", "s2"] },
  { id: "s1", name: "B", gender: "female", birthYear: 1955, spouseIds: ["p1"] },
  { id: "s2", name: "C", gender: "female", birthYear: 1960, spouseIds: ["p1"] },
  { id: "c1", name: "D", gender: "male", birthYear: 1975, parentIds: ["p1", "s1"] },
  { id: "c2", name: "E", gender: "female", birthYear: 1978, parentIds: ["p1", "s2"] },
];

describe("multiple marriages", () => {
  const a = analyze(twoWives);
  it("stores each marriage as a separate relationship", () => {
    expect(a.marriages.length).toBe(2);
    expect(a.spouseIdsOf.get("p1")).toEqual(["s1", "s2"]);
    expect(a.secondary.has("s1")).toBe(true);
    expect(a.secondary.has("s2")).toBe(true);
  });
  it("assigns each child to the family branch of its own parents", () => {
    const units = a.unitsOf.get("p1")!;
    expect(units.length).toBe(2);
    expect(units[0]!.childIds).toEqual(["c1"]);
    expect(units[1]!.childIds).toEqual(["c2"]);
    expect(a.childrenByParent.get("s2")).toEqual(["c2"]);
    expect(a.unitOfChild.get("c1")!.members).toEqual(["p1", "s1"]);
  });
  it("renders the main person once on top, spouses side by side below, no overlaps", () => {
    const l = layoutTree(twoWives, o);
    const pNodes = l.nodes.filter((n) => n.id === "p1");
    expect(pNodes.length).toBe(1);
    for (const n of l.nodes) {
      for (const other of l.nodes) {
        if (n.key === other.key) continue;
        expect(
          n.x + o.cardW <= other.x ||
            other.x + o.cardW <= n.x ||
            n.y + o.cardH <= other.y ||
            other.y + o.cardH <= n.y,
        ).toBe(true);
      }
    }
    // Spouses sit in a horizontal row below the main person…
    const s1 = l.nodes.find((n) => n.id === "s1")!;
    const s2 = l.nodes.find((n) => n.id === "s2")!;
    const anchor = pNodes[0]!;
    expect(s1.y).toBe(anchor.y + o.cardH + o.spouseGap);
    expect(s2.y).toBe(s1.y);
    expect(s1.x).toBeLessThan(s2.x);
    // …each joined by a marriage line from the anchor.
    expect(l.spouseLinks.length).toBe(2);
    for (const link of l.spouseLinks) expect(link.x1).toBe(anchor.x + o.cardW / 2);
    // Each child hangs from its own spouse's column, centred under that spouse.
    const e1 = l.edges.find((e) => e.childId === "c1")!;
    const e2 = l.edges.find((e) => e.childId === "c2")!;
    const c1 = l.nodes.find((n) => n.id === "c1")!;
    const c2 = l.nodes.find((n) => n.id === "c2")!;
    expect(e1.from.x).toBe(s1.x + o.cardW / 2);
    expect(e2.from.x).toBe(s2.x + o.cardW / 2);
    expect(c1.x + o.cardW / 2).toBeCloseTo(e1.to.x);
    expect(e1.to.x).toBeLessThan(e2.to.x);
  });
  it("transposes the same hub in the horizontal layout", () => {
    const l = layoutTreeHorizontal(twoWives, o);
    expect(l.nodes.filter((n) => n.id === "p1").length).toBe(1);
    const anchor = l.nodes.find((n) => n.id === "p1")!;
    const s2 = l.nodes.find((n) => n.id === "s2")!;
    const s1 = l.nodes.find((n) => n.id === "s1")!;
    expect(s2.x).toBe(anchor.x + o.cardW + o.spouseGap);
    expect(s2.y).toBeGreaterThan(s1.y);
    expect(l.spouseLinks.length).toBe(2);
    const e2 = l.edges.find((e) => e.childId === "c2")!;
    expect(e2.from.y).toBe(s2.y + o.cardH / 2);
    expect(e2.to.x).toBeGreaterThan(e2.from.x);
  });
});

describe("man's perspective anchoring", () => {
  const wifeFirst: Member[] = [
    { id: "w", name: "W", gender: "female", birthYear: 1960, spouseIds: ["h"] },
    { id: "h", name: "H", gender: "male", birthYear: 1958, spouseIds: ["w"] },
    { id: "c", name: "C", gender: "male", birthYear: 1985, parentIds: ["w", "h"] },
  ];
  it("anchors a rootless couple on the male partner regardless of entry order", () => {
    const a = analyze(wifeFirst);
    expect(a.roots).toEqual(["h"]);
    expect(a.secondary.has("w")).toBe(true);
    expect(a.secondary.has("h")).toBe(false);
  });
  it("renders the male partner first, wife beside him on the same row", () => {
    const l = layoutTree(wifeFirst, o);
    const h = l.nodes.find((n) => n.id === "h")!;
    const w = l.nodes.find((n) => n.id === "w")!;
    expect(h.y).toBe(w.y);
    expect(h.x).toBeLessThan(w.x);
    expect(l.spouseLinks.length).toBe(1);
  });
});

describe("layoutTree", () => {
  it("assigns generations, marriages and married-in spouses", () => {
    const a = analyze(stress);
    expect(a.gen.get("r1")).toBe(1);
    expect(a.gen.get("k1")).toBe(2);
    expect(a.gen.get("g1")).toBe(3);
    expect(a.gen.get("k6")).toBe(4);
    expect(a.secondary.has("r2")).toBe(true);
    expect(a.secondary.has("w1")).toBe(true);
    expect(a.secondary.has("w2")).toBe(true);
    expect(a.marriages.filter((m) => m.partners.includes("k1")).length).toBe(2);
  });
  it("places generations vertically without overlapping cards", () => {
    const l = layoutTree(stress, o);
    for (const n of l.nodes) {
      for (const other of l.nodes) {
        if (n.id === other.id) continue;
        expect(
          n.x + o.cardW <= other.x ||
            other.x + o.cardW <= n.x ||
            n.y + o.cardH <= other.y ||
            other.y + o.cardH <= n.y,
        ).toBe(true);
      }
    }
    const parent = l.nodes.find((n) => n.id === "r1");
    const child = l.nodes.find((n) => n.id === "k2");
    const spouse = l.nodes.find((n) => n.id === "r2");
    expect(child?.y).toBeGreaterThan(parent?.y ?? 0);
    expect(parent?.y).toBe(spouse?.y);
    expect(l.edges.length).toBe(15);
    expect(l.edges.every((edge) => edge.to.y > edge.from.y)).toBe(true);
  });
  it("lays generations left-to-right without overlapping cards", () => {
    const l = layoutTreeHorizontal(stress, o);
    for (const n of l.nodes) {
      for (const other of l.nodes) {
        if (n.id === other.id) continue;
        expect(
          n.x + o.cardW <= other.x ||
            other.x + o.cardW <= n.x ||
            n.y + o.cardH <= other.y ||
            other.y + o.cardH <= n.y,
        ).toBe(true);
      }
    }
    const parent = l.nodes.find((n) => n.id === "r1");
    const child = l.nodes.find((n) => n.id === "k2");
    const spouse = l.nodes.find((n) => n.id === "r2");
    expect(child?.x).toBeGreaterThan(parent?.x ?? 0);
    expect(parent?.x).toBe(spouse?.x);
    expect(spouse?.y ?? 0).toBeGreaterThan(parent?.y ?? 0);
    expect(l.edges.length).toBe(15);
    expect(l.edges.every((edge) => edge.to.x > edge.from.x)).toBe(true);
  });
  it("routes connectors per direction and tiles landscape PDFs", () => {
    const e = { from: { x: 0, y: 0 }, to: { x: 100, y: 100 }, jy: 50, jx: 50, childId: "m7" };
    expect(edgePath(e, "straight")).toBe("M0,0 V50 H100 V100");
    expect(edgePath(e, "straight", "horizontal")).toBe("M0,0 H50 V100 H100");
    expect(edgePath(e, "curved", "horizontal")).toBe("M0,0 C50,0 50,100 100,100");
    const tiles = pdfTiles(3000, 1000, true);
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles.every((t) => t.width <= 1500 && t.height <= 1120)).toBe(true);
  });
});

// ─── Centering & balancing helpers ───────────────────────────────────────────

type Analysis = ReturnType<typeof analyze>;

/** Horizontal bounds of a member's whole subtree: own + spouses' cards + descendants. */
function subtreeSpanX(
  l: Layout,
  a: Analysis,
  id: string,
  seen = new Set<string>(),
): [number, number] {
  if (seen.has(id)) return [Infinity, -Infinity];
  seen.add(id);
  let lo = Infinity,
    hi = -Infinity;
  for (const n of l.nodes) {
    if (n.id !== id) continue;
    lo = Math.min(lo, n.x);
    hi = Math.max(hi, n.x + o.cardW);
  }
  for (const u of a.unitsOf.get(id) ?? []) {
    for (const m of u.members) {
      if (m === id) continue;
      for (const n of l.nodes) {
        if (n.id !== m) continue;
        lo = Math.min(lo, n.x);
        hi = Math.max(hi, n.x + o.cardW);
      }
    }
    for (const c of u.childIds) {
      const [cLo, cHi] = subtreeSpanX(l, a, c, seen);
      lo = Math.min(lo, cLo);
      hi = Math.max(hi, cHi);
    }
  }
  return [lo, hi];
}

/** Vertical bounds of a member's whole subtree (horizontal layout). */
function subtreeSpanY(
  l: Layout,
  a: Analysis,
  id: string,
  seen = new Set<string>(),
): [number, number] {
  if (seen.has(id)) return [Infinity, -Infinity];
  seen.add(id);
  let lo = Infinity,
    hi = -Infinity;
  for (const n of l.nodes) {
    if (n.id !== id) continue;
    lo = Math.min(lo, n.y);
    hi = Math.max(hi, n.y + o.cardH);
  }
  for (const u of a.unitsOf.get(id) ?? []) {
    for (const m of u.members) {
      if (m === id) continue;
      for (const n of l.nodes) {
        if (n.id !== m) continue;
        lo = Math.min(lo, n.y);
        hi = Math.max(hi, n.y + o.cardH);
      }
    }
    for (const c of u.childIds) {
      const [cLo, cHi] = subtreeSpanY(l, a, c, seen);
      lo = Math.min(lo, cLo);
      hi = Math.max(hi, cHi);
    }
  }
  return [lo, hi];
}

/** Centre of the cards sitting directly above a unit's children row/column. */
function unitTopCenterX(l: Layout, unit: Unit): number {
  const ns = l.nodes.filter((n) => n.key.startsWith(`${unit.id}:`));
  const top = Math.max(...ns.map((n) => n.y));
  const row = ns.filter((n) => n.y === top);
  return (Math.min(...row.map((n) => n.x)) + Math.max(...row.map((n) => n.x + o.cardW))) / 2;
}

function unitTopCenterY(l: Layout, unit: Unit): number {
  const ns = l.nodes.filter((n) => n.key.startsWith(`${unit.id}:`));
  // Hubs: children hang off the spouse column (max x); couples share one x.
  const left = Math.max(...ns.map((n) => n.x));
  const col = ns.filter((n) => n.x === left);
  return (Math.min(...col.map((n) => n.y)) + Math.max(...col.map((n) => n.y + o.cardH))) / 2;
}

function childrenGroupCenterX(l: Layout, a: Analysis, unit: Unit): number {
  const spans = unit.childIds.map((c) => subtreeSpanX(l, a, c));
  return (Math.min(...spans.map((s) => s[0])) + Math.max(...spans.map((s) => s[1]))) / 2;
}

function childrenGroupCenterY(l: Layout, a: Analysis, unit: Unit): number {
  const spans = unit.childIds.map((c) => subtreeSpanY(l, a, c));
  return (Math.min(...spans.map((s) => s[0])) + Math.max(...spans.map((s) => s[1]))) / 2;
}

/** Liang–Barsky: does the segment touch/enter the rectangle? */
function segHitsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: { x: number; y: number; w: number; h: number },
): boolean {
  const dx = x2 - x1,
    dy = y2 - y1;
  let t0 = 0,
    t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i]! < 0) return false;
    } else {
      const t = q[i]! / p[i]!;
      if (p[i]! < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t0 <= t1;
}

/** Assert that no connector segment crosses the interior of any card. */
function expectNoConnectorHits(l: Layout, cardW: number, cardH: number) {
  const rects = l.nodes.map((n) => ({ x: n.x + 0.5, y: n.y + 0.5, w: cardW - 1, h: cardH - 1 }));
  const segs: [number, number, number, number][] = [];
  for (const e of l.edges) {
    segs.push([e.from.x, e.from.y, e.from.x, e.jy]);
    segs.push([e.from.x, e.jy, e.to.x, e.jy]);
    segs.push([e.to.x, e.jy, e.to.x, e.to.y]);
  }
  for (const s of l.spouseLinks) segs.push([s.x1, s.y1, s.x2, s.y2]);
  for (const [x1, y1, x2, y2] of segs) {
    for (const r of rects) {
      expect(
        segHitsRect(x1, y1, x2, y2, r),
        `connector (${x1},${y1})→(${x2},${y2}) crosses card ${JSON.stringify(r)}`,
      ).toBe(false);
    }
  }
}

/** Every unique card pair must not overlap (compare by node key, not member id). */
function expectNoCardOverlaps(l: Layout, cardW: number, cardH: number) {
  const ns = l.nodes;
  for (let i = 0; i < ns.length; i++) {
    for (let j = i + 1; j < ns.length; j++) {
      const a = ns[i]!,
        b = ns[j]!;
      const apart =
        a.x + cardW <= b.x || b.x + cardW <= a.x || a.y + cardH <= b.y || b.y + cardH <= a.y;
      expect(apart, `cards ${a.key} and ${b.key} overlap`).toBe(true);
    }
  }
}

/** Mixed stress data: hub, childless couple, solo fan, deep chain, 2nd root. */
const stress: Member[] = [
  { id: "r1", name: "R1", gender: "male", birthYear: 1920, spouseIds: ["r2"] },
  { id: "r2", name: "R2", gender: "female", birthYear: 1925, spouseIds: ["r1"] },
  {
    id: "k1",
    name: "K1",
    gender: "male",
    birthYear: 1945,
    parentIds: ["r1"],
    spouseIds: ["w1", "w2"],
  },
  { id: "w1", name: "W1", gender: "female", birthYear: 1948, spouseIds: ["k1"] },
  { id: "w2", name: "W2", gender: "female", birthYear: 1950, spouseIds: ["k1"] },
  { id: "g1", name: "G1", gender: "male", birthYear: 1970, parentIds: ["k1", "w1"] },
  { id: "g2", name: "G2", gender: "female", birthYear: 1972, parentIds: ["k1", "w2"] },
  { id: "g3", name: "G3", gender: "male", birthYear: 1975, parentIds: ["k1", "w2"] },
  { id: "k2", name: "K2", gender: "male", birthYear: 1947, parentIds: ["r1"], spouseIds: ["w3"] },
  { id: "w3", name: "W3", gender: "female", birthYear: 1952, spouseIds: ["k2"] },
  { id: "k3", name: "K3", gender: "female", birthYear: 1949, parentIds: ["r1"] },
  { id: "f1", name: "F1", gender: "male", birthYear: 1970, parentIds: ["k3"] },
  { id: "f2", name: "F2", gender: "female", birthYear: 1972, parentIds: ["k3"] },
  { id: "f3", name: "F3", gender: "male", birthYear: 1974, parentIds: ["k3"] },
  { id: "f4", name: "F4", gender: "female", birthYear: 1976, parentIds: ["k3"] },
  { id: "f5", name: "F5", gender: "male", birthYear: 1978, parentIds: ["k3"] },
  { id: "f6", name: "F6", gender: "female", birthYear: 1980, parentIds: ["k3"] },
  { id: "k4", name: "K4", gender: "male", birthYear: 1951, parentIds: ["r1"] },
  { id: "k5", name: "K5", gender: "male", birthYear: 1975, parentIds: ["k4"] },
  { id: "k6", name: "K6", gender: "male", birthYear: 2000, parentIds: ["k5"], spouseIds: ["w4"] },
  { id: "w4", name: "W4", gender: "female", birthYear: 2002, spouseIds: ["k6"] },
  { id: "solo", name: "SOLO", gender: "male", birthYear: 1900 },
];

describe("root centering & branch balancing", () => {
  const datasets: Record<string, Member[]> = {
    seed: makeSeed(),
    twoWives,
    stress,
  };

  for (const [name, members] of Object.entries(datasets)) {
    it(`${name}: keeps every root centred over its whole subtree (vertical)`, () => {
      const a = analyze(members);
      const l = layoutTree(members, o);
      for (const r of a.roots) {
        // Top-row cards of the root: the whole couple, or just the anchor for hubs.
        const unit0 = a.unitsOf.get(r)?.[0];
        const own = unit0
          ? l.nodes.filter((n) => n.key.startsWith(`${unit0.id}:`))
          : l.nodes.filter((n) => n.id === r);
        const top = Math.min(...own.map((n) => n.y));
        const row = own.filter((n) => n.y === top);
        const ownLo = Math.min(...row.map((n) => n.x));
        const ownHi = Math.max(...row.map((n) => n.x + o.cardW));
        const [lo, hi] = subtreeSpanX(l, a, r);
        expect((ownLo + ownHi) / 2).toBeCloseTo((lo + hi) / 2, 6);
      }
    });

    it(`${name}: keeps every root centred over its whole subtree (horizontal)`, () => {
      const a = analyze(members);
      const l = layoutTreeHorizontal(members, o);
      for (const r of a.roots) {
        const unit0 = a.unitsOf.get(r)?.[0];
        const own = unit0
          ? l.nodes.filter((n) => n.key.startsWith(`${unit0.id}:`))
          : l.nodes.filter((n) => n.id === r);
        const left = Math.min(...own.map((n) => n.x));
        const col = own.filter((n) => n.x === left);
        const ownLo = Math.min(...col.map((n) => n.y));
        const ownHi = Math.max(...col.map((n) => n.y + o.cardH));
        const [lo, hi] = subtreeSpanY(l, a, r);
        expect((ownLo + ownHi) / 2).toBeCloseTo((lo + hi) / 2, 6);
      }
    });

    it(`${name}: centres each couple above its children (vertical)`, () => {
      const a = analyze(members);
      const l = layoutTree(members, o);
      for (const units of a.unitsOf.values()) {
        for (const u of units) {
          if (!u.childIds.length) continue;
          expect(unitTopCenterX(l, u)).toBeCloseTo(childrenGroupCenterX(l, a, u), 6);
        }
      }
    });

    it(`${name}: centres each couple beside its children (horizontal)`, () => {
      const a = analyze(members);
      const l = layoutTreeHorizontal(members, o);
      for (const units of a.unitsOf.values()) {
        for (const u of units) {
          if (!u.childIds.length) continue;
          expect(unitTopCenterY(l, u)).toBeCloseTo(childrenGroupCenterY(l, a, u), 6);
        }
      }
    });
  }

  it("aligns every generation on its own row (vertical)", () => {
    // Hub spouses sit on the sub-row inside their generation band; every
    // other card sits on the generation's anchor row. Nothing else varies.
    const rowH = Math.max(o.cardH + Math.max(o.gapY, 72), 2 * o.cardH + o.spouseGap + 16);
    for (const members of [makeSeed(), twoWives, stress]) {
      const l = layoutTree(members, o);
      for (const n of l.nodes) {
        const rowY = (n.gen - 1) * rowH;
        expect([rowY, rowY + o.cardH + o.spouseGap]).toContain(n.y);
      }
    }
  });

  it("aligns every generation on its own column (horizontal)", () => {
    const colW = o.cardW + Math.max(o.gapX, 72, o.cardW + o.spouseGap + 16);
    for (const members of [makeSeed(), twoWives, stress]) {
      const l = layoutTreeHorizontal(members, o);
      for (const n of l.nodes) {
        const colX = (n.gen - 1) * colW;
        expect([colX, colX + o.cardW + o.spouseGap]).toContain(n.x);
      }
    }
  });

  it("spreads branches on both sides of the root", () => {
    const a = analyze(makeSeed());
    const l = layoutTree(makeSeed(), o);
    const r = a.roots[0]!;
    const own = l.nodes.filter((n) => n.id === r);
    const rootCenter =
      (Math.min(...own.map((n) => n.x)) + Math.max(...own.map((n) => n.x + o.cardW))) / 2;
    const kidCenters = (a.childrenByParent.get(r) ?? []).map((c) => {
      const [lo, hi] = subtreeSpanX(l, a, c);
      return (lo + hi) / 2;
    });
    expect(Math.min(...kidCenters)).toBeLessThan(rootCenter - 1);
    expect(Math.max(...kidCenters)).toBeGreaterThan(rootCenter + 1);
  });

  it("never overlaps cards or crosses them with connectors (vertical)", () => {
    for (const members of [makeSeed(), twoWives, stress]) {
      const l = layoutTree(members, o);
      expectNoCardOverlaps(l, o.cardW, o.cardH);
      expectNoConnectorHits(l, o.cardW, o.cardH);
    }
  });

  it("never overlaps cards or crosses them with connectors (horizontal)", () => {
    for (const members of [makeSeed(), twoWives, stress]) {
      const l = layoutTreeHorizontal(members, o);
      expectNoCardOverlaps(l, o.cardW, o.cardH);
      expectNoConnectorHits(l, o.cardW, o.cardH);
    }
  });
});
