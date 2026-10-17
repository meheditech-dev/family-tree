export type Gender = "male" | "female";
export type ParentLink = "biological" | "adoptive";

export interface Member {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number | undefined;
  deathYear?: number | undefined;
  photo?: string | undefined;
  role?: string | undefined;
  /** Legacy single-parent mirror — always equals parentIds[0] after normalization. */
  parentId?: string | undefined;
  /** All parents (biological or adoptive), in the order they were linked. */
  parentIds?: string[] | undefined;
  /** How this member is linked to `parentIds` — biological or adoptive. */
  parentLink?: ParentLink | undefined;
  /** Legacy first-spouse mirror — always equals spouseIds[0] after normalization. */
  spouseId?: string | undefined;
  /** Every spouse; each entry represents one marriage, in marriage order. */
  spouseIds?: string[] | undefined;
  notes?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  occupation?: string | undefined;
  bloodGroup?: string | undefined;
  birthplace?: string | undefined;
}

/** All spouses of a member — `spouseIds` wins when present (empty = unlinked). */
export const spousesOf = (m: Member): string[] =>
  m.spouseIds ?? (m.spouseId ? [m.spouseId] : []);

/** All parent ids of a member — `parentIds` wins when present (empty = unlinked). */
export const parentsOf = (m: Member): string[] =>
  m.parentIds ?? (m.parentId ? [m.parentId] : []);

export type Lang = "bn" | "en";
export type LineStyle = "straight" | "curved";

export interface Settings {
  language: Lang;
  theme: "light" | "dark";
  accentColor: string;
  nodeSize: number; // percent 80-130
  photoSize: number; // px 32-64
  lineStyle: LineStyle;
  zoom: number; // 0.3 - 2
}

export const ACCENTS: Record<string, string> = {
  teal: "oklch(0.6 0.11 178)",
  green: "oklch(0.62 0.16 148)",
  orange: "oklch(0.68 0.17 52)",
  pink: "oklch(0.62 0.2 8)",
  purple: "oklch(0.55 0.2 295)",
  sky: "oklch(0.68 0.13 228)",
  blue: "oklch(0.54 0.2 262)",
};
