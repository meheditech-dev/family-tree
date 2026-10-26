import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Crosshair,
  Search,
  Minus,
  Maximize,
  SlidersHorizontal,
  Sprout,
  UsersRound,
  X,
} from "lucide-react";
import {
  clearFamilyFocus,
  getState,
  setSettings,
  setUI,
  startNewFamily,
  useStore,
} from "@/lib/tree/store";
import { useT } from "@/lib/tree/i18n";
import type { TreeLayout } from "@/lib/tree/types";
import { TreeCanvas, ZMAX, ZMIN } from "@/components/tree/TreeCanvas";
import { DesignPanel } from "@/components/tree/DesignPanel";

export function TreePage() {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const members = useStore((s) => s.members);
  const genFilter = useStore((s) => s.ui.genFilter);
  const zoom = useStore((s) => s.settings.zoom);
  const treeLayout = useStore((s) => s.settings.treeLayout);
  const panelOpen = useStore((s) => s.ui.panelOpen);
  const focusedRootId = useStore((s) => s.ui.focusedRootId);
  const focusedName = focusedRootId ? members.find((m) => m.id === focusedRootId)?.name : undefined;

  const centerMe = () => {
    const s = getState();
    const id = s.ui.selectedId ?? s.members[0]?.id;
    if (id) setUI({ selectedId: id, center: { id, n: Date.now() } });
  };
  const find = () => {
    const s = getState();
    const q = s.ui.search.trim().toLowerCase();
    const m = q && s.members.find((x) => x.name.toLowerCase().includes(q));
    if (m) setUI({ selectedId: m.id, center: { id: m.id, n: Date.now() } });
    else (document.querySelector("header input") as HTMLInputElement | null)?.focus();
  };
  const z = (d: number) =>
    setSettings({ zoom: Math.min(ZMAX, Math.max(ZMIN, +(zoom + d).toFixed(2))) });
  const btn =
    "flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:bg-muted";

  return (
    <div className="flex h-full flex-col">
      <div className="no-print flex flex-wrap items-center gap-2 border-b bg-card px-3 py-3 md:px-6">
        <button
          onClick={() => setUI({ modal: { mode: "add" } })}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] hover:opacity-90"
        >
          <Plus className="size-4" /> {t("addMember")}
        </button>
        {members.length > 0 && (
          <button
            onClick={() => startNewFamily(t("confirmNewFamily"))}
            title={t("newFamilyHint")}
            className={btn}
          >
            <Sprout className="size-4" /> {t("newFamily")}
          </button>
        )}
        <label className={btn}>
          <span className="text-muted-foreground">{t("generation")}:</span>
          <select
            value={genFilter}
            onChange={(e) => setUI({ genFilter: +e.target.value })}
            className="bg-transparent font-medium outline-none"
          >
            <option value={0}>{t("allGen")}</option>
            {[1, 2, 3, 4].map((g) => (
              <option key={g} value={g}>
                {t("generation")} {g}
                {g === 4 ? "+" : ""}
              </option>
            ))}
          </select>
        </label>
        <button onClick={centerMe} className={btn}>
          <Crosshair className="size-4" /> {t("centerMe")}
        </button>
        <button onClick={find} className={btn}>
          <Search className="size-4" /> {t("find")}
        </button>
        <label className={btn}>
          <span className="text-muted-foreground">{t("layout")}:</span>
          <select
            value={treeLayout}
            onChange={(e) => setSettings({ treeLayout: e.target.value as TreeLayout })}
            className="bg-transparent font-medium outline-none"
          >
            <option value="vertical">{t("vertical")}</option>
            <option value="horizontal">{t("horizontal")}</option>
          </select>
        </label>
        {!panelOpen && (
          <button
            onClick={() => setUI({ panelOpen: true })}
            className={`${btn} ml-auto`}
            aria-label={t("design")}
          >
            <SlidersHorizontal className="size-4" />
          </button>
        )}
      </div>
      {focusedRootId && (
        <div className="no-print flex flex-wrap items-center gap-2 border-b bg-primary/5 px-3 py-2 text-sm md:px-6">
          <UsersRound className="size-4 text-primary" />
          <span className="font-medium">
            {t("showingOnlyFamily")}
            {focusedName ? ` — ${focusedName}` : ""}
          </span>
          <button
            type="button"
            onClick={clearFamilyFocus}
            className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-3 py-1 text-xs font-semibold text-primary transition hover:bg-accent"
          >
            <X className="size-3.5" /> {t("showAllFamilies")}
          </button>
          <Link
            to="/family"
            className="ml-auto text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("family")}
          </Link>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <TreeCanvas containerRef={ref} treeLayout={treeLayout} />
        {members.length === 0 && (
          <div className="absolute inset-0 z-10 grid place-items-center p-6">
            <div className="no-print flex max-w-sm flex-col items-center gap-4 rounded-3xl border border-dashed border-primary/30 bg-card/80 px-8 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur-sm">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sprout className="size-7" />
              </span>
              <h3 className="text-xl font-semibold">{t("emptyTitle")}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("emptyDesc")}</p>
              <button
                onClick={() => setUI({ modal: { mode: "add" } })}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <Plus className="size-4" /> {t("addMember")}
              </button>
            </div>
          </div>
        )}
        <DesignPanel />
        <Legend />
        <div className="no-print absolute bottom-4 right-4 z-20 hidden items-center gap-1 rounded-full border bg-card p-1 shadow-[var(--shadow-card)] md:flex">
          <button
            aria-label="zoom out"
            onClick={() => z(-0.1)}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
          >
            <Minus className="size-4" />
          </button>
          <button
            onClick={() => setSettings({ zoom: 1 })}
            className="w-12 text-center text-xs font-semibold"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            aria-label="zoom in"
            onClick={() => z(0.1)}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
          >
            <Plus className="size-4" />
          </button>
          <button
            aria-label={t("fullscreen")}
            onClick={() =>
              document.fullscreenElement
                ? document.exitFullscreen()
                : ref.current?.parentElement?.requestFullscreen()
            }
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
          >
            <Maximize className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const t = useT();
  const items: [string, string][] = [
    ["bg-male", t("male")],
    ["bg-female", t("female")],
    ["bg-deceased", t("deceased")],
    ["bg-gen-1", `${t("generation")} 1`],
    ["bg-gen-2", "2"],
    ["bg-gen-3", "3"],
    ["bg-gen-4", "4+"],
  ];
  return (
    <div className="no-print absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-4 rounded-full border bg-card px-5 py-2 text-xs shadow-[var(--shadow-card)] lg:flex">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className={`size-2.5 rounded-full ${c}`} />
          {l}
        </span>
      ))}
    </div>
  );
}
