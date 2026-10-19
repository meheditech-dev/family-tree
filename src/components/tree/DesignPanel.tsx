import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ACCENTS } from "@/lib/tree/types";
import { setSettings, setUI, useStore } from "@/lib/tree/store";
import { useT } from "@/lib/tree/i18n";

export function DesignPanel() {
  const t = useT();
  const s = useStore((st) => st.settings);
  const open = useStore((st) => st.ui.panelOpen);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setUI({ panelOpen: false });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUI({ panelOpen: false });
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  const seg = (on: boolean) => `flex-1 rounded-md py-1.5 text-sm ${on ? "bg-card font-semibold shadow-[var(--shadow-card)]" : "text-muted-foreground"}`;
  return (
    <aside ref={ref} className="no-print absolute inset-x-0 bottom-0 z-30 max-h-[80%] overflow-auto rounded-t-2xl border bg-card p-5 shadow-[var(--shadow-float)] md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:w-64 md:rounded-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">{t("design")}</h2>
        <button aria-label="close" onClick={() => setUI({ panelOpen: false })} className="rounded-md p-1 hover:bg-muted"><X className="size-4" /></button>
      </div>
      <div className="space-y-5 text-sm">
        <Field label={t("theme")}>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button className={seg(s.theme === "light")} onClick={() => setSettings({ theme: "light" })}>{t("light")}</button>
            <button className={seg(s.theme === "dark")} onClick={() => setSettings({ theme: "dark" })}>{t("dark")}</button>
          </div>
        </Field>
        <Field label={t("color")}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACCENTS).map(([k, v]) => (
              <button
                key={k}
                aria-label={k}
                onClick={() => setSettings({ accentColor: k })}
                className={`size-7 rounded-full ring-offset-2 ring-offset-card ${s.accentColor === k ? "ring-2 ring-foreground" : ""}`}
                style={{ background: v }}
              />
            ))}
          </div>
        </Field>
        <Slider label={t("nodeSize")} min={80} max={130} value={s.nodeSize} onChange={(v) => setSettings({ nodeSize: v })} suffix="%" />
        <Slider label={t("photoSize")} min={32} max={64} value={s.photoSize} onChange={(v) => setSettings({ photoSize: v })} suffix="px" />
        <Field label={t("lineStyle")}>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button className={seg(s.lineStyle === "straight")} onClick={() => setSettings({ lineStyle: "straight" })}>{t("straight")}</button>
            <button className={seg(s.lineStyle === "curved")} onClick={() => setSettings({ lineStyle: "curved" })}>{t("curved")}</button>
          </div>
        </Field>
        <Slider label={t("zoom")} min={30} max={200} value={Math.round(s.zoom * 100)} onChange={(v) => setSettings({ zoom: v / 100 })} suffix="%" />
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Slider({ label, min, max, value, onChange, suffix }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void; suffix: string }) {
  return (
    <Field label={`${label} · ${value}${suffix}`}>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[var(--primary)]" aria-label={label} />
    </Field>
  );
}
