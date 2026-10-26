import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/tree/layout";
import { buildMemberBoard, type MemberColumn } from "@/lib/tree/member-board";
import { makeSeed } from "@/lib/tree/seed";
import type { Member } from "@/lib/tree/types";

const ids = (members: Member[]) => members.map((member) => member.id);

function expectComplete(columns: MemberColumn[], members: Member[]) {
  const columnIds = columns.flatMap((column) => ids(column.members));
  expect(columnIds.sort()).toEqual(ids(members).sort());
  expect(new Set(columnIds).size).toBe(members.length);
  for (const column of columns) {
    const cardIds = column.groups.flatMap((group) => ids(group.members));
    expect([...new Set(cardIds)].sort()).toEqual(ids(column.members).sort());
  }
}

const multipleMarriages: Member[] = [
  { id: "p", name: "Parent", gender: "male", spouseIds: ["s1", "s2"] },
  { id: "s1", name: "First spouse", gender: "female", spouseIds: ["p"] },
  { id: "s2", name: "Second spouse", gender: "female", spouseIds: ["p"] },
  { id: "c1", name: "First child", gender: "male", parentIds: ["p", "s1"] },
  { id: "c2", name: "Second child", gender: "female", parentIds: ["s1", "p"] },
  { id: "c3", name: "Third child", gender: "male", parentIds: ["p", "s2"] },
  { id: "c4", name: "Fourth child", gender: "female", parentIds: ["s2", "p"] },
];

const soloFamily: Member[] = [
  { id: "p", name: "Solo parent", gender: "female" },
  { id: "c1", name: "First child", gender: "male", parentIds: ["p"] },
  { id: "c2", name: "Second child", gender: "female", parentIds: ["p"] },
];

