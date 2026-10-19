import { describe, expect, it, vi } from "vitest";
import {
  addMarriage,
  clearAll,
  deleteMember,
  getState,
  importMembers,
  normalizeRelations,
  openFamily,
  clearFamilyFocus,
  removeMarriage,
  resetDemo,
  saveMember,
  startNewFamily,
} from "@/lib/tree/store";
import { buildFamilyGroups, collectFamilyIds } from "@/lib/tree/families";

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
  it("adds a separate root family alongside existing members", () => {
    importMembers(legacy());
    saveMember({ id: "new-root", name: "New Family Head", gender: "male" }, "root");
    const ids = getState().members.map((m) => m.id);
    expect(ids).toContain("new-root");
    expect(ids).toContain("f");
    const added = getState().members.find((m) => m.id === "new-root")!;
    expect(added.parentIds).toBeUndefined();
    expect(added.spouseIds).toBeUndefined();
  });
  it("clears all members after demo data so a fresh family can start", () => {
    resetDemo();
    expect(getState().members.length).toBeGreaterThan(0);
    clearAll();
    expect(getState().members).toEqual([]);
    saveMember({ id: "fresh-root", name: "Fresh Start", gender: "female" }, "root");
    expect(getState().members.map((m) => m.id)).toEqual(["fresh-root"]);
  });
  it("startNewFamily removes loaded demo data and opens a blank root form", () => {
    resetDemo();
    expect(getState().members.length).toBeGreaterThan(0);
    vi.stubGlobal("confirm", () => true);
    // jsdom has no window.confirm by default; simulate user accepting.
    (window as unknown as { confirm: (m: string) => boolean }).confirm = () => true;
    expect(startNewFamily("confirm?")).toBe(true);
    expect(getState().members).toEqual([]);
    expect(getState().ui.modal).toEqual({ mode: "add", relation: "root" });
    saveMember({ id: "her-root", name: "Her Family", gender: "female" }, "root");
    expect(getState().members.map((m) => m.id)).toEqual(["her-root"]);
    vi.unstubAllGlobals();
  });
  it("startNewFamily keeps loaded data when the user cancels", () => {
    resetDemo();
    const before = getState().members.length;
    (window as unknown as { confirm: (m: string) => boolean }).confirm = () => false;
    expect(startNewFamily("confirm?")).toBe(false);
    expect(getState().members.length).toBe(before);
    delete (window as unknown as { confirm?: unknown }).confirm;
  });
  it("openFamily focuses one family line so the tree shows only that family", () => {
    resetDemo();
    const groups = buildFamilyGroups(getState().members);
    expect(groups.length).toBeGreaterThan(0);
    const first = groups[0]!;
    openFamily(first.root.id);
    expect(getState().ui.focusedRootId).toBe(first.root.id);
    const ids = collectFamilyIds(getState().members, first.root.id);
    expect(ids).not.toBeNull();
    expect(ids!.size).toBe(first.size);
    // Every other family line is disjoint.
    for (const g of groups.slice(1)) {
      for (const id of g.memberIds) expect(ids!.has(id)).toBe(false);
    }
    clearFamilyFocus();
    expect(getState().ui.focusedRootId).toBeUndefined();
  });
});
