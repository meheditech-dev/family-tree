/**
 * ExportMenu – cross-device export panel
 *
 * ┌─ Mobile (< 640 px) ──────────────────────────────────┐
 * │  Fixed bottom sheet, slides up, max 88dvh, scrollable│
 * │  Semi-opaque full-screen backdrop                     │
 * └──────────────────────────────────────────────────────┘
 *
 * ┌─ Desktop (≥ 640 px) ─────────────────────────────────┐
 * │  Absolute floating panel anchored by the caller's     │
 * │  `relative` parent. Width / position set by className │
 * │  e.g. "sm:w-64 sm:left-0 sm:top-full sm:mt-1"        │
 * └──────────────────────────────────────────────────────┘
 *
 * Download strategy (deliver-file.ts):
 *   iOS/Android  → Web Share API  (navigator.share)
 *   Desktop      → <a download>   (Blob URL)
 *   Fallback     → window.open    (new tab, user saves manually)
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { importMembers, resetDemo } from "@/lib/tree/store";
import { useT } from "@/lib/tree/i18n";
import {
  exportJson,
  prepareTreeExport,
  type ExportFormat,
  type PdfLayout,
  type PreparedExport,
} from "./exporters";
import { deliverFile } from "@/lib/tree/deliver-file";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Download,
  FileImage,
  FileJson,
  FileText,
  LoaderCircle,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";

export function ExportMenu({
  onClose,
  className = "",
}: {
  onClose: () => void;
  /** Extra classes applied to the panel.
   *  On desktop use absolute positioning, e.g.:
   *  "sm:absolute sm:left-0 sm:top-full sm:mt-1 sm:w-64 sm:z-50"
   */
  className?: string;
}) {
  const t       = useT();
  const nav     = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy,        setBusy]        = useState(false);
  const [ready,       setReady]       = useState<PreparedExport | null>(null);
  const [failed,      setFailed]      = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [showPdfOpts, setShowPdfOpts] = useState(false);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const prepare = async (format: ExportFormat, pdfLayout: PdfLayout = "vertical") => {
    setBusy(true);
    setReady(null);
    setFailed(false);
    setErrorMsg("");
    try {
      // Make sure the tree page is mounted so the layout engine has a DOM
      await nav({ to: "/tree" });
      for (let i = 0; i < 60 && !document.getElementById("tree-content"); i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      const result = await prepareTreeExport(format, pdfLayout);
      setReady(result);
    } catch (err) {
      console.error("[ExportMenu]", err);
      setFailed(true);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const doDownload = async () => {
    if (!ready) return;
    try {
      await deliverFile(ready.blob, ready.filename);
    } catch (err) {
      console.error("[ExportMenu] download failed:", err);
    }
    onClose();
  };

  const runClose = (fn: () => void) => () => { fn(); onClose(); };

  const btnCls =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm " +
    "hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none";

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      {/* Mobile: semi-opaque full-screen cover  */}
      {/* Desktop: invisible, just catches clicks outside the panel */}
      <div
        className="fixed inset-0 z-40 bg-foreground/25 sm:bg-transparent"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("export")}
        className={[
          // Mobile: fixed bottom sheet
          "fixed bottom-0 left-0 right-0 z-50",
          "flex max-h-[88dvh] flex-col",
          "rounded-t-2xl border bg-popover",
          "shadow-[var(--shadow-float)]",
          // Desktop: caller's className provides absolute + position
          // We use sm:absolute to override fixed via CSS specificity
          "sm:bottom-auto sm:left-auto sm:right-auto",
          "sm:rounded-xl sm:max-h-[min(520px,80dvh)]",
          className,
        ].join(" ")}
      >
        {/* Drag handle — visible only on mobile */}
        <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{t("export")}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={t("close")}
            disabled={busy}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4 pt-2">

          {/* Section: Export */}
          <SectionLabel>Export</SectionLabel>

          <button className={btnCls} disabled={busy} onClick={runClose(exportJson)}>
            <FileJson className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{t("exportJson")}</span>
          </button>

          <button className={btnCls} disabled={busy} onClick={() => prepare("png")}>
            <FileImage className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{t("exportPng")}</span>
          </button>

          <button className={btnCls} disabled={busy} onClick={() => prepare("jpg")}>
            <FileImage className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{t("exportJpg")}</span>
          </button>

          {/* PDF – expandable sub-options */}
          <button
            className={btnCls}
            disabled={busy}
            aria-expanded={showPdfOpts}
            onClick={() => setShowPdfOpts((v) => !v)}
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{t("exportPdf")}</span>
            <ChevronDown
              className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${
                showPdfOpts ? "rotate-180" : ""
              }`}
            />
          </button>

          {showPdfOpts && (
            <div
              role="group"
              aria-label={t("exportPdf")}
              className="ml-4 space-y-0.5 border-l-2 border-muted pl-3"
            >
              <button className={btnCls} disabled={busy} onClick={() => prepare("pdf", "vertical")}>
                <RectangleVertical className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{t("pdfVertical")}</span>
              </button>
              <button className={btnCls} disabled={busy} onClick={() => prepare("pdf", "horizontal")}>
                <RectangleHorizontal className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{t("pdfHorizontal")}</span>
              </button>
            </div>
          )}

          {/* Preparing */}
          {busy && (
            <div
              role="status"
              aria-live="polite"
              className="mt-1.5 flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
              {t("preparingExport")}
            </div>
          )}

          {/* Ready */}
          {ready && !busy && (
            <Button
              className="mt-2 h-auto w-full gap-2 py-2.5 text-sm"
              onClick={() => void doDownload()}
            >
              <Download className="size-4 shrink-0" />
              {t("downloadFile")} (.{ready.filename.split(".").pop()?.toUpperCase()})
            </Button>
          )}

          {/* Error */}
          {failed && (
            <div
              role="alert"
              className="mt-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-destructive">{t("exportFailed")}</p>
              {errorMsg && (
                <p className="mt-0.5 break-all text-xs text-destructive/70">{errorMsg}</p>
              )}
            </div>
          )}

          {/* Section: Data */}
          <div className="my-2 border-t" />
          <SectionLabel>Data</SectionLabel>

          <button
            className={btnCls}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{t("importJson")}</span>
          </button>

          <button
            className={`${btnCls} text-destructive`}
            disabled={busy}
            onClick={runClose(resetDemo)}
          >
            <RotateCcw className="size-4 shrink-0" />
            <span className="flex-1">{t("resetDemo")}</span>
          </button>

          {/* iOS home-bar safe area */}
          <div
            className="h-2"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          />
        </div>
      </div>

      {/* Hidden file input for JSON import */}
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          e.target.value = "";          // allow re-importing the same file
          try {
            const data = JSON.parse(await f.text());
            if (!importMembers(data)) alert(t("invalidFile"));
          } catch {
            alert(t("invalidFile"));
          }
          onClose();
        }}
      />
    </>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}
