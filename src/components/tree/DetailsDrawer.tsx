import { useMemo } from "react";
import { X, User } from "lucide-react";
import { deleteMember, setUI, useStore } from "@/lib/tree/store";
import { analyze } from "@/lib/tree/layout";
import { relationKey } from "@/lib/tree/helpers";
import { useT } from "@/lib/tree/i18n";

export function DetailsDrawer() {
  const t = useT();
  const id = useStore((s) => s.ui.detailsId);
  const members = useStore((s) => s.members);
  const a = useMemo(() => analyze(members), [members]);
  if (!id) return null;
  const m = a.byId.get(id);
  if (!m) return null;
  const pid = a.primaryOf(id);
  const pm = a.byId.get(pid)!;
  const parentP = pm.parentId ? a.primaryOf(pm.parentId) : undefined;
  const isSec = a.secondary.has(id);
  const parents = !isSec && parentP ? [parentP, a.byId.get(parentP)?.spouseId].filter(Boolean) as string[] : [];
  const kids = a.children.get(pid) ?? [];
  const sibs = !isSec && parentP ? (a.children.get(parentP) ?? []).filter((x) => x !== id) : [];
  const name = (x: string) => a.byId.get(x)?.name;
  const rk = relationKey(m, a);
  const Row = ({ label, ids }: { label: string; ids: string[] }) => (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {ids.length ? ids.map((x) => (
          <button key={x} onClick={() => setUI({ detailsId: x, selectedId: x, center: { id: x, n: Date.now() } })} className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-accent">{name(x)}</button>
        )) : <span className="text-sm text-muted-foreground">{t("none")}</span>}
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[55] bg-foreground/30" onClick={() => setUI({ detailsId: undefined })}>
      <aside onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 w-full max-w-sm overflow-auto border-l bg-card p-6 shadow-[var(--shadow-float)]">
        <button className="absolute right-4 top-4" aria-label="close" onClick={() => setUI({ detailsId: undefined })}><X className="size-5" /></button>
        <div className="flex flex-col items-center text-center">
          <div className="grid size-24 place-items-center overflow-hidden rounded-full bg-muted">
            {m.photo ? <img src={m.photo} alt="" className="size-full object-cover" /> : <User className="size-10 text-muted-foreground" />}
          </div>
          <h2 className="mt-3 text-xl font-bold">{m.name}</h2>
          <div className="text-sm text-relation">{rk ? t(rk) : m.role}</div>
          <div className="text-sm text-muted-foreground">{m.birthYear ?? "?"} - {m.deathYear ?? t("present")} · {t("generation")} {a.gen.get(id)}</div>
        </div>
        <div className="mt-6 space-y-4">
          <Row label={t("parents")} ids={parents} />
          <Row label={t("spouse")} ids={m.spouseId ? [m.spouseId] : []} />
          <Row label={t("children")} ids={kids} />
          <Row label={t("siblings")} ids={sibs} />
          {m.phone && <p className="text-sm"><b>{t("phone")}:</b> {m.phone}</p>}
          {m.address && <p className="text-sm"><b>{t("address")}:</b> {m.address}</p>}
          {m.notes && <p className="text-sm text-muted-foreground">{m.notes}</p>}
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={() => setUI({ modal: { mode: "edit", id }, detailsId: undefined })} className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground">{t("edit")}</button>
          <button onClick={() => confirm(t("confirmDelete")) && deleteMember(id)} className="flex-1 rounded-full border py-2 text-sm text-destructive">{t("delete")}</button>
        </div>
      </aside>
    </div>
  );
}
