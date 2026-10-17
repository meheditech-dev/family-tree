import { useEffect, useState } from "react";
import { X, User } from "lucide-react";
import type { Member } from "@/lib/tree/types";
import { newId, saveMember, setUI, useStore } from "@/lib/tree/store";
import { useT } from "@/lib/tree/i18n";
import { compressImage } from "@/lib/tree/helpers";

const input =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function MemberModal() {
  const t = useT();
  const modal = useStore((s) => s.ui.modal);
  const members = useStore((s) => s.members);
  const [f, setF] = useState<Member>({ id: "", name: "", gender: "male" });
  const [rel, setRel] = useState<"root" | "child" | "spouse">("child");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === "edit" && modal.id) {
      const m = members.find((x) => x.id === modal.id);
      if (m) setF(m);
    } else {
      setF({ id: newId(), name: "", gender: "male" });
      setRel(modal.relation ?? (members.length ? "child" : "root"));
      setTo(modal.relatedTo ?? members[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  if (!modal) return null;
  const close = () => setUI({ modal: undefined });
  const set = (p: Partial<Member>) => setF((x) => ({ ...x, ...p }));
  const num = (v: string) => (v ? parseInt(v, 10) : undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    let m = { ...f, name: f.name.trim() };
    if (modal.mode === "add") {
      if (rel === "child" && to) m = { ...m, parentId: to };
      saveMember(m, rel, to);
    } else saveMember(m);
    close();
    setUI({ selectedId: m.id, center: { id: m.id, n: Date.now() } });
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 p-4"
      onClick={close}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-auto rounded-2xl border bg-card p-6 pb-8 shadow-[var(--shadow-float)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {modal.mode === "edit" ? t("editMember") : t("addMember")}
          </h2>
          <button type="button" onClick={close} aria-label="close">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center overflow-hidden rounded-full bg-muted border border-accent/40">
              {f.photo ? (
                <img src={f.photo} alt="" className="size-full object-cover" />
              ) : (
                <User className="size-7 text-muted-foreground" />
              )}
            </div>
            <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              {t("photo")}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) set({ photo: await compressImage(file) });
                }}
              />
            </label>
          </div>
          <L label={t("name")}>
            <input
              required
              autoFocus
              className={input}
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </L>
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("personalInformation")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <L label={t("gender")}>
                <select
                  className={input}
                  value={f.gender}
                  onChange={(e) => set({ gender: e.target.value as Member["gender"] })}
                >
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                </select>
              </L>
              <L label={t("birthYear")}>
                <input
                  type="number"
                  className={input}
                  value={f.birthYear ?? ""}
                  onChange={(e) => set({ birthYear: num(e.target.value) })}
                />
              </L>
              <L label={t("deathYear")}>
                <input
                  type="number"
                  className={input}
                  value={f.deathYear ?? ""}
                  onChange={(e) => set({ deathYear: num(e.target.value) })}
                />
              </L>
              <L label={t("birthplace")}>
                <input
                  className={input}
                  value={f.birthplace ?? ""}
                  onChange={(e) => set({ birthplace: e.target.value || undefined })}
                />
              </L>
              <L label={t("bloodGroup")}>
                <input
                  className={input}
                  value={f.bloodGroup ?? ""}
                  onChange={(e) => set({ bloodGroup: e.target.value || undefined })}
                />
              </L>
              <L label={t("role")}>
                <input
                  className={input}
                  value={f.role ?? ""}
                  onChange={(e) => set({ role: e.target.value || undefined })}
                />
              </L>
              <L label={t("occupation")}>
                <input
                  className={input}
                  value={f.occupation ?? ""}
                  onChange={(e) => set({ occupation: e.target.value || undefined })}
                />
              </L>
            </div>
          </section>
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("contactInformation")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <L label={t("phone")}>
                <input
                  className={input}
                  value={f.phone ?? ""}
                  onChange={(e) => set({ phone: e.target.value || undefined })}
                />
              </L>
              <L label={t("address")}>
                <input
                  className={input}
                  value={f.address ?? ""}
                  onChange={(e) => set({ address: e.target.value || undefined })}
                />
              </L>
            </div>
          </section>
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("additionalDetails")}
            </h3>
            <L label={t("notes")}>
              <textarea
                rows={3}
                className={input}
                value={f.notes ?? ""}
                onChange={(e) => set({ notes: e.target.value || undefined })}
              />
            </L>
          </section>
          {modal.mode === "add" && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("familyInformation")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <L label={t("relationType")}>
                  <select
                    className={input}
                    value={rel}
                    onChange={(e) => setRel(e.target.value as typeof rel)}
                  >
                    <option value="root">{t("root")}</option>
                    <option value="child">{t("child")}</option>
                    <option value="spouse">{t("spouse")}</option>
                  </select>
                </L>
                {rel !== "root" && (
                  <L label={t("relatedTo")}>
                    <select className={input} value={to} onChange={(e) => setTo(e.target.value)}>
                      {members
                        .filter((m) => rel !== "spouse" || !m.spouseId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </L>
                )}
              </div>
            </section>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
          >
            {t("cancel")}
          </button>
          <button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            {t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
