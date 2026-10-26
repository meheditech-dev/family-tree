import { memo } from "react";
import { MoreVertical, User } from "lucide-react";
import type { Member } from "@/lib/tree/types";
import { setUI, deleteMember, useStore } from "@/lib/tree/store";
import { useT, type TKey } from "@/lib/tree/i18n";
import { genVar } from "@/lib/tree/helpers";

interface Props {
  m: Member;
  /** Unique rendered instance — a person with several marriages has one card per unit. */
  nodeKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  gen: number;
  photo: number;
  rel: TKey | null;
  dim: boolean;
  selected: boolean;
  match: boolean;
}

export const MemberCard = memo(function MemberCard({
  m,
  nodeKey,
  x,
  y,
  w,
  h,
  gen,
  photo,
  rel,
  dim,
  selected,
  match,
}: Props) {
  const t = useT();
  const openId = useStore((s) => s.ui.menuId);
  const isOpen = openId === nodeKey;
  const dead = !!m.deathYear;

  const act = (fn: () => void) => () => {
    setUI({ menuId: undefined });
    fn();
  };

  const menuItems = [
    ["edit", () => setUI({ modal: { mode: "edit", id: m.id } })],
    ["addSpouse", () => setUI({ modal: { mode: "add", relation: "spouse", relatedTo: m.id } })],
    ["addChild", () => setUI({ modal: { mode: "add", relation: "child", relatedTo: m.id } })],
    ["details", () => setUI({ detailsId: m.id })],
    ["delete", () => confirm(t("confirmDelete")) && deleteMember(m.id)],
  ] as [string, () => void][];

  return (
    <div
      data-card
      data-member-id={m.id}
      role="button"
      tabIndex={0}
      aria-label={m.name}
      onClick={() => setUI({ selectedId: m.id, detailsId: m.id, menuId: undefined })}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setUI({ selectedId: m.id, detailsId: m.id, menuId: undefined });
        }
      }}
      style={{ left: x, top: y, width: w, height: h, opacity: dim ? 0.25 : 1 }}
      className={[
        "absolute flex flex-col items-center justify-center",
        "rounded-xl border-[1.5px] bg-card pt-3 pb-2 px-2",
        "shadow-[var(--shadow-card)] outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        dead ? "border-deceased/60 grayscale" : "border-primary",
        selected ? "ring-4 ring-primary/30" : "",
        match ? "ring-4 ring-warning" : "",
      ].join(" ")}
    >
      {/* Three-dot menu — top-left corner */}
      <button
        aria-label="menu"
        className="no-print absolute left-1.5 top-1.5 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          setUI({ menuId: isOpen ? undefined : nodeKey });
        }}
      >
        <MoreVertical className="size-4" />
      </button>

      {/* Avatar */}
      <div
        className="shrink-0 overflow-hidden rounded-full bg-muted"
        style={{ width: photo, height: photo }}
      >
        {m.photo ? (
          <img src={m.photo} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center">
            <User className="size-1/2 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info block */}
      <div className="mt-1.5 flex w-full flex-col items-center gap-0.5 min-w-0 text-center leading-snug">
        {/* Name + gender dot */}
        <div className="flex items-center justify-center gap-1.5 w-full">
          <span className={`truncate text-sm font-bold ${dead ? "text-muted-foreground" : ""}`}>
            {m.name}
          </span>
          <span
            className={`size-2 shrink-0 rounded-full ${
              dead ? "bg-deceased" : m.gender === "male" ? "bg-male" : "bg-female"
            }`}
          />
        </div>

        {/* Relationship / role — single truncated line, tooltip on hover */}
        <div
          title={rel ? t(rel) : m.role}
          className="truncate text-xs font-medium text-relation w-full"
        >
          {rel ? t(rel) : m.role}
        </div>

        {/* Lifespan + generation colour dot */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full" style={{ background: genVar(gen) }} />
          {m.birthYear ?? "?"} – {m.deathYear ?? t("present")}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border bg-popover p-1 shadow-[var(--shadow-float)]"
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setUI({ menuId: undefined })}
        >
          {menuItems.map(([k, fn]) => (
            <button
              key={k}
              onClick={act(fn)}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted ${
                k === "delete" ? "text-destructive" : ""
              }`}
            >
              {t(k as TKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
