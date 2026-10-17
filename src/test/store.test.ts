import { describe, expect, it } from "vitest";
import {
  addMarriage,
  deleteMember,
  getState,
  importMembers,
  normalizeRelations,
  removeMarriage,
  saveMember,
} from "@/lib/tree/store";

const legacy = () => [
  { id: "f", name: "Father", gender: "male" as const, parentId: undefined, spouseId: "s1" },
  { id: "s1", name: "Spouse1", gender: "female" as const, spouseId: "f" },
  { id: "c1", name: "Child1", gender: "male" as const, parentId: "f" },
  { id: "x", name: "Other", gender: "female" as const },
];

describe("relation normalization", () => {
  it("migrates legacy spouseId/parentId into symmetric arrays", () => {
    const out = normalizeRelations(legacy());
    const f = out.find((m) => m.id === "f")!;
    const s1 = out.find((m) => m.id === "s1")!;
    const c1 = out.find((m) => m.id === "c1")!;
    expect(f.spouseIds).toEqual(["s1"]);
    expect(s1.spouseIds).toEqual(["f"]);
    expect(f.parentIds).toBeUndefined();
    expect(c1.parentIds).toEqual(["f"]);
    expect(c1.parentId).toBe("f");
  });
  it("keeps each marriage as a separate symmetric link when adding and removing", () => {
    expect(importMembers(legacy())).toBe(true);
    addMarriage("f", "x");
    let f = getState().members.find((m) => m.id === "f")!;
    expect(f.spouseIds).toEqual(["s1", "x"]);
    expect(f.spouseId).toBe("s1");
    expect(getState().members.find((m) => m.id === "x")!.spouseIds).toEqual(["f"]);
    removeMarriage("f", "s1");
    f = getState().members.find((m) => m.id === "f")!;
    expect(f.spouseIds).toEqual(["x"]);
    expect(f.spouseId).toBe("x");
    expect(getState().members.find((m) => m.id === "s1")!.spouseIds).toBeUndefined();
  });
  it("adds a second spouse through saveMember without dropping the first", () => {
    importMembers(legacy());
    saveMember({ id: "n1", name: "New spouse", gender: "female" }, "spouse", "f");
    const f = getState().members.find((m) => m.id === "f")!;
    expect(f.spouseIds).toEqual(["s1", "n1"]);
    expect(getState().members.find((m) => m.id === "n1")!.spouseIds).toEqual(["f"]);
  });
  it("deletes only the removed member's descendant branch", () => {
    importMembers([
      { id: "f", name: "Father", gender: "male", spouseIds: ["s1", "s2"] },
      { id: "s1", name: "Spouse1", gender: "female", spouseIds: ["f"] },
      { id: "s2", name: "Spouse2", gender: "female", spouseIds: ["f"] },
      { id: "c1", name: "Child1", gender: "male", parentIds: ["f", "s1"] },
      { id: "c2", name: "Child2", gender: "female", parentIds: ["f", "s2"] },
    ]);
    deleteMember("c1");
    const ids = getState().members.map((m) => m.id);
    expect(ids).not.toContain("c1");
    expect(ids).toContain("c2");
    expect(ids).toContain("s2");
    expect(getState().members.find((m) => m.id === "f")!.spouseIds).toEqual(["s1", "s2"]);
  });
});
