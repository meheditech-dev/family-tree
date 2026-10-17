import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Heart, ArrowRight } from "lucide-react";
import { setUI, useStore } from "@/lib/tree/store";
import { analyze } from "@/lib/tree/layout";
import { useT } from "@/lib/tree/i18n";

export const Route = createFileRoute("/relationships")({
  head: () => ({
    meta: [
      { title: "সম্পর্ক — TreeMind" },
      { name: "description", content: "Couples and parent–child relationships in your TreeMind family tree." },
      { property: "og:title", content: "সম্পর্ক — TreeMind" },
      { property: "og:description", content: "Couples and parent–child relationships in your TreeMind family tree." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelPage,
});

function RelPage() {
  const t = useT();
  const members = useStore((s) => s.members);
  const a = useMemo(() => analyze(members), [members]);
  const couples = a.marriages;
  const name = (id?: string) => (id ? a.byId.get(id)?.name : "");
  const Chip = ({ id }: { id: string }) => (
    <button onClick={() => setUI({ detailsId: id })} className="rounded-full bg-muted px-3 py-1 text-sm font-medium hover:bg-accent">{name(id)}</button>
  );
  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-bold">{t("relations")}</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">{t("couples")}</h2>
          <div className="space-y-3">
            {couples.map((c) => (
              <div key={c.id} className="flex items-center gap-2"><Chip id={c.partners[0]} /><Heart className="size-4 text-female" /><Chip id={c.partners[1]} /></div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">{t("parentChild")}</h2>
          <div className="space-y-4">
            {[...a.children].map(([pid, kids]) => (
              <div key={pid} className="flex flex-wrap items-center gap-2">
                <Chip id={pid} />
                <ArrowRight className="size-4 text-primary" />
                {kids.map((k) => <Chip key={k} id={k} />)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
