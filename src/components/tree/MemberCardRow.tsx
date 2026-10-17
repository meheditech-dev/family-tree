/**
 * MemberCardRow – compact row-style card used in the horizontal (left-to-right)
 * tree layout.
 *
 * Visual spec:
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │▌  [avatar]  Name  ●          [relation pill]        ⋮       │
 *  │▌            1975 – বর্তমান  ●                              │
 *  └──────────────────────────────────────────────────────────────┘
 *  - 4 px gender-coloured left edge strip
 *  - 46 px circular avatar (green/grey status ring for living/deceased)
 *  - Name bold, truncated to one line; gender dot inline
 *  - Relation pill (truncated, tooltip on overflow)
 *  - Lifespan below name; generation colour dot inline
 *  - ⋮ button at the right edge — opens the same dropdown as MemberCard
 *  - Clicking the card opens the Details Drawer
 *  - ⋮ stopPropagation so the drawer does not also open
 */
import { memo } from "react";
import { MoreVertical, User } from "lucide-react";
import type { Member } from "@/lib/tree/types";
import { setUI, deleteMember, useStore } from "@/lib/tree/store";
import { useT, type TKey } from "@/lib/tree/i18n";
import { genVar } from "@/lib/tree/helpers";

interface Props {
  m: Member;
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

const STRIP_W = 4; // px — gender / status left-edge strip

export const MemberCardRow = memo(function MemberCardRow({
  m,
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
  const isOpen = openId === m.id;
  const dead = !!m.deathYear;

  const act = (fn: () => void) => () => {
    setUI({ menuId: undefined });
    fn();
  };

  const menuItems = [
    ["edit",      () => setUI({ modal: { mode: "edit", id: m.id } })],
    ["addSpouse", () => setUI({ modal: { mode: "add", relation: "spouse", relatedTo: m.id } })],
    ["addChild",  () => setUI({ modal: { mode: "add", relation: "child",  relatedTo: m.id } })],
    ["details",   () => setUI({ detailsId: m.id })],
    ["delete",    () => confirm(t("confirmDelete")) && deleteMember(m.id)],
  ] as [string, () => void][];

  // Gender/status strip colour
  const stripCls = dead
    ? "bg-deceased/60"
    : m.gender === "male"
    ? "bg-male"
    : "bg-female";

  // Avatar status ring: living = primary, deceased = muted
  const avatarRingCls = dead
    ? "ring-2 ring-deceased/50"
    : "ring-2 ring-primary/50";

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
        "absolute flex items-center overflow-hidden",
        "rounded-xl border-[1.5px] bg-card",
        "shadow-[var(--shadow-card)] outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        dead ? "border-deceased/60 grayscale" : "border-primary",
        selected ? "ring-4 ring-primary/30" : "",
        match   ? "ring-4 ring-warning"      : "",
      ].join(" ")}
    >
      {/* Left gender/status colour strip */}
      <div
        className={`${stripCls} h-full shrink-0`}
        style={{ width: STRIP_W }}
        aria-hidden="true"
      />

      {/* Avatar */}
      <div
        className={`mx-2.5 shrink-0 overflow-hidden rounded-full bg-muted ${avatarRingCls}`}
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

      {/* Text block */}
      <div className="min-w-0 flex-1 leading-tight py-1">
        {/* Row 1: name + gender dot + relation pill */}
        <div className="flex items-center gap-1.5">
          <span
            className={`truncate text-sm font-bold leading-none ${
              dead ? "text-muted-foreground" : ""
            }`}
          >
            {m.name}
          </span>
          {/* Gender dot */}
          <span
            className={`size-2 shrink-0 rounded-full ${
              dead ? "bg-deceased" : m.gender === "male" ? "bg-male" : "bg-female"
            }`}
          />
          {/* Relation pill */}
          {(rel || m.role) && (
            <span
              title={rel ? t(rel) : m.role}
              className="ml-auto shrink-0 max-w-[96px] truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {rel ? t(rel) : m.role}
            </span>
          )}
        </div>

        {/* Row 2: lifespan + generation dot */}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: genVar(gen) }}
          />
          <span className="tabular-nums">
            {m.birthYear ?? "?"} – {m.deathYear ?? t("present")}
          </span>
        </div>
      </div>

      {/* ⋮ menu button */}
      <button
        aria-label="menu"
        className="no-print mr-1.5 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation(); // do not open the drawer
          setUI({ menuId: isOpen ? undefined : m.id });
        }}
      >
        <MoreVertical className="size-4" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border bg-popover p-1 shadow-[var(--shadow-float)]"
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
