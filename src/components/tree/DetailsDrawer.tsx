import { useMemo } from "react";
import { X, User } from "lucide-react";
import { deleteMember, setUI, useStore } from "@/lib/tree/store";
import { analyze } from "@/lib/tree/layout";
import { computeAge, genVar, relationKey } from "@/lib/tree/helpers";
import { useT } from "@/lib/tree/i18n";

export function DetailsDrawer() {
  const t = useT();
  const id = useStore((s) => s.ui.detailsId);
  const members = useStore((s) => s.members);
  const selectedId = useStore((s) => s.ui.selectedId);
  const a = useMemo(() => analyze(members), [members]);
  if (!id) return null;
  const m = a.byId.get(id);
  if (!m) return null;
  const age = computeAge(m);
  const dead = !!m.deathYear;
  const g = a.gen.get(id) ?? 1;
  const rk = relationKey(m, a, selectedId);

  const pid = a.primaryOf(id);
  const pm = a.byId.get(pid);
  if (!pm) return null;
  const parent = m.parentId ? a.byId.get(m.parentId) : undefined;
  const parentSpouse = parent?.spouseId ? a.byId.get(parent.spouseId) : undefined;
  // Reuse existing relationship fields: father/mother from the linked parent (+ spouse),
  // children derived from parent IDs via the layout analysis.
  const father =
    parent?.gender === "male" ? parent : parentSpouse?.gender === "male" ? parentSpouse : undefined;
  const mother =
    parent?.gender === "female"
      ? parent
      : parentSpouse?.gender === "female"
        ? parentSpouse
        : undefined;
  const spouse = m.spouseId ? a.byId.get(m.spouseId) : undefined;
  const kids = a.children.get(pid) ?? [];
  const parentP = pm.parentId ? a.primaryOf(pm.parentId) : undefined;
  const isSec = a.secondary.has(id);
  const sibs = !isSec && parentP ? (a.children.get(parentP) ?? []).filter((x) => x !== id) : [];

  const close = () => setUI({ detailsId: undefined });

  const MemberLink = ({ mid }: { mid: string }) => {
    const member = a.byId.get(mid);
    if (!member) return null;
    return (
      <button
        onClick={() =>
          setUI({ detailsId: mid, selectedId: mid, center: { id: mid, n: Date.now() } })
        }
        className="rounded-full bg-muted px-3 py-1 text-sm font-medium hover:bg-accent"
      >
        {member.name}
      </button>
    );
  };

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="border-b border-b-muted/40 pb-3 last:border-b-0 last:pb-0">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
  const EmptyValue = () => (
    <span className="text-sm text-muted-foreground">{t("noInformationAvailable")}</span>
  );
  const linked = (ids: string[]) => ids.map((x) => <MemberLink key={x} mid={x} />);
  return (
    <div className="fixed inset-0 z-[55] bg-foreground/30" onClick={close}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 w-full max-w-sm overflow-auto border-l bg-card p-6 shadow-[var(--shadow-float)]"
      >
        <button className="absolute right-4 top-4" aria-label={t("close")} onClick={close}>
          <X className="size-5" />
        </button>
        <div className="flex flex-col items-center text-center pt-1">
          <div className="grid size-28 place-items-center overflow-hidden rounded-full bg-muted border border-accent/40">
            {m.photo ? (
              <img src={m.photo} alt="" className="size-full object-cover" />
            ) : (
              <User className="size-11 text-muted-foreground" />
            )}
          </div>
          {dead && (
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium border-deceased/30 bg-deceased/5 text-deceased">
              {t("deceased")}
            </span>
          )}
          <h2 className="mt-3 text-xl font-bold tracking-tight">{m.name}</h2>
          <div className="mt-1 text-sm text-relation">{rk ? t(rk) : m.role}</div>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full" style={{ background: genVar(g) }} />
            <span>
              {t("generation")} {g}
            </span>
            <span className="mx-0.5 text-muted-foreground font-medium">-</span>
            <span>{m.birthYear ?? "?"}</span>
            <span className="mx-0.5 text-muted-foreground font-medium">-</span>
            <span>{m.deathYear ?? t("present")}</span>
          </div>
          <div className="mt-1">
            {age ? (
              <p className="text-sm text-accent-foreground font-medium">
                {age.approximate ? `${t("ageApprox")}: ` : `${t("ageAtDeath")}: `}
                {age.age} {t("years")}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("ageUnavailable")}</p>
            )}
          </div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-2 ">
          <Field
            label={t("father")}
            value={father ? <MemberLink mid={father.id} /> : <EmptyValue />}
          />
          <Field
            label={t("mother")}
            value={mother ? <MemberLink mid={mother.id} /> : <EmptyValue />}
          />
          <Field
            label={t("spouse")}
            value={spouse ? <MemberLink mid={spouse.id} /> : <EmptyValue />}
          />
          <Field
            label={t("children")}
            value={
              kids.length ? (
                <div className="flex flex-wrap gap-1">{linked(kids)}</div>
              ) : (
                <EmptyValue />
              )
            }
          />
          {sibs.length && (
            <Field
              label={t("siblings")}
              value={<div className="flex flex-wrap gap-2">{linked(sibs)}</div>}
            />
          )}
          <Field label={t("gender")} value={t(m.gender)} />
          <Field label={t("role")} value={m.role ?? <EmptyValue />} />
          <Field label={t("birthplace")} value={m.birthplace ?? <EmptyValue />} />
          <Field label={t("occupation")} value={m.occupation ?? <EmptyValue />} />
          <Field label={t("bloodGroup")} value={m.bloodGroup ?? <EmptyValue />} />
          <Field label={t("phone")} value={m.phone ?? <EmptyValue />} />
          <Field label={t("address")} value={m.address ?? <EmptyValue />} />
        </div>
        <div className="mt-7">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("additionalDetails")}
            </h3>
            <div className="mt-2 space-y-3">
              <Field
                label={t("notes")}
                value={
                  m.notes ? (
                    <p className="text-sm text-muted-foreground">{m.notes}</p>
                  ) : (
                    <EmptyValue />
                  )
                }
              />
            </div>
          </section>
        </div>
        <div className="mt-7 flex gap-2">
          <button
            onClick={() => {
              close();
              setUI({ modal: { mode: "edit", id } });
            }}
            className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("edit")}
          </button>
          <button
            onClick={() => {
              close();
              if (confirm(t("confirmDelete"))) deleteMember(id);
            }}
            className="flex-1 rounded-full border py-2 text-sm text-destructive hover:bg-destructive/5"
          >
            {t("delete")}
          </button>
        </div>
      </aside>
    </div>
  );
}
