import type { Analysis } from "./layout";
import { sortByBirthOrder } from "./birth-order";
import type { Member } from "./types";

export interface MemberGroup {
  id: string;
  kind: "couple" | "siblings" | "individual";
  members: Member[];
  parentIds: string[];
}

export interface MemberColumn {
  generation: number;
  members: Member[];
  groups: MemberGroup[];
}

export function buildMemberBoard(members: Member[], analysis: Analysis): MemberColumn[] {
  const columns = new Map<number, MemberColumn>();
  for (const member of members) {
    const generation = analysis.gen.get(member.id) ?? 1;
    if (!columns.has(generation)) columns.set(generation, { generation, members: [], groups: [] });
    columns.get(generation)!.members.push(member);
  }

  for (const column of columns.values()) {
    const ids = new Set(column.members.map((member) => member.id));
    const grouped = new Set<string>();
    for (const marriage of analysis.marriages) {
      if (!marriage.partners.every((id) => ids.has(id))) continue;
      column.groups.push({
        id: `couple:${marriage.id}`,
        kind: "couple",
        members: marriage.partners.map((id) => analysis.byId.get(id)!),
        parentIds: [],
      });
      marriage.partners.forEach((id) => grouped.add(id));
    }

    const siblings = new Map<string, MemberGroup>();
    for (const member of column.members) {
      if (grouped.has(member.id)) continue;
      const unit = analysis.unitOfChild.get(member.id);
      const parentIds = unit?.members ?? analysis.parentIdsOf.get(member.id) ?? [];
      const key = parentIds.length ? JSON.stringify([...parentIds].sort()) : member.id;
      let group = siblings.get(key);
      if (!group) {
        group = {
          id: `family:${key}`,
          kind: parentIds.length ? "siblings" : "individual",
          members: [],
          parentIds,
        };
        siblings.set(key, group);
        column.groups.push(group);
      }
      group.members.push(member);
    }
    // Siblings are listed eldest first.
    for (const group of column.groups) {
      if (group.kind === "siblings") group.members = sortByBirthOrder(group.members);
    }
  }
  return [...columns.values()].sort((a, b) => a.generation - b.generation);
}
