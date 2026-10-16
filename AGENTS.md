<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Family tree state lives in `src/lib/tree/store.ts` (useSyncExternalStore + localStorage key `treemind_v1`); no backend, so persistence stays client-only.
- Tree positioning is the pure `layoutTree` in `src/lib/tree/layout.ts`; keep it React-free so it stays unit-testable.
- UI strings go through `useT()` in `src/lib/tree/i18n.ts` (BN/EN pairs); never hardcode user-facing text.
- Layout reserves descendant subtree widths before placing couples above children to prevent overlapping branches.
- Relationship labels use `relationKey` with the selected member as reference so all tree cards share one perspective.
- Exports capture a detached full-tree copy with neutral visibility and safe raster sizing; large PDFs include an overview and overlapping detail sheets to avoid viewport clipping and preserve readability.
- The export surface (`.tree-export-surface`) must stay onscreen and invisible (opacity 0, z-index -1) — positioning it offscreen (e.g. left: -100000px) makes html-to-image capture a blank image.
