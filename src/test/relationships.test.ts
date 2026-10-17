import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/tree/layout";
import { relationKey } from "@/lib/tree/helpers";
import type { Member } from "@/lib/tree/types";

/**
 * Self-contained family (independent of the demo seed so seed edits can't
 * break the relationship-logic tests):
 *
 *   g1 ⚭ g2                    grandparents
 *   ├─ f1 ⚭ f2                 father (f2 married in) / mother
 *   │  ├─ ref ⚭ sp             reference person + spouse
 *   │  │  └─ kid               son
 *   │  └─ sib                  sister
 *   └─ u1 ⚭ u2                 uncle / aunt
 *      └─ cous                 cousin
 */
const family: Member[] = [
  { id: "g1", name: "Grandpa", gender: "male", birthYear: 1930, spouseIds: ["g2"] },
  { id: "g2", name: "Grandma", gender: "female", birthYear: 1935, spouseIds: ["g1"] },
  { id: "f1", name: "Father", gender: "male", birthYear: 1955, parentIds: ["g1"], spouseIds: ["f2"] },
  { id: "f2", name: "Mother", gender: "female", birthYear: 1958, spouseIds: ["f1"] },
  { id: "u1", name: "Uncle", gender: "male", birthYear: 1960, parentIds: ["g1"], spouseIds: ["u2"] },
  { id: "u2", name: "Aunt", gender: "female", birthYear: 1963, spouseIds: ["u1"] },
  { id: "ref", name: "Ref", gender: "male", birthYear: 1980, parentIds: ["f1"], spouseIds: ["sp"] },
  { id: "sp", name: "Spouse", gender: "female", birthYear: 1983, spouseIds: ["ref"] },
  { id: "sib", name: "Sister", gender: "female", birthYear: 1985, parentIds: ["f1"] },
  { id: "kid", name: "Son", gender: "male", birthYear: 2005, parentIds: ["ref", "sp"] },
  { id: "cous", name: "Cousin", gender: "female", birthYear: 1990, parentIds: ["u1", "u2"] },
];

describe("selected-person relationships", () => {
  const analysis = analyze(family);
  const relation = (id: string, reference: string) => {
    const member = analysis.byId.get(id);
    if (!member) throw new Error("Missing test member");
    return relationKey(member, analysis, reference);
  };

  it("labels blood relatives from the reference person's perspective", () => {
    expect(relation("ref", "ref")).toBe("self");
    expect(relation("f1", "ref")).toBe("father");
    expect(relation("f2", "ref")).toBe("mother");
    expect(relation("g1", "ref")).toBe("grandfather");
    expect(relation("g2", "ref")).toBe("grandmother");
    expect(relation("sib", "ref")).toBe("sister");
    expect(relation("kid", "ref")).toBe("son");
    expect(relation("u1", "ref")).toBe("uncle");
    expect(relation("u2", "ref")).toBe("aunt");
    expect(relation("cous", "ref")).toBe("cousin");
  });

  it("changes perspective when the reference person changes", () => {
    expect(relation("ref", "f1")).toBe("son");
    expect(relation("f2", "f1")).toBe("spouse");
    expect(relation("ref", "g1")).toBe("grandson");
    expect(relation("kid", "g1")).toBe("ggson");
    expect(relation("sib", "u1")).toBe("niece");
    expect(relation("ref", "f2")).toBe("son");
  });

  it("recognizes relationships from a married-in spouse", () => {
    expect(relation("f1", "f2")).toBe("spouse");
    expect(relation("g1", "f2")).toBe("fatherInLaw");
    expect(relation("g2", "f2")).toBe("motherInLaw");
    expect(relation("f2", "u1")).toBe("sisterInLaw");
    expect(relation("f2", "g1")).toBe("daughterInLaw");
    expect(relation("sp", "f1")).toBe("daughterInLaw");
    expect(relation("u1", "sp")).toBe("relativeInLaw");
  });

  it("labels every spouse of a polygamous member", () => {
    const multi = analyze([
      { id: "p1", name: "A", gender: "male", spouseIds: ["s1", "s2"] },
      { id: "s1", name: "B", gender: "female", spouseIds: ["p1"] },
      { id: "s2", name: "C", gender: "female", spouseIds: ["p1"] },
      { id: "c1", name: "D", gender: "male", parentIds: ["p1", "s1"] },
      { id: "c2", name: "E", gender: "female", parentIds: ["p1", "s2"] },
    ]);
    const rel = (id: string, ref: string) => relationKey(multi.byId.get(id)!, multi, ref);
    expect(rel("s1", "p1")).toBe("spouse");
    expect(rel("s2", "p1")).toBe("spouse");
    expect(rel("p1", "s2")).toBe("spouse");
    expect(rel("c1", "p1")).toBe("son");
    expect(rel("c2", "p1")).toBe("daughter");
  });
});
