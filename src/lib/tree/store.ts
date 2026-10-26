import { useSyncExternalStore } from "react";
import type { Member, Settings } from "./types";
import { parentsOf, spousesOf } from "./types";
import { makeSeed } from "./seed";

const KEY = "treemind_v2";

export interface UI {
  selectedId?: string | undefined;
  search: string;
  genFilter: number; // 0 = all
  panelOpen: boolean;
  sidebarOpen: boolean;
  detailsId?: string | undefined;
  /** When set, the tree canvas shows only this family line (FamilyPage card drill-in). */
  focusedRootId?: string | undefined;
  modal?:
    | {
        mode: "add" | "edit" | undefined;
        id?: string;
        relation?: "root" | "child" | "spouse";
        relatedTo?: string;
      }
    | undefined;
  menuId?: string | undefined;
  center?: { id: string | undefined; n: number };
  warning?: string | undefined;
}

export interface State {
  members: Member[];
  settings: Settings;
  ui: UI;
}

const defaultSettings: Settings = {
  language: "bn",
  theme: "light",
  accentColor: "teal",
  nodeSize: 100,
  photoSize: 44,
  lineStyle: "curved",
  treeLayout: "vertical",
  zoom: 1,
};

/**
 * Rebuild the relation arrays from legacy mirrors, backfill missing
 * back-references, prune dangling ids and refresh the legacy mirrors.
 * Keeps old `spouseId`/`parentId`-only data loading unchanged.
 */
export function normalizeRelations(members: Member[]): Member[] {
  members = members.filter((m) => m && typeof m.id === "string");
  const ids = new Set(members.map((m) => m.id));
  const spouseMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();
  for (const m of members) {
    spouseMap.set(m.id, [...new Set(spousesOf(m).filter((s) => s !== m.id && ids.has(s)))]);
    parentMap.set(m.id, [...new Set(parentsOf(m).filter((p) => p !== m.id && ids.has(p)))]);
  }
  for (const [id, sps] of spouseMap) {
    for (const s of sps) {
      const back = spouseMap.get(s)!;
      if (!back.includes(id)) back.push(id);
    }
  }
  return members.map((m) => {
    const sps = spouseMap.get(m.id)!;
    const ps = parentMap.get(m.id)!;
    const next: Member = { ...m };
    next.spouseIds = sps.length ? sps : undefined;
    next.spouseId = sps[0];
    next.parentIds = ps.length ? ps : undefined;
    next.parentId = ps[0];
    return next;
  });
}

let state: State = {
  // New users start with an empty tree and build their own family;
  // demo data is only loaded on demand via resetDemo().
  members: normalizeRelations([]),
  settings: defaultSettings,
  ui: { search: "", genFilter: 0, panelOpen: false, sidebarOpen: false },
};
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ members: state.members, settings: state.settings }));
  } catch (e) {
    console.warn(e);
    state = { ...state, ui: { ...state.ui, warning: "quota" } };
  }
}

export function setState(fn: (s: State) => Partial<State>, save = true) {
  state = { ...state, ...fn(state) };
  if (save) persist();
  listeners.forEach((l) => l());
}

export function setUI(p: Partial<UI>) {
  setState((s) => ({ ui: { ...s.ui, ...p } }), false);
}

export function setSettings(p: Partial<Settings>) {
  setState((s) => ({ settings: { ...s.settings, ...p } }));
}

export function hydrate() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.members)) {
        setState(
          () => ({
            members: normalizeRelations(d.members as Member[]),
            settings: { ...defaultSettings, ...d.settings },
          }),
          false,
        );
        return;
      }
    }
  } catch (e) {
    console.warn(e);
  }
  if (typeof window !== "undefined" && window.innerWidth < 768) setUI({ panelOpen: false });
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
    () => sel(state),
  );
}

export const newId = () =>
  "m" + Date.now().toString(36) + Math.floor(performance.now() * 1000).toString(36);

export function saveMember(m: Member, relation?: "root" | "child" | "spouse", relatedTo?: string) {
  setState((s) => {
    const exists = s.members.some((x) => x.id === m.id);
    let members = exists
      ? // Marriage lists are edited through addMarriage/removeMarriage, so an
        // edit payload must not resurrect or drop spouse links.
        s.members.map((x) =>
          x.id === m.id ? { ...x, ...m, spouseId: x.spouseId, spouseIds: x.spouseIds } : x,
        )
      : [...s.members, m];
    if (!exists && relation === "spouse" && relatedTo) {
      members = members.map((x) =>
        x.id === relatedTo
          ? { ...x, spouseIds: [...spousesOf(x), m.id] }
          : x.id === m.id
            ? { ...x, spouseIds: [relatedTo], parentId: undefined, parentIds: undefined }
            : x,
      );
    }
    // A brand-new separate root starts its own family line — don't keep the
    // old family filter, otherwise the new person would be invisible.
    const focusedRootId = !exists && relation === "root" ? undefined : s.ui.focusedRootId;
    return { members: normalizeRelations(members), ui: { ...s.ui, focusedRootId } };
  });
}

