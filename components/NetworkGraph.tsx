"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from "d3-force";
import { CHART_COLORS } from "@/components/ComparisonChart";
import type { NetworkEdge, NetworkNode } from "@/lib/stats/network";

interface SimNode extends SimulationNodeDatum, NetworkNode {}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  count: number;
}

const WIDTH = 800;
const HEIGHT = 480;
const TICKS = 300;

function radiusForValue(value: number, maxValue: number): number {
  if (maxValue <= 0) return 24;
  return 20 + Math.sqrt(value / maxValue) * 30;
}

/**
 * For each node, how many of its own items are shared with at least one
 * other node (deduplicated - an item overlapping with several other nodes
 * at once still counts once). Reads `node.collabTotal`, computed
 * server-side in `computeNetwork`. Falls back to summing edge counts
 * (double-counts items shared across 3+ nodes) only for network runs
 * saved before that field existed.
 */
export function computeCollabTotals(nodes: NetworkNode[], edges: NetworkEdge[]): Map<string, number> {
  const totals = new Map<string, number>();
  const legacyIds = new Set<string>();
  for (const n of nodes) {
    const known = (n as { collabTotal?: number }).collabTotal;
    if (typeof known === "number") {
      totals.set(n.id, known);
    } else {
      totals.set(n.id, 0);
      legacyIds.add(n.id);
    }
  }
  if (legacyIds.size > 0) {
    for (const e of edges) {
      if (legacyIds.has(e.sourceId)) totals.set(e.sourceId, (totals.get(e.sourceId) ?? 0) + e.count);
      if (legacyIds.has(e.targetId)) totals.set(e.targetId, (totals.get(e.targetId) ?? 0) + e.count);
    }
  }
  return totals;
}

/** Every node ranked by combined collaboration count, strongest first. */
export function rankNodesByCollab(
  nodes: NetworkNode[],
  edges: NetworkEdge[]
): { node: NetworkNode; collabTotal: number }[] {
  const totals = computeCollabTotals(nodes, edges);
  return nodes
    .map((node) => ({ node, collabTotal: totals.get(node.id) ?? 0 }))
    .sort((a, b) => b.collabTotal - a.collabTotal);
}

/**
 * Force-directed layout (d3-force) of query sets as nodes and their
 * pairwise publication overlap as edges - stronger bonds (higher overlap
 * count) pull nodes closer together and render as thicker, more opaque
 * lines. Node size reflects each node's *combined* collaboration count
 * (the sum of every edge touching it), not its own raw total, so the
 * bubbles show how much of a hub a node is rather than just how big its
 * own library slice is. The simulation runs to convergence once per data
 * change rather than animating continuously; after that, bubbles can be
 * dragged by mouse/touch to rearrange them - drag offsets are local
 * display state only, reset whenever the underlying data changes.
 */
