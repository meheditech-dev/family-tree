import { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { importMembers, resetDemo } from "@/lib/tree/store";
import { useT } from "@/lib/tree/i18n";
import { exportJson, exportPdf, exportPng } from "./exporters";

export function ExportMenu({ onClose, className = "" }: { onClose: () => void; className?: string }) {
  const t = useT();
  const nav = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const run = (fn: () => void) => () => { fn(); onClose(); };
  const btn = "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted";
  return (
    <div className={`absolute z-50 w-48 rounded-xl border bg-popover p-1 shadow-[var(--shadow-float)] ${className}`}>
      <button className={btn} onClick={run(exportJson)}>{t("exportJson")}</button>
      <button className={btn} onClick={run(() => { nav({ to: "/" }); setTimeout(exportPng, 300); })}>{t("exportPng")}</button>
      <button className={btn} onClick={run(() => { nav({ to: "/" }); setTimeout(exportPdf, 300); })}>{t("exportPdf")}</button>
      <button className={btn} onClick={() => file.current?.click()}>{t("importJson")}</button>
      <button className={`${btn} text-destructive`} onClick={run(resetDemo)}>{t("resetDemo")}</button>
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
