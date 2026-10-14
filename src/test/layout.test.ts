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
  it("places no overlapping nodes and centers parents", () => {
    const l = layoutTree(makeSeed(), o);
    const keys = new Set(l.nodes.map((n) => `${n.x}:${n.y}`));
    expect(keys.size).toBe(l.nodes.length);
    const m3 = l.nodes.find((n) => n.id === "m3")!;
    const kids = l.nodes.filter((n) => ["m7", "m9"].includes(n.id)).map((n) => n.y);
    expect(m3.y).toBe((kids[0]! + kids[1]!) / 2);
    expect(l.edges.length).toBe(8);
  });
});
