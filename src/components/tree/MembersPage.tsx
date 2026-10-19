import { useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpDown, ChevronDown, Plus, Sprout, UsersRound } from "lucide-react";
import { analyze, type Analysis } from "@/lib/tree/layout";
import { buildMemberBoard, type MemberColumn } from "@/lib/tree/member-board";
import { computeAge, genVar, relationKey } from "@/lib/tree/helpers";
import { useT, type TKey } from "@/lib/tree/i18n";
import { setUI, startNewFamily, useStore } from "@/lib/tree/store";
import type { Member } from "@/lib/tree/types";
import { ExportMenu } from "./ExportMenu";

type View = "list" | "board" | "grid";
type SortKey = "name" | "birthYear" | "gen";
const VIEWS: { value: View; label: TKey }[] = [
  { value: "list", label: "listView" },
  { value: "board", label: "boardView" },
  { value: "grid", label: "gridView" },
];
const BN_ORDINALS = ["১ম", "২য়", "৩য়", "৪র্থ", "৫ম", "৬ষ্ঠ", "৭ম", "৮ম", "৯ম", "১০ম"];
const AVATAR_TONES = [
  "bg-primary/15 text-primary",
  "bg-male/15 text-male",
  "bg-love/15 text-love",
  "bg-warning/20 text-amber-700 dark:text-amber-300",
  "bg-gen-3/10 text-gen-3 dark:text-violet-300",
];
const INITIALS = new Intl.Segmenter("bn", { granularity: "grapheme" });
const CONTROL =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function MemberAvatar({ member }: { member: Member }) {
  const tone =
    Array.from(member.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length;
  return (
    <span
      className={`grid size-11 shrink-0 place-items-center overflow-hidden rounded-full text-lg font-semibold ${member.deathYear ? "bg-deceased/15 text-muted-foreground" : AVATAR_TONES[tone]}`}
    >
      {member.photo ? (
        <img src={member.photo} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden="true">
          {INITIALS.segment(member.name.trim())[Symbol.iterator]().next().value?.segment ?? "?"}
        </span>
      )}
    </span>
  );
}

function MemberEntry({
  member,
  analysis,
  compact = false,
}: {
  member: Member;
  analysis: Analysis;
  compact?: boolean;
}) {
  const t = useT();
  const language = useStore((s) => s.settings.language);
  const num = (n: number) => n.toLocaleString(language, { useGrouping: false });
  const age = computeAge(member);
  const relation = relationKey(member, analysis);
  const badge =
    relation === "spouse"
      ? "bg-love/15 text-love"
      : relation === "daughter"
        ? "bg-gen-3/10 text-gen-3 dark:text-violet-300"
        : relation === "patriarch" || member.role
          ? "bg-warning/20 text-amber-700 dark:text-amber-300"
          : "bg-male/10 text-male";
  return (
    <button
      type="button"
      onClick={() => setUI({ detailsId: member.id })}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      data-member-id={member.id}
    >
      <MemberAvatar member={member} />
      <span className="min-w-0 flex-1">
        <span
          className={`block break-words text-sm font-semibold leading-snug ${member.deathYear ? "text-muted-foreground" : "text-foreground"}`}
        >
          {member.name}
        </span>
        {!compact && (member.birthYear || member.deathYear) && (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {member.birthYear ? num(member.birthYear) : "?"} –{" "}
            {member.deathYear ? num(member.deathYear) : t("present")}
            {age && (
              <>
                {" "}
                · {num(age.age)} {t("years")}
              </>
            )}
          </span>
        )}
      </span>
      {!compact && (relation || member.role) && (
        <span
          className={`max-w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-medium leading-snug ${badge}`}
        >
          {relation ? t(relation) : member.role}
        </span>
      )}
      {member.deathYear && <span className="sr-only">{t("deceased")}</span>}
    </button>
  );
}

function GenerationBoard({
  columns,
  analysis,
  generationLabel,
  num,
}: {
  columns: MemberColumn[];
  analysis: Analysis;
  generationLabel: (generation: number) => string;
  num: (n: number) => string;
}) {
  const t = useT();
  return (
    <div className="overflow-x-auto pb-4" tabIndex={0} role="region" aria-label={t("boardView")}>
      <div className="flex w-max min-w-full items-start gap-7">
        {columns.map((column, index) => {
          const years = column.members.flatMap((member) =>
            member.birthYear ? [member.birthYear] : [],
          );
          const minYear = Math.min(...years);
          const maxYear = Math.max(...years);
          const yearRange =
            minYear === maxYear ? num(minYear) : `${num(minYear)} – ${num(maxYear)}`;
          return (
            <section
              key={column.generation}
              aria-label={generationLabel(column.generation)}
              className="relative w-[min(320px,calc(100vw-48px))] flex-1 rounded-[22px] bg-secondary/80"
              data-generation={column.generation}
            >
              {index < columns.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="absolute -right-6 top-8 size-5 text-muted-foreground/60"
                />
              )}
              <header
                className="flex min-h-20 items-center justify-between gap-3 rounded-t-[22px] border border-t-[5px] bg-card px-5 py-4"
                style={{
                  borderTopColor: `color-mix(in oklch, var(--primary) ${Math.max(35, 100 - index * 20)}%, var(--card))`,
                }}
              >
                <div className="min-w-0">
                  <h2 className="font-bold">{generationLabel(column.generation)}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {years.length
                      ? t("bornBetween").replace("{years}", yearRange)
                      : t("memberCount").replace("{count}", num(column.members.length))}
                  </p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-lg font-semibold text-primary">
                  {num(column.members.length)}
                </span>
              </header>
              <div className="space-y-3 p-3 pb-6">
                {column.groups.map((group) => {
                  const names = group.parentIds
                    .map((id) => analysis.byId.get(id)?.name)
                    .filter(Boolean)
                    .join(` ${t("and")} `);
                  return (
                    <div
                      key={group.id}
                      className="overflow-hidden rounded-[18px] border bg-card p-2"
                    >
                      <p
                        className={`px-3 pb-1 pt-1.5 text-xs leading-relaxed ${group.kind === "couple" ? "text-love" : "text-muted-foreground"}`}
                      >
                        {group.kind === "couple"
                          ? t("couple")
                          : group.kind === "siblings"
                            ? `${t("childrenOf").replace("{names}", names)} · ${num(group.members.length)}`
                            : t("root")}
                      </p>
                      <div className="divide-y divide-border/70">
                        {group.members.map((member) => (
                          <MemberEntry
                            key={member.id}
                            member={member}
                            analysis={analysis}
                            compact={group.kind === "siblings"}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MemberList({
  members,
  analysis,
  num,
}: {
  members: Member[];
  analysis: Analysis;
  num: (n: number) => string;
}) {
  const t = useT();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "gen", dir: 1 });
  const [scroll, setScroll] = useState(0);
  const rows = useMemo(
    () =>
      [...members].sort((a, b) => {
        const difference =
          sort.key === "name"
            ? a.name.localeCompare(b.name)
            : sort.key === "gen"
              ? (analysis.gen.get(a.id) ?? 1) - (analysis.gen.get(b.id) ?? 1)
              : (a.birthYear ?? 0) - (b.birthYear ?? 0);
        return difference * sort.dir;
      }),
    [members, analysis, sort],
  );
  const rowHeight = 64;
  const start = Math.max(0, Math.floor(scroll / rowHeight) - 5);
  const headers: { key?: SortKey; label: TKey }[] = [
    { key: "name", label: "name" },
    { label: "relationType" },
    { key: "birthYear", label: "birthYear" },
    { key: "gen", label: "generation" },
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted px-5 py-3 text-sm">
          {headers.map(({ key, label }) =>
            key ? (
              <button
                key={label}
                type="button"
                onClick={() =>
                  setSort((current) => ({
                    key,
                    dir: current.key === key && current.dir === 1 ? -1 : 1,
                  }))
                }
                className="flex items-center gap-1.5 font-semibold"
              >
                {t(label)} <ArrowUpDown aria-hidden="true" className="size-3" />
              </button>
            ) : (
              <span key={label} className="font-semibold">
                {t(label)}
              </span>
            ),
          )}
        </div>
        <div
          className="max-h-[65vh] overflow-y-auto"
          onScroll={(event) => setScroll(event.currentTarget.scrollTop)}
        >
          <div className="relative" style={{ height: rows.length * rowHeight }}>
            {rows.slice(start, start + 40).map((member, index) => {
              const relation = relationKey(member, analysis);
              const generation = analysis.gen.get(member.id) ?? 1;
              return (
                <button
                  key={member.id}
                  type="button"
                  data-member-id={member.id}
                  onClick={() => setUI({ detailsId: member.id })}
                  className="absolute inset-x-0 grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b px-5 text-left text-sm hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  style={{ top: (start + index) * rowHeight, height: rowHeight }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <MemberAvatar member={member} />
                    <span className="truncate font-medium">{member.name}</span>
                  </span>
                  <span className="truncate text-relation">
                    {relation ? t(relation) : member.role}
                  </span>
                  <span className="text-muted-foreground">
                    {member.birthYear ? num(member.birthYear) : "?"} –{" "}
                    {member.deathYear ? num(member.deathYear) : t("present")}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: genVar(generation) }}
                    />
                    {num(generation)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MembersPage() {
  const t = useT();
  const members = useStore((s) => s.members);
  const language = useStore((s) => s.settings.language);
  const analysis = useMemo(() => analyze(members), [members]);
  const board = useMemo(() => buildMemberBoard(members, analysis), [members, analysis]);
  const [view, setView] = useState<View>("board");
  const [livingOnly, setLivingOnly] = useState(false);
  const [gender, setGender] = useState("all");
  const [relation, setRelation] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLButtonElement>(null);
  const num = (n: number) => n.toLocaleString(language, { useGrouping: false });
  const generationLabel = (generation: number) => {
    const suffix =
      generation % 100 >= 11 && generation % 100 <= 13
        ? "th"
        : ({ 1: "st", 2: "nd", 3: "rd" }[generation % 10] ?? "th");
    const ordinal =
      language === "bn"
        ? (BN_ORDINALS[generation - 1] ?? `${num(generation)}তম`)
        : `${generation}${suffix}`;
    return `${ordinal} ${t("generation")}`;
  };
  const relations = useMemo(
    () =>
      new Map(
        members.map((member) => {
          const key = relationKey(member, analysis);
          return [member.id, { value: key ?? `role:${member.role ?? ""}`, key, role: member.role }];
        }),
      ),
    [members, analysis],
  );
  const relationOptions = [
    ...new Map([...relations.values()].map((item) => [item.value, item])).values(),
  ];
  const filtered = members.filter(
    (member) =>
      (!livingOnly || !member.deathYear) &&
      (gender === "all" || member.gender === gender) &&
      (relation === "all" || relations.get(member.id)?.value === relation),
  );
  const visibleIds = new Set(filtered.map((member) => member.id));
  const columns = board
    .map((column) => ({
      ...column,
      members: column.members.filter((member) => visibleIds.has(member.id)),
      groups: column.groups
        .map((group) => ({
          ...group,
          members: group.members.filter((member) => visibleIds.has(member.id)),
        }))
        .filter((group) => group.members.length),
    }))
    .filter((column) => column.members.length);
  const hasFilters = livingOnly || gender !== "all" || relation !== "all";
  const clearFilters = () => {
    setLivingOnly(false);
    setGender("all");
    setRelation("all");
  };
  const addMember = () => setUI({ modal: { mode: "add", relation: "root" } });

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      <div className="flex min-h-full flex-col gap-6 p-5 md:p-8 xl:p-10">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("members")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("total")}: <b className="font-medium">{num(members.length)}</b> · {t("living")}:{" "}
              <b className="font-medium">
                {num(members.filter((member) => !member.deathYear).length)}
              </b>{" "}
              — {t("groupedByGeneration")}
            </p>
          </div>
          <div
            className="flex rounded-2xl bg-secondary p-1"
            role="group"
            aria-label={t("memberViews")}
          >
            {VIEWS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={view === item.value}
                onClick={() => setView(item.value)}
                className={`min-w-20 rounded-xl px-5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring ${view === item.value ? "bg-card font-semibold text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              aria-pressed={!hasFilters}
              onClick={clearFilters}
              className={`${CONTROL} ${!hasFilters ? "border-primary/25 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-accent"}`}
            >
              {t("allMembers")}
            </button>
            <button
              type="button"
              aria-pressed={livingOnly}
              onClick={() => setLivingOnly((value) => !value)}
              className={`${CONTROL} ${livingOnly ? "border-primary/25 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-accent"}`}
            >
              {t("livingOnly")}
            </button>
            <label className="relative">
              <select
                aria-label={t("gender")}
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className={`${CONTROL} max-w-44 appearance-none pr-9 ${gender !== "all" ? "border-primary/25 bg-accent text-primary" : "bg-card text-muted-foreground"}`}
              >
                <option value="all">{t("gender")}</option>
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
            </label>
            <label className="relative">
              <select
                aria-label={t("relationType")}
                value={relation}
                onChange={(event) => setRelation(event.target.value)}
                className={`${CONTROL} max-w-52 appearance-none pr-9 ${relation !== "all" ? "border-primary/25 bg-accent text-primary" : "bg-card text-muted-foreground"}`}
              >
                <option value="all">{t("relationType")}</option>
                {relationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.key ? t(option.key) : option.role}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              ref={exportRef}
              type="button"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((open) => !open)}
              className={`${CONTROL} bg-card text-muted-foreground hover:bg-accent`}
            >
              {t("exportShort")}
            </button>
            {exportOpen && (
              <ExportMenu anchorRef={exportRef} onClose={() => setExportOpen(false)} />
            )}
            <button
              type="button"
              onClick={addMember}
              className={`${CONTROL} border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary/90`}
            >
              <Plus aria-hidden="true" className="size-4" />
              {t("addMember")}
            </button>
            {members.length > 0 && (
              <button
                type="button"
                onClick={() => startNewFamily(t("confirmNewFamily"))}
                title={t("newFamilyHint")}
                className={`${CONTROL} border-dashed border-primary/50 bg-primary/5 font-semibold text-primary hover:bg-primary/10`}
              >
                <Sprout aria-hidden="true" className="size-4" />
                {t("newFamily")}
              </button>
            )}
          </div>
        </div>

        {!filtered.length ? (
          <div className="flex min-h-72 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <UsersRound aria-hidden="true" className="size-6" />
            </span>
            <h2 className="text-lg font-semibold">
              {t(members.length ? "noFilteredMembers" : "emptyTitle")}
            </h2>
            {!members.length && (
              <p className="mt-2 text-sm text-muted-foreground">{t("emptyDesc")}</p>
            )}
            <button
              type="button"
              onClick={members.length ? clearFilters : addMember}
              className={`${CONTROL} mt-5 border-primary/25 bg-accent text-primary`}
            >
              {t(members.length ? "clearFilters" : "addMember")}
            </button>
          </div>
        ) : view === "board" ? (
          <GenerationBoard
            columns={columns}
            analysis={analysis}
            generationLabel={generationLabel}
            num={num}
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((member) => (
              <div key={member.id} className="rounded-2xl border bg-card p-2">
                <p className="px-3 pt-2 text-xs font-medium text-primary">
                  {generationLabel(analysis.gen.get(member.id) ?? 1)}
                </p>
                <MemberEntry member={member} analysis={analysis} />
              </div>
            ))}
          </div>
        ) : (
          <MemberList
            key={`${livingOnly}:${gender}:${relation}`}
            members={filtered}
            analysis={analysis}
            num={num}
          />
        )}

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
          <p aria-live="polite">
            {t("shownMembers")
              .replace("{count}", num(filtered.length))
              .replace("{total}", num(members.length))}
            {view !== "list" && (
              <>
                {" "}
                ·{" "}
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("viewAsList")}
                </button>
              </>
            )}
          </p>
          <p>{t("memberProfileHint")}</p>
        </footer>
      </div>
    </div>
  );
}
