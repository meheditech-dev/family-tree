import type { Member } from "./types";
import { parentsOf, spousesOf } from "./types";

export interface FamilyGroup {
  root: Member;
  spouse?: Member | undefined;
  extraSpouses: number;
  size: number;
  depth: number;
  living: number;
  /** Every member id that belongs to this family line (root, spouses, descendants). */
  memberIds: string[];
}

/**
 * One card per family line: the eldest known couple and everyone below them.
 * Shared by FamilyPage (cards) and TreeCanvas (isolated family view) so both
 * agree on which members belong to which family.
 */
export function buildFamilyGroups(members: Member[]): FamilyGroup[] {
  type M = Member;
  type Id = M["id"];

  const byId = new Map<Id, M>(members.map((m) => [m.id, m]));
  const kids = new Map<Id, M[]>();
  members.forEach((m) => {
    for (const p of parentsOf(m)) kids.set(p, [...(kids.get(p) ?? []), m]);
  });
  const spouseList = (m: M) => spousesOf(m).filter((s) => byId.has(s));

  // Someone who married into a family has no parent here, but a spouse does.
  const marriedIn = (m: M) =>
    !parentsOf(m).some((p) => byId.has(p)) &&
    spouseList(m).some((s) => parentsOf(byId.get(s)!).some((p) => byId.has(p)));

  const seen = new Set<Id>();
  const out: FamilyGroup[] = [];

  // Man's perspective: of a couple with no parents here, the male partner
  // heads the family line, regardless of who was added first.
  const ordered = members
    .map((m, i) => [m, i] as const)
    .sort(([a, ai], [b, bi]) => (a.gender === b.gender ? ai - bi : a.gender === "male" ? -1 : 1))
    .map(([m]) => m);

  for (const root of ordered) {
    if (parentsOf(root).some((p) => byId.has(p)) || marriedIn(root) || seen.has(root.id)) continue;
    const spouses = spouseList(root);

    const stack: Id[] = [root.id, ...spouses];
    const ids = new Set<Id>();
    for (let i = 0; i < stack.length; i++) {
      const id = stack[i]!;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.add(id);
      const node = byId.get(id)!;
      for (const s of spouseList(node)) {
        if (!seen.has(s)) {
          stack.push(s);
          ids.add(s);
        }
      }
      for (const k of kids.get(id) ?? []) {
        if (!seen.has(k.id)) stack.push(k.id);
        ids.add(k.id);
        for (const s of spouseList(k)) {
          if (!seen.has(s)) {
            stack.push(s);
          }
          ids.add(s);
        }
      }
    }

    // Depth = longest parent-chain inside this family.
    let maxDepth = 1;
    ids.forEach((id) => {
      let d = 1;
      let cur = byId.get(id);
      const guard = new Set<Id>();
      while (cur && !guard.has(cur.id)) {
        guard.add(cur.id);
        const ps = parentsOf(cur).filter((p) => ids.has(p));
        if (!ps.length) break;
        d += 1;
        cur = byId.get(ps[0]!);
      }
      maxDepth = Math.max(maxDepth, d);
    });

    let living = 0;
    ids.forEach((id) => {
      if (!byId.get(id)?.deathYear) living += 1;
    });

    out.push({
      root,
      spouse: spouses[0] ? byId.get(spouses[0]) : undefined,
      extraSpouses: Math.max(0, spouses.length - 1),
      size: ids.size,
      depth: maxDepth,
      living,
      memberIds: [...ids],
    });
  }
  return out;
}

/**
 * Member ids belonging to the family line headed by `rootId`.
 * Returns null when the root is unknown (caller should show everything).
 */
export function collectFamilyIds(members: Member[], rootId: string): Set<string> | null {
  const groups = buildFamilyGroups(members);
  const g = groups.find((x) => x.root.id === rootId);
  if (!g) return null;
  return new Set(g.memberIds);
}
