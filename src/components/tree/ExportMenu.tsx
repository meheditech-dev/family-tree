/**
 * ExportMenu – dropdown export panel, anchored to the trigger button
 *
 * On every device the panel opens like a dropdown: fixed below the trigger
 * button, flipping above it when there is no room, clamped inside the
 * viewport with an internal scroll area. It is portaled to <body> so no
 * ancestor overflow container can clip it, and it follows the button when
 * the sidebar scrolls.
 *
 * Download strategy (deliver-file.ts):
 *   iOS/Android  → Web Share API  (navigator.share)
 *   Desktop      → <a download>   (Blob URL)
 *   Fallback     → window.open    (new tab, user saves manually)
 */
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { clearAll, importMembers, resetDemo } from "@/lib/tree/store";
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
  anchorRef,
}: {
  onClose: () => void;
  /** Extra classes applied to the panel (e.g. width on desktop). */
  className?: string;
  /** Trigger button — the dropdown anchors itself to this element. */
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const t       = useT();
  const nav     = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy,        setBusy]        = useState(false);
  const [ready,       setReady]       = useState<PreparedExport | null>(null);
  const [failed,      setFailed]      = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [showPdfOpts, setShowPdfOpts] = useState(false);
  const [pos,         setPos]         = useState<{
    top: number;
    left: number;
    maxH: number;
    arrowX: number;
    up: boolean;
  } | null>(null);

  // Dropdown behaviour on every device: the panel hangs below the trigger
  // button, flips above it when there is no room, and follows it on scroll.
  useLayoutEffect(() => {
    const PANEL_W = 288;
    const compute = () => {
      const r = anchorRef?.current?.getBoundingClientRect();
      const maxH = Math.min(420, window.innerHeight - 16);
      if (!r) {
        setPos({ top: 8, left: 8, maxH, arrowX: PANEL_W / 2, up: false });
        return;
      }
      const below = r.bottom + 6;
      const up = below + maxH > window.innerHeight - 8;
      const top = up ? Math.max(8, r.top - 6 - maxH) : below;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8));
      const arrowX = Math.max(14, Math.min(r.left + r.width / 2 - left, PANEL_W - 14));
      setPos({ top, left, maxH, arrowX, up });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    // The mobile sidebar slides in with a transition; re-measure when it lands.
    anchorRef?.current?.addEventListener("transitionend", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
      anchorRef?.current?.removeEventListener("transitionend", compute);
    };
  }, [anchorRef]);

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

  return createPortal(
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      {/* Invisible on every device — just catches clicks outside the panel */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onClose} />

      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("export")}
        style={
          pos
            ? { left: pos.left, top: pos.top, width: 288, maxHeight: pos.maxH }
            : { left: 8, top: 8, width: 288, maxHeight: 420 }
        }
        className={[
          "fixed z-50 flex flex-col",
          "rounded-xl border bg-popover",
          "shadow-[var(--shadow-float)]",
          className,
        ].join(" ")}
      >
        {/* Caret pointing at the trigger button */}
        {pos && (
          <span
            aria-hidden="true"
            className={[
              "absolute size-2.5 rotate-45 border bg-popover",
              pos.up ? "-bottom-[5px] border-b border-r" : "-top-[5px] border-l border-t",
            ].join(" ")}
            style={{ left: pos.arrowX - 5 }}
          />
        )}

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

          <button
            className={`${btnCls} text-destructive`}
            disabled={busy}
            onClick={() => {
              if (confirm(t("confirmClear"))) {
                clearAll();
                onClose();
              }
            }}
          >
            <X className="size-4 shrink-0" />
            <span className="flex-1">{t("startFresh")}</span>
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
    </>,
    document.body,
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}
