"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { QuerySetEditor, newQuerySet, type EditableQuerySet } from "@/components/QuerySetEditor";
import { GlobalFilterBar, newGlobalFilter, formatPeriod, type GlobalFilter } from "@/components/GlobalFilterBar";
import { NetworkGraph, rankNodesByCollab } from "@/components/NetworkGraph";
import { CitationList } from "@/components/CitationList";
import { TagInput } from "@/components/TagInput";
import { CHART_COLORS } from "@/components/ComparisonChart";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Network } from "@/lib/stats/network";

function pct(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

/** The one reusable "name: count (pct)" stat, used identically in both
 * scoring panels so a reader recognizes it's the same kind of number in
 * each place, regardless of what other detail surrounds it. When
 * `breakdown` is given, the whole line becomes a click-to-reveal
 * disclosure showing exactly who's behind the count. */
function StatLine({
  name,
  count,
  total,
  suffix,
  breakdown,
}: {
  name: string;
  count: number;
  total: number;
  suffix: string;
  breakdown?: { label: string; count: number }[];
}) {
  const line = (
    <div className="flex items-baseline gap-1.5">
      <span className="font-medium">{name}:</span>
      <span className="font-semibold">{count}</span>
      <span className="text-zinc-500 dark:text-zinc-400">{suffix}</span>
      <span className="text-zinc-400">({pct(count, total)})</span>
    </div>
  );

  if (!breakdown || breakdown.length === 0) return line;

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded px-1 -mx-1 text-blue-600 hover:bg-blue-50 hover:underline [&::-webkit-details-marker]:hidden dark:text-blue-400 dark:hover:bg-blue-950/40">
        {line}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-blue-500 transition-transform group-open:rotate-180 dark:text-blue-400" />
      </summary>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {breakdown.map((b) => (
          <span key={b.label} className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
            {b.label} ({b.count})
          </span>
        ))}
      </div>
    </details>
  );
}

/** A small "(i)" disclosure - click to reveal a plain-language explanation
 * inline, no hover/JS-state needed (native <details>, works the same on touch). */
function ExplainerInfo({ text, label }: { text: string; label: string }) {
  return (
    <details className="text-xs">
      <summary
        aria-label={label}
        className="inline-flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full border border-zinc-300 text-[10px] text-zinc-500 hover:bg-zinc-100 [&::-webkit-details-marker]:hidden dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        i
      </summary>
      <p className="mt-1 max-w-sm font-normal text-zinc-500 dark:text-zinc-400">{text}</p>
    </details>
  );
}

/** Click-to-reveal breakdown of names behind a count (e.g. "unassigned: 7")
 * - who's actually showing up untracked, so it's obvious who'd be worth
 * adding to a roster. Reuses the same <details> pattern as ExplainerInfo. */
function BreakdownDisclosure({
  triggerLabel,
  items,
}: {
  triggerLabel: string;
  items: { label: string; count: number }[];
}) {
  if (items.length === 0) return null;
  return (
    <details className="group inline-block">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded px-1 -mx-1 text-blue-600 hover:bg-blue-50 hover:underline [&::-webkit-details-marker]:hidden dark:text-blue-400 dark:hover:bg-blue-950/40">
        {triggerLabel}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it.label} className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
            {it.label} ({it.count})
          </span>
        ))}
      </div>
    </details>
  );
}

/** A network node's editor state, plus its attribution roster (annotation
 * only - never narrows which items belong to this node). */
interface EditableNode extends EditableQuerySet {
  members: string[];
}

function newNode(name: string): EditableNode {
  return { ...newQuerySet(name), members: [] };
}

interface StoredQuerySet {
  id: string;
  name: string;
  tags: string[];
  tagMode: "AND" | "OR";
  authors: string[];
  authorMode: "AND" | "OR";
  members?: string[];
  excludedItemTypes?: string[];
  dateFrom: string | null;
  dateTo: string | null;
}

interface NetworkRunEntry {
  _id: string;
  querySets: StoredQuerySet[];
  network: Network;
  createdAt: string;
}

/** Whether a node declared any tracked authors at all - distinguishes "0
 * because untracked" from "0 despite being tracked" in the scoring panels. */
function isTracked(querySets: StoredQuerySet[], nodeId: string): boolean {
  return (querySets.find((q) => q.id === nodeId)?.members?.length ?? 0) > 0;
}

