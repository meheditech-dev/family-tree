import { describe, expect, it } from "vitest";
import { analyze, edgePath, layoutTree, layoutTreeHorizontal } from "@/lib/tree/layout";
import { pdfTiles } from "@/lib/tree/export-geometry";
import { makeSeed } from "@/lib/tree/seed";

const o = { cardW: 200, cardH: 70, gapX: 60, gapY: 20, spouseGap: 24 };

describe("layoutTree", () => {
  it("assigns generations and spouses", () => {
    const a = analyze(makeSeed());
    expect(a.gen.get("m1")).toBe(1);
    expect(a.gen.get("m2")).toBe(1);
    expect(a.secondary.has("m2")).toBe(true);
    expect(a.gen.get("m7")).toBe(3);
  });
  it("places generations vertically without overlapping cards", () => {
    const l = layoutTree(makeSeed(), o);
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
    const parent = l.nodes.find((n) => n.id === "m3");
    const child = l.nodes.find((n) => n.id === "m7");
    const spouse = l.nodes.find((n) => n.id === "m4");
    expect(child?.y).toBeGreaterThan(parent?.y ?? 0);
    expect(parent?.y).toBe(spouse?.y);
    expect(l.edges.length).toBe(8);
    expect(l.edges.every((edge) => edge.to.y > edge.from.y)).toBe(true);
  });
  it("lays generations left-to-right without overlapping cards", () => {
    const l = layoutTreeHorizontal(makeSeed(), o);
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
    const parent = l.nodes.find((n) => n.id === "m3");
    const child = l.nodes.find((n) => n.id === "m7");
    const spouse = l.nodes.find((n) => n.id === "m4");
    expect(child?.x).toBeGreaterThan(parent?.x ?? 0);
    expect(parent?.x).toBe(spouse?.x);
    expect(spouse?.y ?? 0).toBeGreaterThan(parent?.y ?? 0);
    expect(l.edges.length).toBe(8);
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
