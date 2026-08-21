"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { QuerySetEditor, newQuerySet, type EditableQuerySet } from "@/components/QuerySetEditor";
import { GlobalFilterBar, newGlobalFilter, formatPeriod, type GlobalFilter } from "@/components/GlobalFilterBar";
import { NetworkGraph, rankNodesByCollab } from "@/components/NetworkGraph";
import { CitationList } from "@/components/CitationList";
import { CHART_COLORS } from "@/components/ComparisonChart";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Network } from "@/lib/stats/network";

function pct(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

interface StoredQuerySet {
  id: string;
  name: string;
  tags: string[];
  tagMode: "AND" | "OR";
  authors: string[];
  authorMode: "AND" | "OR";
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

function NetworkResults({ network, period }: { network: Network; period: string }) {
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
                <th className="py-2 pr-4">{t.shareOfCollabColumn}</th>
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
                    <td className="py-2 pr-4">{r.node.total}</td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {r.collabTotal}{" "}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        ({pct(r.collabTotal, r.node.total)})
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {pct(r.collabTotal, totalCollab)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-300 font-medium dark:border-zinc-700">
                <td className="py-2 pr-4">{tc.totalRowLabel}</td>
                <td className="py-2 pr-4">{totalPublications}</td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                  {totalCollab}{" "}
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    ({pct(totalCollab, totalPublications)})
                  </span>
                </td>
                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">100%</td>
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

  const [querySets, setQuerySets] = useState<EditableQuerySet[]>([newQuerySet("Set 1"), newQuerySet("Set 2")]);
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

  function updateSet(id: string, patch: Partial<EditableQuerySet>) {
    setQuerySets((sets) => sets.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function updateGlobalFilter(patch: Partial<GlobalFilter>) {
    setGlobalFilter((f) => ({ ...f, ...patch }));
  }

  function addSet() {
    setQuerySets((sets) => [...sets, newQuerySet(`Set ${sets.length + 1}`)]);
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
                      <NetworkResults network={entry.network} period={period} />
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
