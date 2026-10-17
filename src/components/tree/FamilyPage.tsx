import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Heart, Layers, Layout, Leaf, Plus, Sprout, Users } from "lucide-react";
import { setUI, useStore } from "@/lib/tree/store";
import { parentsOf, spousesOf } from "@/lib/tree/types";
import { useT } from "@/lib/tree/i18n";
import { analyze } from "@/lib/tree/layout";

type Tone = "primary" | "accent" | "secondary" | "muted";

const toneClass: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-muted-foreground",
};

function Tile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  tone: Tone;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card/70 px-4 py-6">
      <span className={`grid size-11 place-items-center rounded-2xl ${toneClass[tone]}`}>
        <Icon className="size-5" />
      </span>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-muted/50 px-3 py-2 text-center">
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function FamilyPage() {
  const t = useT();
  const members = useStore((s) => s.members);

  const a = useMemo(() => analyze(members), [members]);
  const living = members.filter((m) => !m.deathYear).length;
  const remembered = members.length - living;
  const genCount = new Set(members.map((m) => a.gen.get(m.id) ?? 0)).size;
  const livingPct = members.length ? Math.round((living / members.length) * 100) : 0;

  // One card per family line: the eldest known couple and everyone below them.
  const families = useMemo(() => {
    type M = (typeof members)[number];
    type Id = M["id"];

    const byId = new Map<Id, M>(members.map((m) => [m.id, m]));
    const kids = new Map<Id, M[]>();
    members.forEach((m) => {
      for (const p of parentsOf(m)) kids.set(p, [...(kids.get(p) ?? []), m]);
    });
    const spouseList = (m: M) => spousesOf(m).filter((s) => byId.has(s));

    // Someone who married into a family has no parent here, but a spouse does.
    const marriedIn = (m: M) =>
      !parentsOf(m).some((p) => byId.has(p)) &&
      spouseList(m).some((s) => parentsOf(byId.get(s)!).some((p) => byId.has(p)));

    const seen = new Set<Id>();
    const out: {
      root: M;
      spouse?: M;
      extraSpouses: number;
      size: number;
      depth: number;
      living: number;
    }[] = [];

    for (const root of members) {
      if (parentsOf(root).some((p) => byId.has(p)) || marriedIn(root) || seen.has(root.id)) continue;
      const spouses = spouseList(root).map((s) => byId.get(s)!);

      seen.add(root.id);
      const people = new Set<Id>([root.id]);
      const queue: M[] = [root];
      for (const spouse of spouses) {
        seen.add(spouse.id);
        people.add(spouse.id);
        queue.push(spouse);
      }

      while (queue.length) {
        const cur = queue.shift()!;
        for (const child of kids.get(cur.id) ?? []) {
          if (people.has(child.id)) continue;
          people.add(child.id);
          queue.push(child);
          for (const csId of spouseList(child)) {
            const cs = byId.get(csId)!;
            if (!people.has(cs.id)) {
              people.add(cs.id);
              queue.push(cs);
            }
          }
        }
      }

      const ids = [...people];
      const gens = ids.map((id) => a.gen.get(id) ?? 0);
      const maxGen = gens.length ? gens.reduce((a, b) => Math.max(a, b)) : 0;
      const minGen = gens.length ? gens.reduce((a, b) => Math.min(a, b)) : 0;
      out.push({
        root,
        ...(spouses.length !== 0 && { spouse: spouses[0] }),
        extraSpouses: Math.max(0, spouses.length - 1),
        size: ids.length,
        depth: maxGen - minGen + 1,
        living: ids.filter((id) => !byId.get(id)?.deathYear).length,
      });
    }

    return out.sort((x, y) => y.size - x.size);
  }, [members, a]);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-14 px-5 py-12 sm:py-16">
        {/* Welcome */}
        <section className="text-center">
          <header className="mb-8 flex items-center justify-center gap-3">
            <span className="grid size-14 place-items-center rounded-3xl bg-primary text-primary-foreground">
              <Leaf className="size-7" />
            </span>
            <span className="text-2xl font-bold tracking-tight">TreeMind</span>
          </header>

          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t("familyWelcome")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance leading-relaxed text-muted-foreground">
            {t("familySubtitle")}
          </p>
        </section>

        {/* Numbers */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Tile icon={Users} value={members.length} label={t("members")} tone="primary" />
            <Tile icon={Layers} value={genCount} label={t("generation")} tone="accent" />
            <Tile icon={Sprout} value={living} label={t("living")} tone="secondary" />
            <Tile icon={Heart} value={remembered} label={t("inMemory")} tone="muted" />
          </div>

          {members.length > 0 ? (
            <div className="rounded-3xl border border-border/60 bg-card/70 p-6">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h3 className="font-semibold">{t("livingBalance")}</h3>
                <span className="text-sm tabular-nums text-muted-foreground">{livingPct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70 transition-[width] duration-700"
                  style={{ width: `${livingPct}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t("livingBalanceHint")}</p>
            </div>
          ) : null}
        </section>

        {/* Family lines */}
        <section>
          <div className="mb-5 text-center">
            <h2 className="text-xl font-semibold tracking-tight">{t("familyGroups")}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {t("familyGroupsHint")}
            </p>
          </div>

          {families.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-primary/30 bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {t("noFamilies")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {families.map((f) => (
                <article
                  key={f.root.id}
                  className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/70 p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                      {Array.from(f.root.name)[0]}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{f.root.name}</div>
                      {f.spouse ? (
                        <div className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                          <Heart className="size-3.5 shrink-0 text-primary/70" />
                          <span className="truncate">{f.spouse.name}</span>
                          {f.extraSpouses > 0 && (
                            <span className="shrink-0 rounded-full bg-muted px-1.5 text-xs font-medium">
                              +{f.extraSpouses}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Fact value={f.size} label={t("members")} />
                    <Fact value={f.depth} label={t("generation")} />
                    <Fact value={f.living} label={t("living")} />
                  </div>

                  <Link
                    to="/tree"
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Layout className="size-4" />
                    {t("openFamilyTree")}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/tree"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Layout className="size-4" />
            {t("openFamilyTree")}
          </Link>
          <Link
            to="/members"
            className="inline-flex items-center gap-2 rounded-2xl border border-input bg-background px-6 py-3 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Users className="size-4" />
            {t("members")}
          </Link>
          <button
            type="button"
            onClick={() => setUI({ modal: { mode: "add" } })}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="size-4" />
            {t("addMember")}
          </button>
        </section>
      </div>
    </div>
  );
}