export function NetworkGraph({ nodes, edges }: { nodes: NetworkNode[]; edges: NetworkEdge[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingId = useRef<string | null>(null);
  const [manualPositions, setManualPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  const nodesKey = nodes.map((n) => `${n.id}:${n.total}:${(n as { collabTotal?: number }).collabTotal ?? "legacy"}`).join(",");
  const edgesKey = edges.map((e) => `${e.sourceId}-${e.targetId}:${e.count}`).join(",");

  // Manual drag offsets are interaction state, not something derivable from
  // props - they must persist across re-renders while the user drags, and
  // only reset when the underlying network actually changes. That's exactly
  // what an effect keyed on the data (not a useMemo derivation) is for.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setManualPositions(new Map());
  }, [nodesKey, edgesKey]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const collabTotals = useMemo(() => computeCollabTotals(nodes, edges), [nodesKey, edgesKey]);

  // A pure function of (nodes, edges) - deriving it with useMemo during
  // render (rather than useEffect + setState) avoids an extra render pass
  // for what is, from React's perspective, just computed layout data.
  const simPositions = useMemo<Map<string, { x: number; y: number }>>(() => {
    if (nodes.length === 0) return new Map();

    const simNodes: SimNode[] = nodes.map((n, i) => ({
      ...n,
      x: WIDTH / 2 + Math.cos((i / nodes.length) * 2 * Math.PI) * 120,
      y: HEIGHT / 2 + Math.sin((i / nodes.length) * 2 * Math.PI) * 120,
    }));

    const maxCount = Math.max(1, ...edges.map((e) => e.count));
    const maxCollab = Math.max(1, ...Array.from(collabTotals.values()));

    const simLinks: SimLink[] = edges.map((e) => ({
      source: e.sourceId,
      target: e.targetId,
      count: e.count,
    }));

    const linkForce = forceLink<SimNode, SimLink>(simLinks)
      .id((d) => d.id)
      .distance((l) => 260 - (l.count / maxCount) * 170)
      .strength((l) => 0.04 + (l.count / maxCount) * 0.4);

    const simulation = forceSimulation(simNodes)
      .force("link", linkForce)
      .force("charge", forceManyBody().strength(-420))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force(
        "collide",
        forceCollide<SimNode>((d) => radiusForValue(collabTotals.get(d.id) ?? 0, maxCollab) + 14)
      )
      .stop();

    for (let i = 0; i < TICKS; i++) simulation.tick();

    const next = new Map<string, { x: number; y: number }>();
    for (const n of simNodes) next.set(n.id, { x: n.x ?? WIDTH / 2, y: n.y ?? HEIGHT / 2 });
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, edgesKey, collabTotals]);

  function toSvgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function handlePointerDown(nodeId: string, e: ReactPointerEvent<SVGCircleElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingId.current = nodeId;
  }

  function handlePointerMove(e: ReactPointerEvent<SVGCircleElement>) {
    const nodeId = draggingId.current;
    if (!nodeId) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    setManualPositions((prev) => new Map(prev).set(nodeId, p));
  }

  function handlePointerUp() {
    draggingId.current = null;
  }

  if (nodes.length === 0 || simPositions.size === 0) return null;

  const positions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) positions.set(n.id, manualPositions.get(n.id) ?? simPositions.get(n.id)!);

  const maxCollab = Math.max(1, ...Array.from(collabTotals.values()));
  const maxCount = Math.max(1, ...edges.map((e) => e.count));

  return (
    <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full select-none">
      <g>
        {edges.map((e) => {
          const p1 = positions.get(e.sourceId);
          const p2 = positions.get(e.targetId);
          if (!p1 || !p2) return null;
          const strokeWidth = 1 + (e.count / maxCount) * 9;
          const opacity = e.count > 0 ? 0.25 + (e.count / maxCount) * 0.6 : 0.12;
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          return (
            <g key={`${e.sourceId}-${e.targetId}`}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="currentColor"
                className="text-zinc-400 dark:text-zinc-600"
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
              {e.count > 0 && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x={-14}
                    y={-10}
                    width={28}
                    height={18}
                    rx={4}
                    className="fill-white dark:fill-zinc-900"
                    opacity={0.9}
                  />
                  <text
                    textAnchor="middle"
                    dy={4}
                    className="fill-zinc-700 text-[11px] font-medium dark:fill-zinc-300"
                  >
                    {e.count}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
      <g>
        {nodes.map((n, i) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const collabTotal = collabTotals.get(n.id) ?? 0;
          const r = radiusForValue(collabTotal, maxCollab);
          const color = CHART_COLORS[i % CHART_COLORS.length];
          return (
            <g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
              <circle
                r={r}
                fill={color}
                fillOpacity={0.85}
                stroke={color}
                strokeWidth={2}
                className="cursor-grab active:cursor-grabbing"
                style={{ touchAction: "none" }}
                onPointerDown={(e) => handlePointerDown(n.id, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
              <text textAnchor="middle" dy={-1} className="pointer-events-none fill-white text-[12px] font-semibold">
                {collabTotal}
              </text>
              <text textAnchor="middle" dy={11} className="pointer-events-none fill-white text-[8px] opacity-90">
                of {n.total}
              </text>
              <text
                textAnchor="middle"
                y={r + 16}
                className="pointer-events-none fill-zinc-700 text-xs font-medium dark:fill-zinc-300"
              >
                {n.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
