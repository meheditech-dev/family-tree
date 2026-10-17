export type Gender = "male" | "female";

export interface Member {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number | undefined;
  deathYear?: number | undefined;
  photo?: string | undefined;
  role?: string | undefined;
  parentId?: string | undefined;
  spouseId?: string | undefined;
  notes?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  occupation?: string | undefined;
  bloodGroup?: string | undefined;
  birthplace?: string | undefined;
}

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
