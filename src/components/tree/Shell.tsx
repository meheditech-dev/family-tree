import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Leaf, Home, Network, Users, HeartHandshake, UsersRound, Settings, Download, DatabaseBackup,
  LifeBuoy, ShieldCheck, LogOut, Search, Sun, Moon, Menu, X, AlertTriangle,
} from "lucide-react";
import { ACCENTS } from "@/lib/tree/types";
import { getState, hydrate, setSettings, setUI, useStore } from "@/lib/tree/store";
import { useT } from "@/lib/tree/i18n";
import { exportJson } from "./exporters";
import { MemberModal } from "./MemberModal";
import { DetailsDrawer } from "./DetailsDrawer";
import { ExportMenu } from "./ExportMenu";

export function Shell({ children }: { children: ReactNode }) {
  const settings = useStore((s) => s.settings);
  const warning = useStore((s) => s.ui.warning);
  const t = useT();

  useEffect(() => hydrate(), []);
  useEffect(() => {
    const r = document.documentElement;
    r.classList.toggle("dark", settings.theme === "dark");
    const accent = ACCENTS[settings.accentColor] ?? ACCENTS["teal"];
    if (accent) { r.style.setProperty("--primary", accent); r.style.setProperty("--ring", accent); }
    r.lang = settings.language;
  }, [settings.theme, settings.accentColor, settings.language]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        {warning && (
          <div className="no-print flex items-center gap-2 border-b bg-warning/15 px-4 py-2 text-sm">
            <AlertTriangle className="size-4 text-warning" /> {t("quota")}
            <button className="ml-auto" aria-label="close" onClick={() => setUI({ warning: undefined })}>
              <X className="size-4" />
            </button>
          </div>
        )}
        <main className="relative min-h-0 flex-1">{children}</main>
      </div>
      <MemberModal />
      <DetailsDrawer />
    </div>
  );
}

function Sidebar() {
  const t = useT();
  const open = useStore((s) => s.ui.sidebarOpen);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [exp, setExp] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const close = () => setUI({ sidebarOpen: false });
  const item = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent";
  const active = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold bg-accent text-accent-foreground border-l-[3px] border-primary";
  const nav: {
    to: "/" | "/family" | "/tree" | "/members" | "/relationships";
    label: string;
    icon: typeof Home;
    match?: boolean;
  }[] = [
    { to: "/", label: t("home"), icon: Home, match: path === "/" },
    { to: "/tree", label: t("tree"), icon: Network, match: path === "/tree" },
    { to: "/members", label: t("members"), icon: Users, match: path === "/members" },
    { to: "/relationships", label: t("relations"), icon: HeartHandshake, match: path === "/relationships" },
    { to: "/family", label: t("family"), icon: UsersRound, match: path === "/family" },
  ];
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={close} />}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r bg-card transition-transform duration-200 md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2 px-6 py-5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="size-4" />
          </span>
          <span className="text-lg font-bold">TreeMind</span>
          <button className="ml-auto md:hidden" onClick={close} aria-label="close menu">
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable nav — fills remaining height */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
          <nav className="flex flex-col gap-1">
            {nav.map((n, i) => (
              <Link
                key={i}
                to={n.to}
                onClick={() => setUI({ sidebarOpen: false, focusedRootId: undefined })}
                className={n.match ? active : item}
              >
                <n.icon className="size-4" /> {n.label}
              </Link>
            ))}
            <div className="my-3 border-t" />
            <button
              className={item}
              onClick={() => { setUI({ panelOpen: true }); close(); }}
            >
              <Settings className="size-4" /> {t("settings")}
            </button>

            {/* Export — opens bottom sheet on mobile, floating panel on desktop */}
            <div className="relative">
              <button
                ref={exportBtnRef}
                className={item}
                onClick={() => setExp((v) => !v)}
                aria-expanded={exp}
              >
                <Download className="size-4" /> {t("export")}
              </button>
              {exp && (
                <ExportMenu
                  onClose={() => setExp(false)}
                  anchorRef={exportBtnRef}
                />
              )}
            </div>

            <button className={item} onClick={exportJson}>
              <DatabaseBackup className="size-4" /> {t("backup")}
            </button>
          </nav>

          {/* Bottom links pushed to the end */}
          <div className="mt-auto flex flex-col gap-1 pt-4">
            <div className="border-t mb-2" />
            <button className={item}><LifeBuoy className="size-4" /> {t("help")}</button>
            <button className={item}><ShieldCheck className="size-4" /> {t("privacy")}</button>
            <button className={item}><LogOut className="size-4" /> {t("logout")}</button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar() {
  const t = useT();
  const s = useStore((st) => st.settings);
  const search = useStore((st) => st.ui.search);
  const members = useStore((st) => st.members);
  const nav = useNavigate();
  const path = useRouterState({ select: (x) => x.location.pathname });
  const timer = useRef<number>(undefined);

  const onSearch = (q: string) => {
    setUI({ search: q, focusedRootId: undefined });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const ql = q.trim().toLowerCase();
      if (!ql) return;
      const m = members.find((x) => x.name.toLowerCase().includes(ql));
      if (m) {
        if (path !== "/tree") nav({ to: "/tree" });
        setUI({ selectedId: m.id, center: { id: m.id, n: Date.now() } });
      }
    }, 250);
  };

  return (
    <header className="no-print flex h-16 items-center gap-2 border-b bg-card px-3 md:gap-4 md:px-6">
      <button className="md:hidden" aria-label="menu" onClick={() => setUI({ sidebarOpen: true })}><Menu className="size-5" /></button>
      <label className="hidden items-center gap-1 rounded-lg border px-2 py-1.5 text-sm lg:flex">
        <select
          className="bg-transparent outline-none"
          value={s.language}
          onChange={(e) => setSettings({ language: e.target.value as "bn" | "en" })}
        >
          <option value="bn">বাংলা</option>
          <option value="en">English</option>
        </select>
      </label>
      <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full border bg-muted px-4 py-2 focus-within:border-primary">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("search")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label={t("search")}
        />
      </div>
      <div className="flex items-center gap-1 md:gap-3">
        <button className="hidden text-sm text-muted-foreground hover:text-foreground xl:block" onClick={() => setUI({ panelOpen: true })}>{t("settings")}</button>
        <button className="hidden text-sm text-muted-foreground hover:text-foreground xl:block">{t("support")}</button>
        <button
          aria-label="theme"
          className="grid size-9 place-items-center rounded-full hover:bg-muted"
          onClick={() => setSettings({ theme: getState().settings.theme === "dark" ? "light" : "dark" })}
        >
          {s.theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <div className="flex overflow-hidden rounded-full border text-xs font-semibold">
          {(["en", "bn"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setSettings({ language: l })}
              className={`px-2.5 py-1 ${s.language === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
