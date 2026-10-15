import { describe, expect, it } from "vitest";
import { analyze, layoutTree } from "@/lib/tree/layout";
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
        expect(n.x + o.cardW <= other.x || other.x + o.cardW <= n.x || n.y + o.cardH <= other.y || other.y + o.cardH <= n.y).toBe(true);
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
});
