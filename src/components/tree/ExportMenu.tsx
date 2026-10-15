import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { importMembers, resetDemo } from "@/lib/tree/store";
import { useT } from "@/lib/tree/i18n";
import { exportJson, prepareTreeExport, type ExportFormat, type PreparedExport } from "./exporters";
import { deliverFile } from "@/lib/tree/deliver-file";
import { Button } from "@/components/ui/button";
import { Download, LoaderCircle, X } from "lucide-react";

export function ExportMenu({ onClose, className = "" }: { onClose: () => void; className?: string }) {
  const t = useT();
  const nav = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<PreparedExport | null>(null);
  const [failed, setFailed] = useState(false);
  const prepare = async (format: ExportFormat) => {
    setBusy(true); setReady(null); setFailed(false);
    try {
      await nav({ to: "/" });
      // Wait for the tree to mount after navigating from another page.
      for (let i = 0; i < 50 && !document.getElementById("tree-content"); i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      setReady(await prepareTreeExport(format));
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  const run = (fn: () => void) => () => { fn(); onClose(); };
  const btn = "h-auto w-full justify-start whitespace-normal rounded-md px-3 py-2 text-left text-sm hover:bg-muted";
  return (
    <div role="dialog" aria-label={t("export")} className={`absolute z-50 max-h-[70dvh] w-52 overflow-auto rounded-lg border bg-popover p-2 shadow-[var(--shadow-float)] ${className}`}>
      <div className="flex justify-end"><Button variant="ghost" size="icon" aria-label={t("close")} disabled={busy} onClick={onClose}><X /></Button></div>
      <Button variant="ghost" className={btn} disabled={busy} onClick={run(exportJson)}>{t("exportJson")}</Button>
      <Button variant="ghost" className={btn} disabled={busy} onClick={() => prepare("png")}>{t("exportPng")}</Button>
      <Button variant="ghost" className={btn} disabled={busy} onClick={() => prepare("jpg")}>{t("exportJpg")}</Button>
      <Button variant="ghost" className={btn} disabled={busy} onClick={() => prepare("pdf")}>{t("exportPdf")}</Button>
      {busy && <div role="status" className="flex items-center gap-2 px-3 py-3 text-sm"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />{t("preparingExport")}</div>}
      {ready && <Button className="my-2 h-auto w-full whitespace-normal" onClick={() => { void deliverFile(ready.blob, ready.filename); onClose(); }}><Download />{t("downloadFile")} ({ready.filename.split(".").pop()?.toUpperCase()})</Button>}
      {failed && <p role="alert" className="px-3 py-2 text-sm text-destructive">{t("exportFailed")}</p>}
      <Button variant="ghost" className={btn} disabled={busy} onClick={() => file.current?.click()}>{t("importJson")}</Button>
      <Button variant="ghost" className={`${btn} text-destructive`} disabled={busy} onClick={run(resetDemo)}>{t("resetDemo")}</Button>
      <input
        ref={file}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            if (!importMembers(JSON.parse(await f.text()))) alert(t("invalidFile"));
          } catch {
            alert(t("invalidFile"));
          }
          onClose();
        }}
      />
    </div>
  );
}
