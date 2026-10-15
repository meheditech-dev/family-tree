import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, setSettings, getState } from "@/lib/tree/store";
import { analyze, edgePath, layoutTree } from "@/lib/tree/layout";
import { relationKey } from "@/lib/tree/helpers";
import { MemberCard } from "./MemberCard";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const ZMIN = 0.3;
export const ZMAX = 2;

export function TreeCanvas({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const members = useStore((s) => s.members);
  const settings = useStore((s) => s.settings);
  const ui = useStore((s) => s.ui);
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const panRef = useRef(pan);
  panRef.current = pan;

  const scale = settings.nodeSize / 100;
  const cardW = Math.round(210 * scale);
  const cardH = Math.max(Math.round(78 * scale), settings.photoSize + 20);
  const opts = useMemo(() => ({ cardW, cardH, gapX: 72, gapY: 22, spouseGap: 28 }), [cardW, cardH]);
  const layout = useMemo(() => layoutTree(members, opts), [members, opts]);
  const analysis = useMemo(() => analyze(members), [members]);
  const posById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const byId = analysis.byId;
  const zoom = settings.zoom;
  const framed = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    const root = layout.nodes.find((n) => n.id === analysis.roots[0]);
    if (!el || !root || framed.current || ui.center) return;
    framed.current = true;
    const z = clamp(Math.min((el.clientWidth - 48) / layout.width, (el.clientHeight - 60) / layout.height, getState().settings.zoom), ZMIN, ZMAX);
    const spouse = byId.get(root.id)?.spouseId;
    const coupleW = spouse && analysis.secondary.has(spouse) ? cardW * 2 + opts.spouseGap : cardW;
    setSettings({ zoom: z });
    setPan({ x: el.clientWidth / 2 - (root.x + coupleW / 2) * z, y: 24 });
  }, [layout, analysis, byId, cardW, opts.spouseGap, containerRef, ui.center]);

  // center on request
  useEffect(() => {
    if (!ui.center) return;
    const n = posById.get(ui.center.id);
    const el = containerRef.current;
    if (!n || !el) return;
    const z = getState().settings.zoom;
    setPan({ x: el.clientWidth / 2 - (n.x + cardW / 2) * z, y: el.clientHeight / 2 - (n.y + cardH / 2) * z });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.center]);

  // wheel zoom anchored at cursor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const z = getState().settings.zoom;
      const next = clamp(z * Math.exp(-dy * 0.0015), ZMIN, ZMAX);
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top, k = next / z;
      const p = panRef.current;
      setPan({ x: px - (px - p.x) * k, y: py - (py - p.y) * k });
      setSettings({ zoom: next });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [containerRef]);

  // drag pan + pinch
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-card]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: getState().settings.zoom };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
       const el = containerRef.current;
       if (!el) return;
      const r = el.getBoundingClientRect();
      const z = getState().settings.zoom;
      const next = clamp(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d), ZMIN, ZMAX);
      const px = (a.x + b.x) / 2 - r.left, py = (a.y + b.y) / 2 - r.top, k = next / z;
      setPan((p) => ({ x: px - (px - p.x) * k, y: py - (py - p.y) * k }));
      setSettings({ zoom: next });
    } else if (pointers.current.size === 1) {
      setPan((p) => ({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const q = ui.search.trim().toLowerCase();
  const dimOf = (id: string) => ui.genFilter > 0 && Math.min(posById.get(id)?.gen ?? 1, 4) !== ui.genFilter;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-grab touch-none overflow-hidden bg-canvas active:cursor-grabbing"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
    >
      <div
        id="tree-content"
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: layout.width + 40, height: layout.height + 40 }}
      >
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={layout.width} height={layout.height}>
          {layout.spouseLinks.map((l, i) => (
            <line key={i} x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 3" />
          ))}
          {layout.edges.map((e) => (
            <g key={e.childId} opacity={dimOf(e.childId) ? 0.2 : 1}>
              <path d={edgePath(e, settings.lineStyle)} fill="none" stroke="var(--primary)" strokeWidth={2} />
               <circle cx={e.from.x} cy={e.from.y} r={3.5} fill="var(--primary)" />
            </g>
          ))}
        </svg>
        {layout.nodes.map((n) => {
           const m = byId.get(n.id);
           if (!m) return null;
          return (
            <MemberCard
              key={n.id}
              m={m}
              x={n.x}
              y={n.y}
              w={cardW}
              h={cardH}
              gen={n.gen}
              photo={settings.photoSize}
               rel={relationKey(m, analysis, ui.selectedId)}
              dim={dimOf(n.id)}
              selected={ui.selectedId === n.id}
              match={!!q && m.name.toLowerCase().includes(q)}
            />
          );
        })}
      </div>
    </div>
  );
}