describe("buildMemberBoard", () => {
  it("includes all 23 seed members once in columns of 2, 6, 13 and 2", () => {
    const members = makeSeed();
    const columns = buildMemberBoard(members, analyze(members));

    expect(columns.map((column) => column.generation)).toEqual([1, 2, 3, 4]);
    expect(columns.map((column) => column.members.length)).toEqual([2, 6, 13, 2]);
    expect(new Set(columns.flatMap((column) => ids(column.members))).size).toBe(23);
    expectComplete(columns, members);
  });

  it("pairs seed spouses in marriage cards instead of grouping married siblings", () => {
    const members = makeSeed();
    const columns = buildMemberBoard(members, analyze(members));

    expect(columns[0]!.groups.map((group) => ids(group.members))).toEqual([["m1", "m2"]]);
    expect(columns[1]!.groups.map((group) => ids(group.members))).toEqual([
      ["m3", "m4"],
      ["m5", "m6"],
      ["m13", "m14"],
    ]);
    for (const group of [...columns[0]!.groups, ...columns[1]!.groups]) {
      expect(group.kind).toBe("couple");
      expect(group.parentIds).toEqual([]);
    }
  });

  it("groups remaining seed siblings by their analyzed family rather than legacy parent links", () => {
    const members = makeSeed();
    const columns = buildMemberBoard(members, analyze(members));

    expect(
      columns[2]!.groups.map((group) => ({
        kind: group.kind,
        members: ids(group.members),
        parentIds: group.parentIds,
      })),
    ).toEqual([
      {
        kind: "siblings",
        members: ["m7", "m8", "m9", "m15", "m16", "m17", "m18", "m19"],
        parentIds: ["m3", "m4"],
      },
      { kind: "siblings", members: ["m10", "m11", "m12"], parentIds: ["m5", "m6"] },
      { kind: "siblings", members: ["m20", "m21"], parentIds: ["m13", "m14"] },
    ]);
    expect(columns[3]!.groups).toHaveLength(1);
    expect(columns[3]!.groups[0]).toMatchObject({ kind: "siblings", parentIds: ["m8"] });
    expect(ids(columns[3]!.groups[0]!.members)).toEqual(["m22", "m23"]);
  });

  it("repeats a multi-marriage anchor in two cards but counts it once in column.members", () => {
    const columns = buildMemberBoard(multipleMarriages, analyze(multipleMarriages));
    const parents = columns[0]!;

    expect(parents.generation).toBe(1);
    expect(ids(parents.members)).toEqual(["p", "s1", "s2"]);
    expect(parents.groups.map((group) => ids(group.members))).toEqual([
      ["p", "s1"],
      ["p", "s2"],
    ]);
    expect(parents.groups.every((group) => group.kind === "couple")).toBe(true);
    expect(new Set(parents.groups.map((group) => group.id)).size).toBe(2);
    expect(
      parents.groups.flatMap((group) => ids(group.members)).filter((id) => id === "p"),
    ).toHaveLength(2);
    expectComplete(columns, multipleMarriages);
  });

  it("keeps half siblings from different marriages in separate sibling groups", () => {
    const columns = buildMemberBoard(multipleMarriages, analyze(multipleMarriages));
    const children = columns[1]!;

    expect(children.generation).toBe(2);
    expect(
      children.groups.map((group) => ({
        kind: group.kind,
        members: ids(group.members),
        parentIds: group.parentIds,
      })),
    ).toEqual([
      { kind: "siblings", members: ["c1", "c2"], parentIds: ["p", "s1"] },
      { kind: "siblings", members: ["c3", "c4"], parentIds: ["p", "s2"] },
    ]);
    expect(new Set(children.groups.map((group) => group.id)).size).toBe(2);
    expectComplete(columns, multipleMarriages);
  });

  it("uses a canonical parent key across units with different IDs and reversed member order", () => {
    const analysis = analyze(multipleMarriages);
    const unit = analysis.unitOfChild.get("c2")!;
    const reversedParents = [...unit.members].reverse();
    analysis.unitOfChild.set("c2", {
      ...unit,
      id: "separate-reversed-unit",
      members: reversedParents,
      childIds: ["c2"],
    });

    const columns = buildMemberBoard(multipleMarriages, analysis);

    expect(columns[1]!.groups.map((group) => ids(group.members))).toEqual([
      ["c1", "c2"],
      ["c3", "c4"],
    ]);
    expect(analysis.unitOfChild.get("c2")!.members).toEqual(["s1", "p"]);
    expectComplete(columns, multipleMarriages);
  });

  it("groups solo-parent siblings even when analysis supplies separate units", () => {
    const analysis = analyze(soloFamily);
    // Separate unit identities must not split children of the same solo parent.
    for (const childId of ["c1", "c2"]) {
      analysis.unitOfChild.set(childId, {
        id: `solo:${childId}`,
        owner: "p",
        members: ["p"],
        childIds: [childId],
      });
    }

    const columns = buildMemberBoard(soloFamily, analysis);

    expect(columns[1]!.groups).toHaveLength(1);
    expect(columns[1]!.groups[0]).toMatchObject({ kind: "siblings", parentIds: ["p"] });
    expect(ids(columns[1]!.groups[0]!.members)).toEqual(["c1", "c2"]);
    expectComplete(columns, soloFamily);
  });

  it("falls back to analyzed parent IDs when children have no assigned unit", () => {
    const analysis = analyze(multipleMarriages);
    analysis.unitOfChild.clear();

    const columns = buildMemberBoard(multipleMarriages, analysis);

    expect(columns[1]!.groups.map((group) => ids(group.members))).toEqual([
      ["c1", "c2"],
      ["c3", "c4"],
    ]);
    expect(columns[1]!.groups.every((group) => group.kind === "siblings")).toBe(true);
    expectComplete(columns, multipleMarriages);
  });

  it("does not create a marriage card when partners belong to different generations", () => {
    const members: Member[] = [
      { id: "p", name: "Partner", gender: "male", spouseIds: ["s"] },
      { id: "s", name: "Spouse", gender: "female", spouseIds: ["p"] },
    ];
    const analysis = analyze(members);
    analysis.gen.set("s", 2);

    const columns = buildMemberBoard(members, analysis);

    expect(columns.map((column) => column.generation)).toEqual([1, 2]);
    expect(columns.map((column) => column.groups.map((group) => group.kind))).toEqual([
      ["individual"],
      ["individual"],
    ]);
    expectComplete(columns, members);
  });

  it("does not pull an absent spouse into the board from analysis", () => {
    const analysis = analyze(multipleMarriages);
    const members = multipleMarriages.filter((member) => member.id !== "s2");

    const columns = buildMemberBoard(members, analysis);

    expect(columns[0]!.groups.map((group) => ids(group.members))).toEqual([["p", "s1"]]);
    expectComplete(columns, members);
  });

  it("includes disconnected members and unknown birth years without merging unrelated people", () => {
    const members: Member[] = [
      ...soloFamily,
      { id: "isolated", name: "Disconnected", gender: "male", birthYear: 1950 },
      { id: "unknown", name: "Unknown birth year", gender: "female" },
    ];

    const columns = buildMemberBoard(members, analyze(members));

    expect(columns.map((column) => column.members.length)).toEqual([3, 2]);
    expect(
      columns[0]!.groups.map((group) => ({ kind: group.kind, members: ids(group.members) })),
    ).toEqual([
      { kind: "individual", members: ["p"] },
      { kind: "individual", members: ["isolated"] },
      { kind: "individual", members: ["unknown"] },
    ]);
    expectComplete(columns, members);
  });

  it("defaults a member missing from the generation analysis to generation 1", () => {
    const unassigned: Member = { id: "unassigned", name: "Unassigned", gender: "male" };
    const members = [...soloFamily, unassigned];
    const analysis = analyze(soloFamily);

    expect(analysis.gen.has(unassigned.id)).toBe(false);
    const columns = buildMemberBoard(members, analysis);

    expect(columns[0]!.generation).toBe(1);
    expect(ids(columns[0]!.members)).toEqual(["p", "unassigned"]);
    expect(
      columns[0]!.groups.find((group) => ids(group.members).includes("unassigned")),
    ).toMatchObject({
      kind: "individual",
      members: [unassigned],
      parentIds: [],
    });
    expectComplete(columns, members);
  });

  it("lists siblings in a sibling group from eldest to youngest", () => {
    const members: Member[] = [
      { id: "p", name: "Parent", gender: "male" },
      { id: "youngest", name: "Youngest", gender: "male", birthYear: 2010, parentIds: ["p"] },
      { id: "eldest", name: "Eldest", gender: "female", birthYear: 1990, parentIds: ["p"] },
      { id: "middle", name: "Middle", gender: "male", birthYear: 2000, parentIds: ["p"] },
    ];

    const columns = buildMemberBoard(members, analyze(members));
    const group = columns[1]!.groups.find((entry) => entry.kind === "siblings");

    expect(ids(group!.members)).toEqual(["eldest", "middle", "youngest"]);
  });

  it("returns no columns for empty input", () => {
    expect(buildMemberBoard([], analyze([]))).toEqual([]);
    expect(buildMemberBoard([], analyze(makeSeed()))).toEqual([]);
  });

  it("keeps more than four generations and sorts columns numerically regardless of input order", () => {
    const members: Member[] = Array.from({ length: 10 }, (_, index) => ({
      id: `g${index + 1}`,
      name: `Generation ${index + 1}`,
      gender: "male" as const,
      parentIds: index > 0 ? [`g${index}`] : [],
    })).reverse();

    const columns = buildMemberBoard(members, analyze(members));

    expect(columns.map((column) => column.generation)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(columns.map((column) => ids(column.members))).toEqual([
      ["g1"],
      ["g2"],
      ["g3"],
      ["g4"],
      ["g5"],
      ["g6"],
      ["g7"],
      ["g8"],
      ["g9"],
      ["g10"],
    ]);
    expectComplete(columns, members);
  });
});