function NetworkResults({
  network,
  period,
  querySets,
}: {
  network: Network;
  period: string;
  querySets: StoredQuerySet[];
}) {
  const { messages } = useLanguage();
  const t = messages.network;
  const tc = messages.compare;

  const ranked = rankNodesByCollab(network.nodes, network.edges);
  const totalPublications = network.nodes.reduce((sum, n) => sum + n.total, 0);
  const totalCollab = ranked.reduce((sum, r) => sum + r.collabTotal, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">{t.graphHeading}</h3>
          <span className="text-xs text-zinc-500">
            {messages.common.periodLabel}: {period}
          </span>
        </div>
        <NetworkGraph nodes={network.nodes} edges={network.edges} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">{t.collabRankingHeading}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                <th className="py-2 pr-4">{tc.querySetColumn}</th>
                <th className="py-2 pr-4">{t.totalPublicationsColumn}</th>
                <th className="py-2 pr-4">{t.collaborativeColumn}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const colorIndex = network.nodes.findIndex((n) => n.id === r.node.id);
                return (
                  <tr key={r.node.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-4 font-medium">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ backgroundColor: CHART_COLORS[colorIndex % CHART_COLORS.length] }}
                      />
                      {r.node.name}
                    </td>
                    <td className="py-2 pr-4">
                      {r.node.total}{" "}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        ({pct(r.collabTotal, totalCollab)})
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{r.collabTotal}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-300 font-medium dark:border-zinc-700">
                <td className="py-2 pr-4">{tc.totalRowLabel}</td>
                <td className="py-2 pr-4">
                  {totalPublications} <span className="text-xs text-zinc-400 dark:text-zinc-500">(100%)</span>
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{totalCollab}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">{t.pairRankingHeading}</h3>
        <div className="space-y-3">
          {network.edges.map((e) =>
            e.items.length > 0 ? (
              <div
                key={`${e.sourceId}-${e.targetId}`}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <CitationList
                  stat={{
                    name: `${e.sourceName} × ${e.targetName}`,
                    total: e.count,
                    items: e.items,
                    itemsTruncated: e.itemsTruncated,
                  }}
                />
                {e.initiator && (isTracked(querySets, e.sourceId) || isTracked(querySets, e.targetId)) && (
                  <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <p className="text-xs font-medium text-zinc-500">{t.method1Heading}</p>
                      <ExplainerInfo text={t.method1Explainer} label={t.explainerTriggerLabel} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                      <StatLine
                        name={e.sourceName}
                        count={e.initiator.sourceWins}
                        total={e.count}
                        suffix={t.winsLabel}
                        breakdown={(e.initiator.sourceCredited ?? []).map((c) => ({ label: c.name, count: c.count }))}
                      />
                      <StatLine
                        name={e.targetName}
                        count={e.initiator.targetWins}
                        total={e.count}
                        suffix={t.winsLabel}
                        breakdown={(e.initiator.targetCredited ?? []).map((c) => ({ label: c.name, count: c.count }))}
                      />
                      {!isTracked(querySets, e.sourceId) && (
                        <span className="rounded border border-dashed border-zinc-300 px-2 py-0.5 text-zinc-400 dark:border-zinc-700">
                          {e.sourceName}: {t.notTracked}
                        </span>
                      )}
                      {!isTracked(querySets, e.targetId) && (
                        <span className="rounded border border-dashed border-zinc-300 px-2 py-0.5 text-zinc-400 dark:border-zinc-700">
                          {e.targetName}: {t.notTracked}
                        </span>
                      )}
                      {(e.initiator.otherQuerySet ?? 0) > 0 && (
                        <BreakdownDisclosure
                          triggerLabel={`${t.otherQuerySetLabel}: ${e.initiator.otherQuerySet} (${pct(e.initiator.otherQuerySet, e.count)})`}
                          items={(e.initiator.otherQuerySetBreakdown ?? []).map((o) => ({
                            label: `${o.nodeName}: ${o.name}`,
                            count: o.count,
                          }))}
                        />
                      )}
                      {e.initiator.unassigned > 0 && (
                        <BreakdownDisclosure
                          triggerLabel={`${t.unassignedLabel}: ${e.initiator.unassigned} (${pct(e.initiator.unassigned, e.count)})`}
                          items={(e.initiator.unassignedFirstAuthors ?? []).map((a) => ({
                            label: a.name,
                            count: a.count,
                          }))}
                        />
                      )}
                    </div>
                  </div>
                )}
                {e.medalRace && (isTracked(querySets, e.sourceId) || isTracked(querySets, e.targetId)) && (
                  <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <p className="text-xs font-medium text-zinc-500">{t.method2Heading}</p>
                      <ExplainerInfo text={t.method2Explainer} label={t.explainerTriggerLabel} />
                    </div>
                    <div className="flex flex-wrap items-start gap-x-6 gap-y-2 text-xs">
                      <div>
                        <StatLine
                          name={e.sourceName}
                          count={e.medalRace.sourceWins}
                          total={e.count}
                          suffix={t.winsLabel}
                          breakdown={(e.medalRace.sourceMedalists ?? []).map((m) => ({
                            label: `${m.name} 🥇${m.gold} 🥈${m.silver} 🥉${m.bronze}`,
                            count: m.points,
                          }))}
                        />
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-zinc-500 dark:text-zinc-400">
                          <span>🥇 {e.medalRace.sourceGold ?? 0}</span>
                          <span>🥈 {e.medalRace.sourceSilver ?? 0}</span>
                          <span>🥉 {e.medalRace.sourceBronze ?? 0}</span>
                          <span className="text-zinc-400">
                            · {e.medalRace.sourcePoints} {t.pointsLabel}
                          </span>
                        </div>
                      </div>
                      <div>
                        <StatLine
                          name={e.targetName}
                          count={e.medalRace.targetWins}
                          total={e.count}
                          suffix={t.winsLabel}
                          breakdown={(e.medalRace.targetMedalists ?? []).map((m) => ({
                            label: `${m.name} 🥇${m.gold} 🥈${m.silver} 🥉${m.bronze}`,
                            count: m.points,
                          }))}
                        />
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-zinc-500 dark:text-zinc-400">
                          <span>🥇 {e.medalRace.targetGold ?? 0}</span>
                          <span>🥈 {e.medalRace.targetSilver ?? 0}</span>
                          <span>🥉 {e.medalRace.targetBronze ?? 0}</span>
                          <span className="text-zinc-400">
                            · {e.medalRace.targetPoints} {t.pointsLabel}
                          </span>
                        </div>
                      </div>
                      {!isTracked(querySets, e.sourceId) && (
                        <span className="self-start rounded border border-dashed border-zinc-300 px-2 py-0.5 text-zinc-400 dark:border-zinc-700">
                          {e.sourceName}: {t.notTracked}
                        </span>
                      )}
                      {!isTracked(querySets, e.targetId) && (
                        <span className="self-start rounded border border-dashed border-zinc-300 px-2 py-0.5 text-zinc-400 dark:border-zinc-700">
                          {e.targetName}: {t.notTracked}
                        </span>
                      )}
                      {e.medalRace.ties > 0 && (
                        <span className="self-start text-zinc-400">
                          {t.tiesLabel}: {e.medalRace.ties} ({pct(e.medalRace.ties, e.count)})
                        </span>
                      )}
                      {e.medalRace.unassigned > 0 && (
                        <span className="self-start">
                          <BreakdownDisclosure
                            triggerLabel={`${t.unassignedLabel}: ${e.medalRace.unassigned} (${pct(e.medalRace.unassigned, e.count)})`}
                            items={(e.medalRace.unassignedFirstAuthors ?? []).map((a) => ({
                              label: a.name,
                              count: a.count,
                            }))}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                key={`${e.sourceId}-${e.targetId}`}
                className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800"
              >
                {e.sourceName} × {e.targetName} — {t.noOverlap}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function NetworkPage() {
  const { messages } = useLanguage();
  const t = messages.network;
  const tc = messages.compare;

  const [querySets, setQuerySets] = useState<EditableNode[]>([newNode("Set 1"), newNode("Set 2")]);
  const [globalFilter, setGlobalFilter] = useState<GlobalFilter>(newGlobalFilter());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [history, setHistory] = useState<NetworkRunEntry[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/network-runs")
      .then((r) => r.json())
      .then((d) => {
        const runs: NetworkRunEntry[] = d.runs ?? [];
        setHistory(runs);
        if (runs.length > 0) setExpandedIds(new Set([runs[0]._id]));
      });
  }, []);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateSet(id: string, patch: Partial<EditableNode>) {
    setQuerySets((sets) => sets.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function updateGlobalFilter(patch: Partial<GlobalFilter>) {
    setGlobalFilter((f) => ({ ...f, ...patch }));
  }

  function addSet() {
    setQuerySets((sets) => [...sets, newNode(`Set ${sets.length + 1}`)]);
  }

  function removeSet(id: string) {
    setQuerySets((sets) => sets.filter((s) => s.id !== id));
  }

  function loadIntoEditor(entry: NetworkRunEntry) {
    setQuerySets(
      entry.querySets.map((s) => ({
        id: crypto.randomUUID(),
        name: s.name,
        tags: s.tags,
        tagMode: s.tagMode,
        authors: s.authors ?? [],
        authorMode: s.authorMode ?? "OR",
        members: s.members ?? [],
      }))
    );
    const first = entry.querySets[0];
    setGlobalFilter({
      dateFrom: first?.dateFrom ?? "",
      dateTo: first?.dateTo ?? "",
      excludedItemTypes: first?.excludedItemTypes ?? [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteHistoryEntry(id: string) {
    setHistory((h) => h.filter((e) => e._id !== id));
    await fetch(`/api/network-runs/${id}`, { method: "DELETE" });
  }

  async function buildNetwork() {
    if (querySets.length < 2) {
      setError(t.minTwoSets);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload: StoredQuerySet[] = querySets.map((s) => ({
        id: s.id,
        name: s.name || tc.unnamed,
        tags: s.tags,
        tagMode: s.tagMode,
        authors: s.authors,
        authorMode: s.authorMode,
        members: s.members,
        excludedItemTypes: globalFilter.excludedItemTypes,
        dateFrom: globalFilter.dateFrom || null,
        dateTo: globalFilter.dateTo || null,
      }));
      const res = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ querySets: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? messages.common.unknownError);

      const saveRes = await fetch("/api/network-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ querySets: payload, network: data.network }),
      });
      const saved = await saveRes.json();

      setHistory((h) => [saved.run, ...h]);
      setExpandedIds((prev) => new Set(prev).add(saved.run._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.common.unknownError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
      </div>

      <div className="mt-6">
        <GlobalFilterBar value={globalFilter} onChange={updateGlobalFilter} />
      </div>

      <div className="mt-4 space-y-4">
        {querySets.map((s, i) => (
          <QuerySetEditor
            key={s.id}
            value={s}
            colorIndex={i}
            globalFilter={globalFilter}
            onChange={(patch) => updateSet(s.id, patch)}
            onRemove={querySets.length > 2 ? () => removeSet(s.id) : null}
            extra={(facets) => (
              <div>
                <label className="mt-3 block text-xs font-medium text-zinc-500">{t.trackedAuthorsLabel}</label>
                <div className="mt-1">
                  <TagInput
                    tags={s.members}
                    onChange={(members) => updateSet(s.id, { members })}
                    suggestions={facets.authors}
                    placeholder={t.trackedAuthorsPlaceholder}
                    prefix=""
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">{t.trackedAuthorsHint}</p>
              </div>
            )}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={addSet}
          className="flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" /> {t.addNode}
        </button>
        <button
          onClick={buildNetwork}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t.building : t.buildButton}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <section className="mt-10">
        <h2 className="mb-3 font-semibold">{t.historyHeading}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">{t.historyEmpty}</p>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => {
              const expanded = expandedIds.has(entry._id);
              const label = entry.querySets.map((s) => s.name).join(" vs. ");
              const first = entry.querySets[0];
              const period = formatPeriod(first?.dateFrom, first?.dateTo, messages.common.allDates);
              return (
                <div key={entry._id} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      onClick={() => toggleExpanded(entry._id)}
                      className="flex items-center gap-2 text-left text-sm font-medium"
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span>{label}</span>
                      <span className="font-normal text-zinc-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => loadIntoEditor(entry)}
                        className="text-xs text-zinc-500 underline hover:text-zinc-700"
                      >
                        {tc.loadIntoEditor}
                      </button>
                      <button onClick={() => deleteHistoryEntry(entry._id)} aria-label={t.deleteRun}>
                        <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-600" />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
                      <NetworkResults network={entry.network} period={period} querySets={entry.querySets} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