/** Link two members as spouses — a new marriage alongside any existing ones. */
export function addMarriage(aId: string, bId: string) {
  setState((s) => ({
    members: normalizeRelations(
      s.members.map((x) =>
        x.id === aId && !spousesOf(x).includes(bId)
          ? { ...x, spouseIds: [...spousesOf(x), bId] }
          : x.id === bId && !spousesOf(x).includes(aId)
            ? { ...x, spouseIds: [...spousesOf(x), aId] }
            : x,
      ),
    ),
  }));
}

/** Dissolve one marriage between two members; other marriages are untouched. */
export function removeMarriage(aId: string, bId: string) {
  setState((s) => ({
    members: normalizeRelations(
      s.members.map((x) =>
        x.id === aId || x.id === bId
          ? { ...x, spouseIds: spousesOf(x).filter((o) => o !== (x.id === aId ? bId : aId)) }
          : x,
      ),
    ),
  }));
}

export function deleteMember(id: string) {
  setState((s) => {
    const find = (mid: string) => s.members.find((x) => x.id === mid);
    const spouseList = (mid: string) => {
      const m = find(mid);
      return m ? spousesOf(m).filter((o) => find(o)) : [];
    };
    const hasParent = (mid: string) => {
      const m = find(mid);
      return m ? parentsOf(m).some((p) => find(p)) : false;
    };
    const remove = new Set<string>();
    const visit = (mid: string) => {
      if (remove.has(mid)) return;
      remove.add(mid);
      const sps = spouseList(mid);
      for (const sid of sps) {
        // drop a married-in spouse (no parents of their own) only when removing
        // a descendant chain, or a subtree root who themselves has parents
        if (!hasParent(sid) && (mid !== id || hasParent(mid))) remove.add(sid);
      }
      s.members
        .filter((x) => {
          const ps = parentsOf(x);
          return ps.includes(mid) || sps.some((sid) => ps.includes(sid));
        })
        .forEach((c) => visit(c.id));
    };
    visit(id);
    const members = normalizeRelations(
      s.members
        .filter((x) => !remove.has(x.id))
        .map((x) => ({
          ...x,
          spouseIds: spousesOf(x).filter((o) => !remove.has(o)),
          parentIds: parentsOf(x).filter((o) => !remove.has(o)),
        })),
    );
    const focusedRootId = remove.has(s.ui.focusedRootId ?? "") ? undefined : s.ui.focusedRootId;
    return {
      members,
      ui: { ...s.ui, detailsId: undefined, selectedId: undefined, focusedRootId },
    };
  });
}

export function resetDemo() {
  setState((s) => ({
    members: normalizeRelations(makeSeed()),
    ui: { ...s.ui, selectedId: undefined, detailsId: undefined, focusedRootId: undefined },
  }));
}

export function clearAll() {
  setState((s) => ({
    members: [],
    ui: { ...s.ui, selectedId: undefined, detailsId: undefined, focusedRootId: undefined },
  }));
}

/**
 * "New Family" — clears the loaded/demo data and opens a blank tree so the
 * user can create her own family from scratch. Returns false when the user
 * cancels the confirm dialog.
 */
export function startNewFamily(confirmMsg?: string): boolean {
  const msg = confirmMsg ?? "Start a new family? The currently loaded data will be removed.";
  if (typeof window !== "undefined" && getState().members.length > 0) {
    try {
      if (!window.confirm(msg)) return false;
    } catch {
      /* non-browser / test env: proceed */
    }
  }
  clearAll();
  setUI({ modal: { mode: "add", relation: "root" } });
  return true;
}

/** Drill into one family line: the tree canvas shows only that family. */
export function openFamily(rootId: string) {
  setState((s) => ({
    ui: { ...s.ui, focusedRootId: rootId, selectedId: rootId, detailsId: undefined },
  }));
}

export function clearFamilyFocus() {
  setUI({ focusedRootId: undefined });
}

export function importMembers(data: unknown): boolean {
  const arr = Array.isArray(data) ? data : (data as { members?: unknown })?.members;
  if (!Array.isArray(arr)) return false;
  const ok = arr.every(
    (m) =>
      m &&
      typeof m.id === "string" &&
      typeof m.name === "string" &&
      (m.gender === "male" || m.gender === "female"),
  );
  if (!ok) return false;
  setState(() => ({ members: normalizeRelations(arr as Member[]) }));
  return true;
}
