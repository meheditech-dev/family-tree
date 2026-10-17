import type { Member } from "./types";
import type { TKey } from "./i18n";
import type { Analysis } from "./layout";

export function relationKey(m: Member, a: Analysis, referenceId?: string): TKey | null {
  if (referenceId && a.byId.has(referenceId)) {
    if (m.id === referenceId) return "self";
    const reference = a.byId.get(referenceId);
    if (reference?.spouseId === m.id || m.spouseId === referenceId) return "spouse";
    const f = m.gender === "female";
    const ancestors = (id: string) => {
      const distances = new Map<string, number>([[id, 0]]);
      const queue = [id];
      for (let i = 0; i < queue.length; i++) {
        const currentId = queue[i];
        if (!currentId) continue;
        const current = a.byId.get(currentId);
        const parentId = current?.parentId;
        if (!parentId || !a.byId.has(parentId)) continue;
        const parent = a.byId.get(parentId);
        for (const p of [parentId, parent?.spouseId]) {
          if (!p || !a.byId.has(p) || distances.has(p)) continue;
          distances.set(p, (distances.get(currentId) ?? 0) + 1);
          queue.push(p);
        }
      }
      return distances;
    };
    const bloodRelation = (targetId: string, originId: string): TKey | null => {
      const originAncestors = ancestors(originId);
      const targetAncestors = ancestors(targetId);
      const up = originAncestors.get(targetId);
      if (up)
        return up === 1
          ? f
            ? "mother"
            : "father"
          : up === 2
            ? f
              ? "grandmother"
              : "grandfather"
            : up === 3
              ? f
                ? "greatGrandmother"
                : "greatGrandfather"
              : "ancestor";
      const down = targetAncestors.get(originId);
      if (down)
        return down === 1
          ? f
            ? "daughter"
            : "son"
          : down === 2
            ? f
              ? "granddaughter"
              : "grandson"
            : down === 3
              ? f
                ? "ggdaughter"
                : "ggson"
              : "descendant";
      let closest: { origin: number; target: number } | undefined;
      for (const [ancestorId, originDistance] of originAncestors) {
        const targetDistance = targetAncestors.get(ancestorId);
        if (targetDistance === undefined || !originDistance || !targetDistance) continue;
        if (!closest || originDistance + targetDistance < closest.origin + closest.target)
          closest = { origin: originDistance, target: targetDistance };
      }
      if (!closest) return null;
      if (closest.origin === 1 && closest.target === 1) return f ? "sister" : "brother";
      if (closest.origin === 2 && closest.target === 1) return f ? "aunt" : "uncle";
      if (closest.origin === 1 && closest.target === 2) return f ? "niece" : "nephew";
      if (closest.origin >= 2 && closest.target >= 2) return "cousin";
      return "relative";
    };
    const direct = bloodRelation(m.id, referenceId);
    if (direct) return direct;
    if (reference?.spouseId) {
      const throughSpouse = bloodRelation(m.id, reference.spouseId);
      if (throughSpouse === "father" || throughSpouse === "mother")
        return f ? "motherInLaw" : "fatherInLaw";
      if (throughSpouse === "brother" || throughSpouse === "sister")
        return f ? "sisterInLaw" : "brotherInLaw";
      if (throughSpouse) return "relativeInLaw";
    }
    if (m.spouseId) {
      const throughSpouse = bloodRelation(m.spouseId, referenceId);
      if (throughSpouse === "son" || throughSpouse === "daughter")
        return f ? "daughterInLaw" : "sonInLaw";
      if (throughSpouse === "brother" || throughSpouse === "sister")
        return f ? "sisterInLaw" : "brotherInLaw";
      if (throughSpouse === "uncle" || throughSpouse === "aunt") return f ? "aunt" : "uncle";
      if (throughSpouse) return "relativeInLaw";
    }
    return "unrelated";
  }
  if (a.secondary.has(m.id)) return "spouse";
  const g = a.gen.get(m.id) ?? 1;
  const f = m.gender === "female";
  if (g === 1) return m.role ? null : "patriarch";
  if (g === 2) return f ? "daughter" : "son";
  if (g === 3) return f ? "granddaughter" : "grandson";
  return f ? "ggdaughter" : "ggson";
}

export const genVar = (g: number) => `var(--gen-${Math.min(g, 4)})`;

export interface AgeInfo {
  age: number;
  /** True when the member has no death year (treated as living). */
  living: boolean;
  /** True when the age is derived from years only (no exact dates). */
  approximate: boolean;
}

/**
 * Calculates a member's age from birthYear/deathYear only.
 * Never mutates member data and never stores an `age` field.
 *
 * - Living member: current age from birthYear and the current year (approximate).
 * - Deceased member: age at death from birthYear and deathYear.
 * - Missing/invalid/inconsistent years (e.g. death before birth) -> null.
 * Never returns a negative age.
 */
export function computeAge(m: Member, now: number = new Date().getFullYear()): AgeInfo | null {
  const birth = Number(m.birthYear);
  const death = m.deathYear === undefined ? undefined : Number(m.deathYear);
  if (!Number.isFinite(birth) || birth < 1 || birth > now) return null;
  if (death !== undefined) {
    if (!Number.isFinite(death) || death < 1 || death < birth) return null;
    return { age: death - birth, living: false, approximate: false };
  }
  const age = now - birth;
  if (age < 0) return null;
  return { age, living: true, approximate: true };
}

export function compressImage(file: File, max = 200): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        const context = c.getContext("2d");
        if (!context) {
          rej(new Error("Canvas unavailable"));
          return;
        }
        context.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = rej;
      img.src = r.result as string;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function download(name: string, url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}
