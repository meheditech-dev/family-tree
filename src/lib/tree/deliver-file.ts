/**
 * deliver-file.ts
 *
 * Delivers a Blob as a file download on every platform:
 *
 *  1. iOS / iPadOS / Android Chrome  → Web Share API (navigator.share with files)
 *     Required because <a download> is silently ignored on iOS Safari, and
 *     createObjectURL triggers a blank page instead of a download.
 *
 *  2. Desktop browsers / Android that don't support file sharing
 *     → programmatic <a download> click with a revocable Blob URL.
 *
 *  3. If both fail → open the Blob in a new tab so the user can save manually.
 */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Keep the URL alive long enough for the browser to start the download
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * The main entry point.  Always call this instead of downloadBlob directly
 * so iOS / mobile devices get the system share sheet.
 */
export async function deliverFile(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });

  // ── Attempt 1: Web Share API with file support ─────────────────────────
  // Works on: iOS Safari 15+, Chrome for Android, Safari macOS 13+
  if (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: filename });
      return; // success
    } catch (err) {
      // AbortError = user cancelled — treat as success, don't fall through
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Any other error → fall through to the next strategy
      console.warn("[deliverFile] share failed, falling back:", err);
    }
  }

  // ── Attempt 2: <a download> + Blob URL ────────────────────────────────
  // Works on: Chrome, Firefox, Edge, Safari macOS, Samsung Internet
  // Blocked on: iOS Safari (silently fails for cross-origin or non-http)
  try {
    downloadBlob(blob, filename);
    return;
  } catch (err) {
    console.warn("[deliverFile] anchor download failed, falling back:", err);
  }

  // ── Attempt 3: Open in new tab ────────────────────────────────────────
  // Last resort — user can long-press and "Save to Files" on iOS,
  // or right-click → Save As on desktop.
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
