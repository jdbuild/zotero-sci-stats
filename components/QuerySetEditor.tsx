"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { TagInput } from "@/components/TagInput";
import { CHART_COLORS } from "@/components/ComparisonChart";
import type { GlobalFilter } from "@/components/GlobalFilterBar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export interface EditableQuerySet {
  id: string;
  name: string;
  tags: string[];
  tagMode: "AND" | "OR";
  authors: string[];
  authorMode: "AND" | "OR";
}

export function newQuerySet(name = ""): EditableQuerySet {
  return {
    id: crypto.randomUUID(),
    name,
    tags: [],
    tagMode: "AND",
    authors: [],
    authorMode: "OR",
  };
}

export interface Facets {
  tags: string[];
  authors: string[];
}

const EMPTY_FACETS: Facets = { tags: [], authors: [] };

export function QuerySetEditor({
  value: s,
  colorIndex,
  globalFilter,
  onChange,
  onRemove,
  extra,
}: {
  value: EditableQuerySet;
  colorIndex: number;
  /** Date range + publication type, shared across the whole comparison. */
  globalFilter: GlobalFilter;
  onChange: (patch: Partial<EditableQuerySet>) => void;
  onRemove: (() => void) | null;
  /**
   * Extra content rendered inside this card, below the tags/authors
   * fields. Pass a function to get access to this node's own tag-scoped
   * author suggestions (the same ones the Authors field above uses),
   * without re-fetching them.
   */
  extra?: ReactNode | ((facets: Facets) => ReactNode);
}) {
  const { messages } = useLanguage();
  const t = messages.compare;

  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);

  const tagsKey = JSON.stringify(s.tags);
  const authorsKey = JSON.stringify(s.authors);
  const excludedItemTypesKey = JSON.stringify(globalFilter.excludedItemTypes);

  // Suggestions are scoped to this query set's own tags/authors plus the
  // shared date range and publication type, so they narrow down together
  // with the chart instead of always listing the whole library.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/facets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: s.tags,
        tagMode: s.tagMode,
        authors: s.authors,
        authorMode: s.authorMode,
        excludedItemTypes: globalFilter.excludedItemTypes,
        dateFrom: globalFilter.dateFrom || null,
        dateTo: globalFilter.dateTo || null,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setFacets({ tags: d.tags ?? [], authors: d.authors ?? [] });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsKey, s.tagMode, authorsKey, s.authorMode, excludedItemTypesKey, globalFilter.dateFrom, globalFilter.dateTo]);

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS[colorIndex % CHART_COLORS.length] }}
          />
          <input
            value={s.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t.querySetNamePlaceholder}
            className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold hover:border-zinc-300 focus:border-zinc-300 focus:outline-none dark:hover:border-zinc-700"
          />
        </div>
        {onRemove && (
          <button onClick={onRemove} aria-label={t.removeQuerySet}>
            <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-600" />
          </button>
        )}
      </div>

      <label className="mt-3 block text-xs font-medium text-zinc-500">{t.tagsLabel}</label>
      <div className="mt-1 grid gap-3 sm:grid-cols-[1fr_auto]">
        <TagInput
          tags={s.tags}
          onChange={(tags) => onChange({ tags })}
          suggestions={facets.tags}
          placeholder={t.tagsPlaceholder}
        />
        <select
          value={s.tagMode}
          onChange={(e) => onChange({ tagMode: e.target.value as "AND" | "OR" })}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="AND">{t.tagModeAnd}</option>
          <option value="OR">{t.tagModeOr}</option>
        </select>
      </div>

      <label className="mt-3 block text-xs font-medium text-zinc-500">{t.authorsLabel}</label>
      <div className="mt-1 grid gap-3 sm:grid-cols-[1fr_auto]">
        <TagInput
          tags={s.authors}
          onChange={(authors) => onChange({ authors })}
          suggestions={facets.authors}
          placeholder={t.authorsPlaceholder}
          prefix=""
        />
        <select
          value={s.authorMode}
          onChange={(e) => onChange({ authorMode: e.target.value as "AND" | "OR" })}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="AND">{t.authorModeAnd}</option>
          <option value="OR">{t.authorModeOr}</option>
        </select>
      </div>

      {typeof extra === "function" ? extra(facets) : extra}
    </div>
  );
}
