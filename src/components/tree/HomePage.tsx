import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Heart, Layers, Layout, Leaf, Palette, Plus, Sprout, Users } from "lucide-react";
import { setUI, startNewFamily, useStore } from "@/lib/tree/store";
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

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5 text-center">
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function HomePage() {
  const t = useT();
  const members = useStore((s) => s.members);
  const settings = useStore((s) => s.settings);

  const a = useMemo(() => analyze(members), [members]);

  const stats = useMemo(() => {
    const living = members.filter((m) => !m.deathYear).length;
    const couples = a.marriages.length;

    const perGen = new Map<number, number>();
    members.forEach((m) => {
      const g = a.gen.get(m.id) ?? 0;
      perGen.set(g, (perGen.get(g) ?? 0) + 1);
    });
    const genRows = [...perGen.entries()].sort((x, y) => x[0] - y[0]).map(([, n]) => n);

    return {
      living,
      remembered: members.length - living,
      couples,
      genRows,
      maxInGen: Math.max(1, ...genRows),
    };
  }, [members, a]);

  const recent = useMemo(() => members.slice(-4).reverse(), [members]);
  const isEmpty = members.length === 0;

  const steps = [
    { title: t("stepAddTitle"), desc: t("stepAddDesc"), icon: Plus },
    { title: t("stepLinkTitle"), desc: t("stepLinkDesc"), icon: Heart },
    { title: t("stepViewTitle"), desc: t("stepViewDesc"), icon: Layout },
  ];

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
            {t("welcomeHome")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance leading-relaxed text-muted-foreground">
            {t("homeSubtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
            {!isEmpty && (
              <button
                type="button"
                onClick={() => startNewFamily(t("confirmNewFamily"))}
                className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-primary/50 bg-primary/5 px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Sprout className="size-4" />
                {t("newFamily")}
              </button>
            )}
          </div>
        </section>

        {isEmpty ? (
          <section className="rounded-3xl border border-dashed border-primary/30 bg-card/60 px-6 py-12 text-center">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sprout className="size-7" />
            </span>
            <h3 className="text-xl font-semibold">{t("emptyTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t("emptyDesc")}
            </p>
          </section>
        ) : (
          <>
            {/* At a glance */}
            <section>
              <SectionTitle title={t("homeGlance")} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Tile icon={Users} value={members.length} label={t("members")} tone="primary" />
                <Tile icon={Layers} value={stats.genRows.length} label={t("generation")} tone="accent" />
                <Tile icon={Sprout} value={stats.living} label={t("living")} tone="secondary" />
                <Tile icon={Heart} value={stats.couples} label={t("couples")} tone="muted" />
              </div>
            </section>

            {/* Generations */}
            <section>
              <SectionTitle title={t("generationSpread")} hint={t("generationSpreadHint")} />
              <div className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6">
                {stats.genRows.map((count, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-24 shrink-0 text-sm text-muted-foreground">
                      {t("generation")} {i + 1}
                    </div>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-[width] duration-700"
                        style={{ width: `${Math.max(6, (count / stats.maxInGen) * 100)}%` }}
                      />
                    </div>
                    <div className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recently added */}
            <section>
              <SectionTitle title={t("recentlyAdded")} hint={t("recentlyAddedHint")} />
              <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60 bg-card/70">
                {recent.map((m) => {
                  const gone = Boolean(m.deathYear);
                  return (
                    <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                        {Array.from(m.name)[0]}
                      </span>
                      <div className="min-w-0 flex-1 truncate font-medium">{m.name}</div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          gone ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {gone ? t("inMemory") : t("living")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}

        {/* How to start: a real sequence, so numbered */}
        <section>
          <SectionTitle title={t("startHere")} />
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="flex flex-col items-center gap-2 rounded-3xl border border-border/60 bg-card/50 px-5 py-6 text-center"
              >
                <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="font-semibold">{s.title}</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Palette className="size-4" />
          <span>
            {t("theme")}: {t(settings.theme)}
          </span>
        </footer>
      </div>
    </div>
  );
}