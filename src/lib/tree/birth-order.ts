import { parentsOf } from "./types";
import type { Member } from "./types";
import type { TKey } from "./i18n";

/** Where a member sits inside their sibling group. */
export type BirthPosition = "eldest" | "middle" | "youngest" | "only";

/** The birth order of one member inside their sibling group. */
export interface SiblingOrder {
  /** 1-based rank among siblings, eldest first. */
  rank: number;
  /** Number of members in the sibling group (the member included). */
  total: number;
  position: BirthPosition;
  /** True when the member has a usable birth year. */
  hasBirthYear: boolean;
  /** Every sibling of the member (including the member), oldest first. */
  ordered: Member[];
  /** The siblings only (the member excluded), oldest first. */
  siblings: Member[];
}

export interface SiblingOrders {
  /** Birth order per member id. Members without parents are absent. */
  byId: Map<string, SiblingOrder>;
  /** Sibling groups, each ordered oldest first. */
  groups: Member[][];
}

const hasUsableBirthYear = (member: Member) =>
  typeof member.birthYear === "number" && Number.isFinite(member.birthYear);

/**
 * Compares two members for birth order.
 *
 * Primary key is the birth year (oldest first). Members without a usable
 * birth year cannot be placed reliably, so they are pushed to the end of the
 * group and keep their original data order — a deterministic fallback that
 * never reorders members whose relative age is actually known.
 */
function compareBirthOrder(a: Member, b: Member, index: Map<string, number>): number {
  const aKnown = hasUsableBirthYear(a);
  const bKnown = hasUsableBirthYear(b);
  if (aKnown && bKnown) {
    const difference = (a.birthYear ?? 0) - (b.birthYear ?? 0);
    if (difference !== 0) return difference;
  } else if (aKnown !== bKnown) {
    return aKnown ? -1 : 1;
  }
  return (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0);
}

/**
 * Builds the sibling structure of a family.
 *
 * Siblings are the children of a shared parent — including children of the
 * same parent who were born to different partners. When a member lists
 * several parents, every one of their children counts as a sibling.
 */
export function buildSiblingOrders(members: Member[]): SiblingOrders {
  const byId = new Map(members.map((member) => [member.id, member]));
  const index = new Map(members.map((member, i) => [member.id, i]));

  // Children of the same parent are siblings — even when the other parent
  // differs (half-siblings). Union-find merges every such set into one group.
  const parentOf = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parentOf.get(root) !== root) root = parentOf.get(root)!;
    let current = id;
    while (current !== root) {
      const next = parentOf.get(current)!;
      parentOf.set(current, root);
      current = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return;
    const [keep, drop] = rootA < rootB ? [rootA, rootB] : [rootB, rootA];
    parentOf.set(drop, keep);
  };
  for (const member of members) parentOf.set(member.id, member.id);
  const childrenByParent = new Map<string, string[]>();
  for (const member of members) {
    for (const parentId of parentsOf(member)) {
      if (!byId.has(parentId) || parentId === member.id) continue;
      const list = childrenByParent.get(parentId);
      if (list) {
        list.push(member.id);
        union(list[0]!, member.id);
      } else {
        childrenByParent.set(parentId, [member.id]);
      }
    }
  }

  // One group per connected set of siblings.
  // Only members that actually have a parent take part — a root member is
  // never part of a sibling group, but a member whose parents have no other
  // child is an only child and forms a group of one.
  const groupMembers = new Map<string, Member[]>();
  for (const member of members) {
    const hasParent = parentsOf(member).some((id) => byId.has(id) && id !== member.id);
    if (!hasParent) continue;
    const root = find(member.id);
    const list = groupMembers.get(root);
    if (list) list.push(member);
    else groupMembers.set(root, [member]);
  }

  const orderById = new Map<string, SiblingOrder>();
  const groups: Member[][] = [];
  for (const group of groupMembers.values()) {
    const ordered = [...group].sort((a, b) => compareBirthOrder(a, b, index));
    // A group of one is an only child — it is not listed as a sibling group.
    if (ordered.length > 1) groups.push(ordered);
    ordered.forEach((member, position) => {
      const rank = position + 1;
      const total = ordered.length;
      const birthPosition: BirthPosition =
        total === 1 ? "only" : rank === 1 ? "eldest" : rank === total ? "youngest" : "middle";
      orderById.set(member.id, {
        rank,
        total,
        position: birthPosition,
        hasBirthYear: hasUsableBirthYear(member),
        ordered,
        siblings: ordered.filter((m) => m.id !== member.id),
      });
    });
  }

  return { byId: orderById, groups };
}

/**
 * Sorts members oldest first by birth year.
 * Members without a usable birth year keep their relative data order and are
 * placed after the ones whose age is known.
 */
export function sortByBirthOrder(members: Member[]): Member[] {
  const index = new Map(members.map((member, i) => [member.id, i]));
  return [...members].sort((a, b) => compareBirthOrder(a, b, index));
}

/**
 * Compares two siblings by age.
 * Returns "older", "younger", "same" or "unknown" (missing birth years).
 */
export function compareSiblings(a: Member, b: Member): "older" | "younger" | "same" | "unknown" {
  if (!hasUsableBirthYear(a) || !hasUsableBirthYear(b)) return "unknown";
  if (a.birthYear === b.birthYear) return "same";
  return (a.birthYear ?? 0) < (b.birthYear ?? 0) ? "older" : "younger";
}

/** A localized label for a member's place in the sibling group. */
export interface OrderLabel {
  key: TKey;
  /** Placeholder for the ordinal — only set for the "n-th child" labels. */
  n?: number;
}

/**
 * The birth-order label of a member: "Eldest son", "3rd daughter",
 * "Youngest son", "Only child" …
 */
export function birthOrderLabel(order: SiblingOrder, member: Member): OrderLabel {
  const son = member.gender === "male";
  if (order.total <= 1) return { key: "orderOnlyChild" };
  if (order.rank === 1) return { key: son ? "orderEldestSon" : "orderEldestDaughter" };
  if (order.rank === order.total)
    return { key: son ? "orderYoungestSon" : "orderYoungestDaughter" };
  return { key: son ? "orderNthSon" : "orderNthDaughter", n: order.rank };
}

/**
 * The relation label of one sibling relative to another:
 * "Elder brother", "Younger sister" …
 */
export function siblingRelationLabel(member: Member, direction: "older" | "younger"): TKey {
  const male = member.gender === "male";
  if (direction === "older") return male ? "elderBrother" : "elderSister";
  return male ? "youngerBrother" : "youngerSister";
}
