import { describe, expect, it } from "vitest";
import {
  birthOrderLabel,
  buildSiblingOrders,
  compareSiblings,
  siblingRelationLabel,
  sortByBirthOrder,
} from "@/lib/tree/birth-order";
import { englishOrdinal, ordinalLabel, toBengaliDigits } from "@/lib/tree/ordinal";
import type { Member } from "@/lib/tree/types";

const member = (
  id: string,
  birthYear?: number,
  gender: "male" | "female" = "male",
  parentIds?: string[],
): Member => ({
  id,
  name: id,
  gender,
  ...(birthYear === undefined ? {} : { birthYear }),
  ...(parentIds ? { parentIds } : {}),
});

describe("buildSiblingOrders", () => {
  it("ranks the children of one parent from eldest to youngest", () => {
    const members = [
      member("p"),
      member("a", 1995, "female", ["p"]),
      member("b", 1997, "male", ["p"]),
      member("c", 1999, "female", ["p"]),
    ];
    const { byId } = buildSiblingOrders(members);
    expect(byId.get("a")?.rank).toBe(1);
    expect(byId.get("b")?.rank).toBe(2);
    expect(byId.get("c")?.rank).toBe(3);
    expect(byId.get("a")?.total).toBe(3);
    expect(byId.get("a")?.position).toBe("eldest");
    expect(byId.get("b")?.position).toBe("middle");
    expect(byId.get("c")?.position).toBe("youngest");
  });

  it("marks a member whose parents have no other child as an only child", () => {
    const members = [member("p"), member("only", 2000, "female", ["p"])];
    const { byId, groups } = buildSiblingOrders(members);
    expect(byId.get("only")?.position).toBe("only");
    expect(byId.get("only")?.total).toBe(1);
    expect(byId.get("only")?.siblings).toEqual([]);
    // A group of one is not listed as a sibling group.
    expect(groups).toHaveLength(0);
  });

  it("ignores members without parents", () => {
    const { byId } = buildSiblingOrders([member("a", 1990), member("b", 1991)]);
    expect(byId.size).toBe(0);
  });

  it("treats children of the same parent as siblings even with different partners", () => {
    const members = [
      member("p1"),
      member("p2"),
      member("a", 1990, "male", ["p1"]),
      member("b", 1995, "male", ["p1", "p2"]),
    ];
    const { byId } = buildSiblingOrders(members);
    expect(byId.get("a")?.siblings.map((s) => s.id)).toEqual(["b"]);
    expect(byId.get("b")?.siblings.map((s) => s.id)).toEqual(["a"]);
  });

  it("merges half-sibling groups that share a parent", () => {
    const members = [
      member("p"),
      member("a", 1990, "male", ["p"]),
      member("b", 1995, "male", ["p"]),
    ];
    const { byId, groups } = buildSiblingOrders(members);
    expect(groups).toHaveLength(1);
    expect(byId.get("a")?.total).toBe(2);
  });

  it("keeps the original data order for siblings with equal birth years", () => {
    const members = [
      member("p"),
      member("a", 2000, "male", ["p"]),
      member("b", 2000, "male", ["p"]),
      member("c", 2000, "male", ["p"]),
    ];
    const { byId } = buildSiblingOrders(members);
    expect(byId.get("a")?.rank).toBe(1);
    expect(byId.get("b")?.rank).toBe(2);
    expect(byId.get("c")?.rank).toBe(3);
  });

  it("places members with an unknown birth year after the known ones", () => {
    const members = [
      member("p"),
      member("a", undefined, "male", ["p"]),
      member("b", 2000, "male", ["p"]),
      member("c", 2001, "male", ["p"]),
    ];
    const { byId } = buildSiblingOrders(members);
    expect(byId.get("b")?.rank).toBe(1);
    expect(byId.get("c")?.rank).toBe(2);
    expect(byId.get("a")?.rank).toBe(3);
    expect(byId.get("a")?.hasBirthYear).toBe(false);
    expect(byId.get("b")?.hasBirthYear).toBe(true);
  });

  it("lists the siblings of a member oldest first", () => {
    const members = [
      member("p"),
      member("a", 1990, "male", ["p"]),
      member("b", 1995, "male", ["p"]),
      member("c", 2000, "male", ["p"]),
    ];
    const { byId } = buildSiblingOrders(members);
    expect(byId.get("b")?.siblings.map((s) => s.id)).toEqual(["a", "c"]);
    expect(byId.get("b")?.ordered.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input members", () => {
    const members = [
      member("p"),
      member("a", 1990, "male", ["p"]),
      member("b", 1995, "male", ["p"]),
    ];
    const snapshot = JSON.stringify(members);
    buildSiblingOrders(members);
    expect(JSON.stringify(members)).toBe(snapshot);
  });
});

describe("compareSiblings", () => {
  it("reports the age difference between two siblings", () => {
    expect(compareSiblings(member("a", 1990), member("b", 1995))).toBe("older");
    expect(compareSiblings(member("a", 1995), member("b", 1990))).toBe("younger");
    expect(compareSiblings(member("a", 1990), member("b", 1990))).toBe("same");
  });

  it("returns unknown when a birth year is missing", () => {
    expect(compareSiblings(member("a"), member("b", 1990))).toBe("unknown");
    expect(compareSiblings(member("a", 1990), member("b"))).toBe("unknown");
  });
});

describe("birthOrderLabel", () => {
  const members = [
    member("p"),
    member("a", 1990, "male", ["p"]),
    member("b", 1995, "female", ["p"]),
    member("c", 2000, "female", ["p"]),
  ];
  const { byId } = buildSiblingOrders(members);

  it("labels the eldest, youngest and middle child", () => {
    expect(birthOrderLabel(byId.get("a")!, members[1]!)).toEqual({ key: "orderEldestSon" });
    expect(birthOrderLabel(byId.get("c")!, members[3]!)).toEqual({
      key: "orderYoungestDaughter",
    });
    expect(birthOrderLabel(byId.get("b")!, members[2]!)).toEqual({
      key: "orderNthDaughter",
      n: 2,
    });
  });
});

describe("siblingRelationLabel", () => {
  it("names the sibling relation by gender and direction", () => {
    expect(siblingRelationLabel(member("a", 1990, "male"), "older")).toBe("elderBrother");
    expect(siblingRelationLabel(member("a", 1990, "female"), "older")).toBe("elderSister");
    expect(siblingRelationLabel(member("a", 1990, "male"), "younger")).toBe("youngerBrother");
    expect(siblingRelationLabel(member("a", 1990, "female"), "younger")).toBe("youngerSister");
  });
});

describe("sortByBirthOrder", () => {
  it("sorts oldest first and keeps unknown years last", () => {
    const sorted = sortByBirthOrder([member("a"), member("b", 2000), member("c", 1990)]);
    expect(sorted.map((m) => m.id)).toEqual(["c", "b", "a"]);
  });
});

describe("ordinal helpers", () => {
  it("formats English ordinals", () => {
    expect(englishOrdinal(1)).toBe("1st");
    expect(englishOrdinal(2)).toBe("2nd");
    expect(englishOrdinal(3)).toBe("3rd");
    expect(englishOrdinal(4)).toBe("4th");
    expect(englishOrdinal(11)).toBe("11th");
    expect(englishOrdinal(21)).toBe("21st");
  });

  it("formats Bengali ordinals and digits", () => {
    expect(toBengaliDigits(2024)).toBe("২০২৪");
    expect(ordinalLabel(1, "bn")).toBe("১ম");
    expect(ordinalLabel(3, "bn")).toBe("৩য়");
    expect(ordinalLabel(11, "bn")).toBe("১১তম");
    expect(ordinalLabel(11, "en")).toBe("11th");
  });
});
