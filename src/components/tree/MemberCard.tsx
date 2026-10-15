import { memo, useState } from "react";
import { MoreVertical, User } from "lucide-react";
import type { Member } from "@/lib/tree/types";
import { setUI, deleteMember } from "@/lib/tree/store";
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

export const MemberCard = memo(function MemberCard({ m, x, y, w, h, gen, photo, rel, dim, selected, match }: Props) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const dead = !!m.deathYear;
  const act = (fn: () => void) => () => { setMenu(false); fn(); };
  return (
    <div
      data-card
      role="button"
      tabIndex={0}
      aria-label={m.name}
      onClick={() => setUI({ selectedId: m.id })}
       onDoubleClick={() => setUI({ selectedId: m.id, detailsId: m.id })}
       onKeyDown={(e) => {
         if (e.target !== e.currentTarget) return;
         if (e.key === "Enter" || e.key === " ") {
           e.preventDefault();
           setUI({ selectedId: m.id, ...(e.key === "Enter" ? { detailsId: m.id } : {}) });
         }
       }}
      style={{ left: x, top: y, width: w, height: h, opacity: dim ? 0.25 : 1 }}
      className={`absolute flex items-center gap-3 rounded-xl border-[1.5px] bg-card px-3 shadow-[var(--shadow-card)] outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        dead ? "border-deceased/60 grayscale" : "border-primary"
      } ${selected ? "ring-4 ring-primary/30" : ""} ${match ? "ring-4 ring-warning" : ""}`}
    >
      <div
        className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted"
        style={{ width: photo, height: photo }}
      >
        {m.photo ? <img src={m.photo} alt="" className="size-full object-cover" /> : <User className="size-1/2 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1 leading-snug">
        <div className="flex items-center gap-1.5">
          <span className={`truncate py-0.5 text-sm font-bold ${dead ? "text-muted-foreground" : ""}`}>{m.name}</span>
          <span className={`size-2 shrink-0 rounded-full ${dead ? "bg-deceased" : m.gender === "male" ? "bg-male" : "bg-female"}`} />
        </div>
         <div title={rel ? t(rel) : m.role} className="truncate text-xs font-medium text-relation">{rel ? t(rel) : m.role}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: genVar(gen) }} />
          {m.birthYear ?? "?"} - {m.deathYear ?? t("present")}
        </div>
      </div>
      <button
        aria-label="menu"
        className="no-print -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
      >
        <MoreVertical className="size-4" />
      </button>
      {menu && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border bg-popover p-1 shadow-[var(--shadow-float)]"
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setMenu(false)}
        >
          {[
            ["edit", () => setUI({ modal: { mode: "edit", id: m.id } })],
            ["addSpouse", () => setUI({ modal: { mode: "add", relation: "spouse", relatedTo: m.id } })],
            ["addChild", () => setUI({ modal: { mode: "add", relation: "child", relatedTo: m.id } })],
            ["details", () => setUI({ detailsId: m.id })],
            ["delete", () => confirm(t("confirmDelete")) && deleteMember(m.id)],
          ].map(([k, fn]) => (
            <button
              key={k as string}
              onClick={act(fn as () => void)}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted ${k === "delete" ? "text-destructive" : ""}`}
            >
              {t(k as TKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
