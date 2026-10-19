import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  CheckCircle2,
  Heart,
  Info,
  Layers,
  Plus,
  UserPlus,
} from "lucide-react";
import { setUI, useStore } from "@/lib/tree/store";
import { parentsOf } from "@/lib/tree/types";
import { analyze, type Unit } from "@/lib/tree/layout";
import { genVar } from "@/lib/tree/helpers";
import { useT } from "@/lib/tree/i18n";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const BN_ORD = ["১ম", "২য়", "৩য়", "৪র্থ", "৫ম", "৬ষ্ঠ", "৭ম", "৮ম", "৯ম", "১০ম"];
const EN_ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
// Soft, eye-relaxed avatar tint — same as the Family and Home pages.
const AVATAR = "bg-primary/10 text-primary";

export function RelationshipsPage() {
  const t = useT();
  const lang = useStore((s) => s.settings.language);
  const members = useStore((s) => s.members);
  const [sortAsc, setSortAsc] = useState(true);
  const [selId, setSelId] = useState<string | undefined>(undefined);

  const bn = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d] ?? d);
  const num = (n: number) => (lang === "bn" ? bn(n) : String(n));
  const fill = (s: string, vars: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
  const ord = (g: number) =>
    lang === "bn" ? (BN_ORD[g - 1] ?? `${bn(g)}তম`) : (EN_ORD[g - 1] ?? `${g}th`);
  const genLabel = (g: number) => `${ord(g)} ${t("generation")}`;

  const a = useMemo(() => analyze(members), [members]);
  const units = useMemo(() => [...a.unitsOf.values()].flat(), [a]);
  const sorted = useMemo(() => {
    const name = (id: string) => a.byId.get(id)?.name ?? "";
    return [...units].sort(
      (x, y) =>
        name(x.members[0] ?? "").localeCompare(name(y.members[0] ?? "")) * (sortAsc ? 1 : -1),
    );
  }, [units, sortAsc, a]);

  const sel = selId && a.byId.has(selId) ? selId : (sorted[0]?.members[0] ?? members[0]?.id);
  const selMember = sel ? a.byId.get(sel) : undefined;
  const selSpouse = sel ? (a.spouseIdsOf.get(sel) ?? []).find((id) => a.byId.has(id)) : undefined;
  const selKids = sel ? (a.childrenByParent.get(sel) ?? []) : [];

  const couples = a.marriages.length;
  const parentLinks = members.reduce(
    (n, m) => n + parentsOf(m).filter((p) => a.byId.has(p)).length,
    0,
  );
  const genCount = new Set(members.map((m) => a.gen.get(m.id)).filter((g): g is number => !!g))
    .size;
  const soloParents = members.filter(
    (m) =>
      (a.childrenByParent.get(m.id) ?? []).length > 0 &&
      (a.spouseIdsOf.get(m.id) ?? []).length === 0,
  );
  const bigFamilies = units.filter((u) => u.members.length > 1 && u.childIds.length >= 5);

  const gens = useMemo(() => {
    const counts = new Map<number, number>();
    members.forEach((m) => {
      const g = a.gen.get(m.id) ?? 1;
      counts.set(g, (counts.get(g) ?? 0) + 1);
    });
    return [...counts.entries()].sort((x, y) => x[0] - y[0]);
  }, [members, a]);
  const maxGen = Math.max(1, ...gens.map(([, n]) => n));

  const pick = (id: string) => {
    setSelId(id);
    setUI({ detailsId: id });
  };

  const AvatarNode = ({ id, big = false }: { id: string; big?: boolean }) => {
    const m = a.byId.get(id);
    if (!m) return null;
    return (
      <button
        onClick={() => pick(id)}
        className="flex w-20 flex-col items-center gap-1.5 rounded-lg hover:bg-accent/60"
      >
        <span
          className={`grid place-items-center rounded-full font-semibold ${AVATAR} ${big ? "size-14 text-lg" : "size-12 text-base"}`}
        >
          {Array.from(m.name)[0]}
        </span>
        <span className="w-full truncate text-center text-xs font-medium">{m.name}</span>
      </button>
    );
  };

  const MemberChip = ({ id }: { id: string }) => {
    const m = a.byId.get(id);
    if (!m) return null;
    return (
      <button
        onClick={() => pick(id)}
        className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background py-1 pl-1 pr-3 text-xs font-medium transition hover:border-primary/50 hover:bg-accent"
      >
        <span
          className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${AVATAR}`}
        >
          {Array.from(m.name)[0]}
        </span>
        <span className="max-w-32 truncate">{m.name}</span>
      </button>
    );
  };

  const KidCount = ({ n }: { n: number }) => (
    <span className="flex shrink-0 flex-col items-end">
      <span className="text-xl font-bold leading-none tabular-nums">{num(n)}</span>
      <span className="text-[11px] text-muted-foreground">{t("children")}</span>
    </span>
  );

  const UnitCard = ({ u }: { u: Unit }) => {
    const g = a.gen.get(u.owner) ?? 1;
    return (
      <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
              {u.members.length > 1 ? t("couples") : t("singleGuardian")}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {genLabel(g)}
            </span>
          </div>
          {u.childIds.length > 0 && <KidCount n={u.childIds.length} />}
        </div>
        <div className="flex items-center justify-center gap-2">
          <AvatarNode id={u.members[0]!} big />
          {u.members[1] ? (
            <>
              <Heart className="size-5 shrink-0 fill-pink-500/20 text-pink-500" />
              <AvatarNode id={u.members[1]} big />
            </>
          ) : null}
        </div>
        {u.childIds.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {u.childIds.map((k) => (
              <MemberChip key={k} id={k} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const Tile = ({
    icon,
    tone,
    value,
    label,
  }: {
    icon: ReactNode;
    tone: string;
    value: string;
    label: string;
  }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-4">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight tabular-nums">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );

  const primaryBtn =
    "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90";
  const ghostBtn =
    "inline-flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent";

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8 md:py-10">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("relations")}</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t("relSubtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSortAsc((v) => !v)}
              disabled={members.length === 0}
              className={`${ghostBtn} disabled:opacity-50`}
            >
              <ArrowDownUp className="size-4" /> {t("sortList")}
            </button>
            <button onClick={() => setUI({ modal: { mode: "add" } })} className={primaryBtn}>
              <Plus className="size-4" /> {t("newRelation")}
            </button>
          </div>
        </header>

        {members.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-primary/30 bg-card/60 px-6 py-12 text-center">
            <h3 className="text-xl font-semibold">{t("emptyTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t("noRelationsHint")}
            </p>
            <button
              onClick={() => setUI({ modal: { mode: "add" } })}
              className={`${primaryBtn} mt-5`}
            >
              <Plus className="size-4" /> {t("addMember")}
            </button>
          </section>
        ) : (
          <>
            {/* Metrics */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Tile
                icon={<Heart className="size-5 fill-pink-500/20 text-pink-500" />}
                tone="bg-pink-500/15"
                value={num(couples)}
                label={t("couples")}
              />
              <Tile
                icon={<ArrowRight className="size-5" />}
                tone="bg-emerald-500/15 text-emerald-600"
                value={num(parentLinks)}
                label={t("coupleLinks")}
              />
              <Tile
                icon={<Layers className="size-5" />}
                tone="bg-sky-500/15 text-sky-600"
                value={num(genCount)}
                label={t("generation")}
              />
              <Tile
                icon={<AlertTriangle className="size-5" />}
                tone="bg-amber-400/20 text-amber-500"
                value={num(soloParents.length)}
                label={t("incomplete")}
              />
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-2">
              {/* All families */}
              <section className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <h2 className="mb-4 font-semibold">{t("allFamilies")}</h2>
                {sorted.length === 0 ? (
                  <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                    {t("noUnits")}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sorted.map((u) => (
                      <UnitCard key={u.id} u={u} />
                    ))}
                  </div>
                )}
              </section>

              <div className="flex flex-col gap-6">
                {/* Selected member */}
                {selMember && (
                  <section className="rounded-2xl border border-border/60 bg-card/70 p-5">
                    <h2 className="mb-4 font-semibold">{t("selectedMember")}</h2>
                    <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                            {selSpouse ? t("couples") : t("singleGuardian")}
                          </span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {genLabel(a.gen.get(selMember.id) ?? 1)}
                          </span>
                        </div>
                        {selKids.length > 0 && <KidCount n={selKids.length} />}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <AvatarNode id={selMember.id} big />
                        {selSpouse ? (
                          <>
                            <Heart className="size-5 shrink-0 fill-pink-500/20 text-pink-500" />
                            <AvatarNode id={selSpouse} big />
                          </>
                        ) : null}
                      </div>
                      {selKids.length > 0 && (
                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                          {selKids.map((k) => (
                            <MemberChip key={k} id={k} />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Members by generation */}
                <section className="rounded-2xl border border-border/60 bg-card/70 p-5">
                  <h2 className="mb-4 font-semibold">{t("generationSpread")}</h2>
                  <div className="space-y-3">
                    {gens.map(([g, n]) => (
                      <div key={g} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                          {ord(g)} {t("generation")}
                        </span>
                        <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${(n / maxGen) * 100}%`, background: genVar(g) }}
                          />
                        </div>
                        <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums">
                          {num(n)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Watchlist */}
                <section className="rounded-2xl border border-border/60 bg-card/70 p-5">
                  <h2 className="mb-4 font-semibold">{t("watchlist")}</h2>
                  {soloParents.length === 0 && bigFamilies.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600">
                      <CheckCircle2 className="size-4 shrink-0" /> {t("allComplete")}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {soloParents.map((m) => (
                        <div
                          key={m.id}
                          className="flex gap-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-sm"
                        >
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                          <span>
                            {fill(t("spouseMissing"), {
                              name: m.name,
                              n: num(a.childrenByParent.get(m.id)?.length ?? 0),
                              kids:
                                lang === "bn"
                                  ? "সন্তান"
                                  : (a.childrenByParent.get(m.id)?.length ?? 0) === 1
                                    ? "child"
                                    : "children",
                            })}
                          </span>
                        </div>
                      ))}
                      {bigFamilies.map((u) => (
                        <div
                          key={u.id}
                          className="flex gap-2.5 rounded-xl border border-sky-400/40 bg-sky-400/10 px-3 py-2.5 text-sm"
                        >
                          <Info className="mt-0.5 size-4 shrink-0 text-sky-500" />
                          <span>
                            {fill(t("bigFamily"), {
                              a: a.byId.get(u.members[0]!)?.name ?? "",
                              b: a.byId.get(u.members[1]!)?.name ?? "",
                              n: num(u.childIds.length),
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* Single guardians */}
            {soloParents.length > 0 && (
              <section className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <h2 className="mb-4 font-semibold">{t("singleGuardian")}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {soloParents.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col rounded-2xl border border-border/50 bg-background/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${AVATAR}`}
                          >
                            {Array.from(m.name)[0]}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{m.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {genLabel(a.gen.get(m.id) ?? 1)}
                            </div>
                          </div>
                        </div>
                        <KidCount n={a.childrenByParent.get(m.id)?.length ?? 0} />
                      </div>
                      <button
                        onClick={() =>
                          setUI({ modal: { mode: "add", relation: "spouse", relatedTo: m.id } })
                        }
                        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/5"
                      >
                        <UserPlus className="size-3.5" /> {t("addSpouseInfo")}
                      </button>
                      {(a.childrenByParent.get(m.id) ?? []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(a.childrenByParent.get(m.id) ?? []).map((k) => (
                            <MemberChip key={k} id={k} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* New family unit */}
            <button
              onClick={() => setUI({ modal: { mode: "add" } })}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-7 text-primary transition hover:bg-primary/10"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Plus className="size-5" />
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold">{t("newFamilyUnit")}</span>
                <span className="block text-xs text-primary/70">{t("newFamilyUnitHint")}</span>
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
