import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/tree/layout";
import { relationKey } from "@/lib/tree/helpers";
import { makeSeed } from "@/lib/tree/seed";

describe("selected-person relationships", () => {
  const members = makeSeed();
  const analysis = analyze(members);
  const relation = (id: string, reference: string) => {
    const member = analysis.byId.get(id);
    if (!member) throw new Error("Missing test member");
    return relationKey(member, analysis, reference);
  };
  it("changes perspective from a grandchild to a parent", () => {
    expect(relation("m7", "m7")).toBe("self");
    expect(relation("m3", "m7")).toBe("father");
    expect(relation("m4", "m7")).toBe("mother");
    expect(relation("m1", "m7")).toBe("grandfather");
    expect(relation("m2", "m7")).toBe("grandmother");
    expect(relation("m8", "m7")).toBe("brother");
    expect(relation("m9", "m7")).toBe("sister");
    expect(relation("m5", "m7")).toBe("uncle");
    expect(relation("m6", "m7")).toBe("aunt");
    expect(relation("m10", "m7")).toBe("cousin");
    expect(relation("m7", "m3")).toBe("daughter");
    expect(relation("m4", "m3")).toBe("spouse");
    expect(relation("m7", "m5")).toBe("niece");
  });
  it("recognizes relationships from a married-in spouse", () => {
    expect(relation("m7", "m4")).toBe("daughter");
    expect(relation("m1", "m4")).toBe("fatherInLaw");
    expect(relation("m2", "m4")).toBe("motherInLaw");
    expect(relation("m5", "m4")).toBe("brotherInLaw");
    expect(relation("m4", "m1")).toBe("daughterInLaw");
  });
});