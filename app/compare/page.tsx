"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { ComparisonChart } from "@/components/ComparisonChart";
import { ComparisonTable } from "@/components/ComparisonTable";
import { CitationList } from "@/components/CitationList";
import { QuerySetEditor, newQuerySet, type EditableQuerySet } from "@/components/QuerySetEditor";
import { GlobalFilterBar, newGlobalFilter, formatPeriod, type GlobalFilter } from "@/components/GlobalFilterBar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { QuerySetStats } from "@/lib/stats/aggregate";

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

interface ComparisonRunEntry {
  _id: string;
  querySets: StoredQuerySet[];
  stats: QuerySetStats[];
  createdAt: string;
}

export default function ComparePage() {
  const { messages } = useLanguage();
  const t = messages.compare;

  const [querySets, setQuerySets] = useState<EditableQuerySet[]>([newQuerySet("Set 1")]);
  const [globalFilter, setGlobalFilter] = useState<GlobalFilter>(newGlobalFilter());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [history, setHistory] = useState<ComparisonRunEntry[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/comparisons")
      .then((r) => r.json())
      .then((d) => {
        const runs: ComparisonRunEntry[] = d.runs ?? [];
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

  function loadExample() {
    const a = newQuerySet("ICMT 2026");
    a.tags = ["ICMT"];
    const b = newQuerySet("CDHSI 2026");
    b.tags = ["CDHSI"];
    setQuerySets([a, b]);
    setGlobalFilter({ dateFrom: "2026-01-01", dateTo: "2026-12-31", excludedItemTypes: [] });
  }

  function loadIntoEditor(entry: ComparisonRunEntry) {
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
    await fetch(`/api/comparisons/${id}`, { method: "DELETE" });
  }

  async function runComparison() {
    setLoading(true);
    setError("");
    try {
      const payload: StoredQuerySet[] = querySets.map((s) => ({
        id: s.id,
        name: s.name || t.unnamed,
        tags: s.tags,
        tagMode: s.tagMode,
        authors: s.authors,
        authorMode: s.authorMode,
        excludedItemTypes: globalFilter.excludedItemTypes,
        dateFrom: globalFilter.dateFrom || null,
        dateTo: globalFilter.dateTo || null,
      }));
      const res = await fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ querySets: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? messages.common.unknownError);

      const saveRes = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ querySets: payload, stats: data.stats }),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
        </div>
        <button onClick={loadExample} className="text-sm text-zinc-500 underline hover:text-zinc-700">
          {t.loadExample}
        </button>
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
            onRemove={querySets.length > 1 ? () => removeSet(s.id) : null}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={addSet}
          className="flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" /> {t.addQuerySet}
        </button>
        <button
          onClick={runComparison}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t.comparing : t.compareButton}
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
                        {t.loadIntoEditor}
                      </button>
                      <button onClick={() => deleteHistoryEntry(entry._id)} aria-label={t.deleteRun}>
                        <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-600" />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="space-y-6 border-t border-zinc-200 p-4 dark:border-zinc-800">
                      <div>
                        <h3 className="mb-2 text-sm font-semibold">{t.publicationsPerYear}</h3>
                        <ComparisonChart stats={entry.stats} />
                      </div>
                      <div>
                        <div className="mb-2 flex items-baseline justify-between">
                          <h3 className="text-sm font-semibold">{t.overviewHeading}</h3>
                          <span className="text-xs text-zinc-500">
                            {messages.common.periodLabel}: {period}
                          </span>
                        </div>
                        <ComparisonTable stats={entry.stats} />
                      </div>
                      <div className="space-y-3">
                        {entry.stats.map((stat) => (
                          <CitationList key={stat.id} stat={stat} />
                        ))}
                      </div>
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
