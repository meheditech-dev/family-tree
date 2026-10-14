import type { Member } from "./types";
import type { TKey } from "./i18n";
import type { Analysis } from "./layout";

export function relationKey(m: Member, a: Analysis): TKey | null {
  if (a.secondary.has(m.id)) return "spouse";
  const g = a.gen.get(m.id) ?? 1;
  const f = m.gender === "female";
  if (g === 1) return m.role ? null : "patriarch";
  if (g === 2) return f ? "daughter" : "son";
  if (g === 3) return f ? "granddaughter" : "grandson";
  return f ? "ggdaughter" : "ggson";
}

export const genVar = (g: number) => `var(--gen-${Math.min(g, 4)})`;

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
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
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
