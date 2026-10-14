import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, User } from "lucide-react";
import { setUI, useStore } from "@/lib/tree/store";
import { analyze } from "@/lib/tree/layout";
import { relationKey, genVar } from "@/lib/tree/helpers";
import { useT } from "@/lib/tree/i18n";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "সদস্য তালিকা — TreeMind" },
      { name: "description", content: "Sortable list of every member in your TreeMind family tree." },
      { property: "og:title", content: "সদস্য তালিকা — TreeMind" },
      { property: "og:description", content: "Sortable list of every member in your TreeMind family tree." },
    ],
  }),
  component: MembersPage,
});

type Key = "name" | "birthYear" | "gen";
const ROW = 56;

function MembersPage() {
  const t = useT();
  const nav = useNavigate();
  const members = useStore((s) => s.members);
  const a = useMemo(() => analyze(members), [members]);
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "gen", dir: 1 });
  const [scroll, setScroll] = useState(0);
  const rows = useMemo(() => {
    const v = (m: (typeof members)[0]) => (sort.k === "gen" ? a.gen.get(m.id) ?? 0 : sort.k === "name" ? m.name : m.birthYear ?? 0);
    return [...members].sort((x, y) => (v(x) > v(y) ? 1 : v(x) < v(y) ? -1 : 0) * sort.dir);
  }, [members, sort, a]);
  const start = Math.max(0, Math.floor(scroll / ROW) - 5);
  const visible = rows.slice(start, start + 40);
  const H = ({ k, label }: { k: Key; label: string }) => (
    <button className="flex items-center gap-1 font-semibold" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : 1 }))}>
      {label} <ArrowUpDown className="size-3" />
    </button>
  );
  const living = members.filter((m) => !m.deathYear).length;
  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-wrap items-end gap-6">
        <h1 className="text-2xl font-bold">{t("members")}</h1>
        <span className="text-sm text-muted-foreground">{t("total")}: <b className="text-foreground">{members.length}</b> · {t("living")}: <b className="text-foreground">{living}</b></span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted px-4 py-3 text-sm">
          <H k="name" label={t("name")} />
          <span className="font-semibold">{t("relationType")}</span>
          <H k="birthYear" label={t("birthYear")} />
          <H k="gen" label={t("generation")} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto" onScroll={(e) => setScroll(e.currentTarget.scrollTop)}>
          <div className="relative" style={{ height: rows.length * ROW }}>
            {visible.map((m, i) => {
              const rk = relationKey(m, a);
              const g = a.gen.get(m.id) ?? 1;
              return (
                <button
                  key={m.id}
                  onClick={() => { nav({ to: "/" }); setUI({ selectedId: m.id, center: { id: m.id, n: Date.now() } }); }}
                  className="absolute inset-x-0 grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b px-4 text-left text-sm hover:bg-muted"
                  style={{ top: (start + i) * ROW, height: ROW }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                      {m.photo ? <img src={m.photo} alt="" className="size-full object-cover" /> : <User className="size-4 text-muted-foreground" />}
                    </span>
                    <span className="truncate font-medium">{m.name}</span>
                    <span className={`size-2 shrink-0 rounded-full ${m.deathYear ? "bg-deceased" : m.gender === "male" ? "bg-male" : "bg-female"}`} />
                  </span>
                  <span className="truncate text-relation">{rk ? t(rk) : m.role}</span>
                  <span className="text-muted-foreground">{m.birthYear ?? "?"} - {m.deathYear ?? t("present")}</span>
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: genVar(g) }} />{g}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
