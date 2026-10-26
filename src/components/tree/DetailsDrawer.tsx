import { useMemo } from "react";
import { X, User } from "lucide-react";
import { deleteMember, setUI, useStore } from "@/lib/tree/store";
import { analyze } from "@/lib/tree/layout";
import { computeAge, genVar, relationKey } from "@/lib/tree/helpers";
import {
  birthOrderLabel,
  buildSiblingOrders,
  compareSiblings,
  siblingRelationLabel,
} from "@/lib/tree/birth-order";
import { ordinalLabel } from "@/lib/tree/ordinal";
import { useT } from "@/lib/tree/i18n";

export function DetailsDrawer() {
  const t = useT();
  const id = useStore((s) => s.ui.detailsId);
  const members = useStore((s) => s.members);
  const selectedId = useStore((s) => s.ui.selectedId);
  const language = useStore((s) => s.settings.language);
  const a = useMemo(() => analyze(members), [members]);
  const siblingOrders = useMemo(() => buildSiblingOrders(members), [members]);
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
  const parents = (a.parentIdsOf.get(id) ?? []).map((p) => a.byId.get(p));
  const father = parents.find((p) => p?.gender === "male");
  const mother = parents.find((p) => p?.gender === "female");
  const adoptive = m.parentLink === "adoptive";
  const spouses = (a.spouseIdsOf.get(id) ?? []).filter((s) => a.byId.has(s));
  // Children of every marriage this member belongs to, deduplicated.
  const kids = [...new Set(a.childrenByParent.get(id) ?? [])].filter((k) => k !== id);
  const isSec = a.secondary.has(id);
  // Siblings share the same marriage unit (same family branch).
  const unit = a.unitOfChild.get(id);
  const sibs = !isSec && unit ? unit.childIds.filter((x) => x !== id) : [];
  // Birth order — the member's rank among the children of the same parent(s).
  const order = siblingOrders.byId.get(id);
  // Siblings of this member, oldest first, with their age relative to them.
  const orderedSiblings = order
    ? order.siblings.map((sibling) => ({
        member: sibling,
        direction: compareSiblings(sibling, m),
      }))
    : [];

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

  // The member's own place in the sibling group, e.g. "3rd daughter".
  const orderLabel = order ? birthOrderLabel(order, m) : null;
  const birthOrderValue =
    orderLabel && order ? (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
          {t(orderLabel.key).replace("{n}", ordinalLabel(orderLabel.n ?? order.rank, language))}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("birthOrderOf").replace("{name}", m.name)}
        </span>
      </span>
    ) : (
      <EmptyValue />
    );
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
          {parents.length > 0 && (
            <Field
              label={t("parentRelationship")}
              value={adoptive ? t("adoptive") : t("biological")}
            />
          )}
          <Field
            label={spouses.length > 1 ? t("spouses") : t("spouse")}
            value={
              spouses.length ? (
                <div className="flex flex-wrap gap-1">{linked(spouses)}</div>
              ) : (
                <EmptyValue />
              )
            }
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
          {order && <Field label={t("birthOrder")} value={birthOrderValue} />}
          <Field label={t("gender")} value={t(m.gender)} />
          <Field label={t("role")} value={m.role ?? <EmptyValue />} />
          <Field label={t("birthplace")} value={m.birthplace ?? <EmptyValue />} />
          <Field label={t("occupation")} value={m.occupation ?? <EmptyValue />} />
          <Field label={t("bloodGroup")} value={m.bloodGroup ?? <EmptyValue />} />
          <Field label={t("phone")} value={m.phone ?? <EmptyValue />} />
          <Field label={t("address")} value={m.address ?? <EmptyValue />} />
        </div>
        {parents.length > 0 && (
          <div className="mt-7">
            <section aria-label={t("siblingOrderHeading")}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("siblingOrderHeading")}
              </h3>
              <div className="mt-2 space-y-3">
                {orderedSiblings.length ? (
                  <ol className="space-y-2" data-sibling-order>
                    {orderedSiblings.map(({ member: sibling, direction }) => {
                      const siblingOrder = siblingOrders.byId.get(sibling.id);
                      const label = siblingOrder ? birthOrderLabel(siblingOrder, sibling) : null;
                      return (
                        <li
                          key={sibling.id}
                          className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setUI({
                                detailsId: sibling.id,
                                selectedId: sibling.id,
                                center: { id: sibling.id, n: Date.now() },
                              })
                            }
                            className="truncate text-sm font-medium hover:text-primary"
                          >
                            {sibling.name}
                          </button>
                          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                            {direction === "older" || direction === "younger" ? (
                              <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
                                {t(siblingRelationLabel(sibling, direction))}
                              </span>
                            ) : (
                              <span>{t("orderUnknown")}</span>
                            )}
                            {label && (
                              <span className="rounded-full bg-primary/12 px-2 py-0.5 font-semibold text-primary">
                                {t(label.key).replace(
                                  "{n}",
                                  ordinalLabel(label.n ?? siblingOrder?.rank ?? 1, language),
                                )}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {parents.length ? t("noSiblings") : t("noInformationAvailable")}
                  </span>
                )}
              </div>
            </section>
          </div>
        )}
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
