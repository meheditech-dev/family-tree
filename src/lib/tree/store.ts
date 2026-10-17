import { useSyncExternalStore } from "react";
import type { Member, Settings } from "./types";
import { makeSeed } from "./seed";

const KEY = "treemind_v1";

export interface UI {
  selectedId?: string | undefined;
  search: string;
  genFilter: number; // 0 = all
  panelOpen: boolean;
  sidebarOpen: boolean;
  detailsId?: string | undefined;
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
  zoom: 1,
};

let state: State = {
  members: makeSeed(),
  settings: defaultSettings,
  ui: { search: "", genFilter: 0, panelOpen: true, sidebarOpen: false },
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
          () => ({ members: d.members, settings: { ...defaultSettings, ...d.settings } }),
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
      ? s.members.map((x) => (x.id === m.id ? { ...x, ...m } : x))
      : [...s.members, m];
    if (!exists && relation === "spouse" && relatedTo) {
      members = members.map((x) =>
        x.id === relatedTo
          ? { ...x, spouseId: m.id }
          : x.id === m.id
            ? { ...x, spouseId: relatedTo, parentId: undefined }
            : x,
      );
    }
    return { members };
  });
}

export function deleteMember(id: string) {
  setState((s) => {
    const remove = new Set<string>();
    const visit = (mid: string) => {
      if (remove.has(mid)) return;
      remove.add(mid);
      const m = s.members.find((x) => x.id === mid);
      const sp = m?.spouseId ? s.members.find((x) => x.id === m.spouseId) : undefined;
      // drop spouse that married in (no own parent) only when removing a descendant chain
      if (sp && !sp.parentId && mid !== id) remove.add(sp.id);
      if (sp && !sp.parentId && mid === id && m?.parentId) remove.add(sp.id);
      s.members
        .filter((x) => x.parentId === mid || (sp && x.parentId === sp.id))
        .forEach((c) => visit(c.id));
    };
    visit(id);
    const members = s.members
      .filter((x) => !remove.has(x.id))
      .map((x) => (x.spouseId && remove.has(x.spouseId) ? { ...x, spouseId: undefined } : x));
    return { members, ui: { ...s.ui, detailsId: undefined, selectedId: undefined } };
  });
}

export function resetDemo() {
  setState((s) => ({
    members: makeSeed(),
    ui: { ...s.ui, selectedId: undefined, detailsId: undefined },
  }));
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
  setState(() => ({ members: arr as Member[] }));
  return true;
}
