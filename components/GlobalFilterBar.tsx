"use client";

import { useEffect, useState } from "react";
import { ItemTypeFilter, type ItemTypeOption } from "@/components/ItemTypeFilter";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export interface GlobalFilter {
  /** ISO "YYYY-MM-DD", from a native date input. */
  dateFrom: string;
  dateTo: string;
  /** Item types unchecked by the user. Empty = everything selected (the default). */
  excludedItemTypes: string[];
}

export function newGlobalFilter(): GlobalFilter {
  return { dateFrom: "", dateTo: "", excludedItemTypes: [] };
}

/** Human-readable summary of a date range, for showing "what period was this run for" next to results. */
export function formatPeriod(
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  allDatesLabel: string
): string {
  if (!dateFrom && !dateTo) return allDatesLabel;
  if (dateFrom && dateTo) return `${dateFrom} – ${dateTo}`;
  if (dateFrom) return `≥ ${dateFrom}`;
  return `≤ ${dateTo}`;
}

/**
 * The *end* of a whole-month/year span starting at `isoDay` - i.e. one day
 * before the same date a month/year later, not the same date itself. A
 * "+1 year" from 2025-01-01 must land on 2025-12-31, not 2026-01-01:
 * the latter is already one day into the next year's publications, so a
 * "2025" range built from it would silently include a stray 2026-01-01 item.
 */
export function spanEndFromIsoDate(isoDay: string, amount: number, unit: "month" | "year"): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (unit === "month") date.setUTCMonth(date.getUTCMonth() + amount);
  else date.setUTCFullYear(date.getUTCFullYear() + amount);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Date range + publication type, shared across every query set in a
 * comparison rather than repeated per set - these two describe the scope
 * of the whole comparison ("2020-2025, peer-reviewed only"), not what
 * distinguishes one query set from another.
 */
export function GlobalFilterBar({
  value,
  onChange,
}: {
  value: GlobalFilter;
  onChange: (patch: Partial<GlobalFilter>) => void;
}) {
  const { messages } = useLanguage();
  const t = messages.compare;

  const [itemTypeOptions, setItemTypeOptions] = useState<ItemTypeOption[]>([]);
  const excludedKey = JSON.stringify(value.excludedItemTypes);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/facets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: [],
        tagMode: "AND",
        authors: [],
        authorMode: "OR",
        excludedItemTypes: value.excludedItemTypes,
        dateFrom: value.dateFrom || null,
        dateTo: value.dateTo || null,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setItemTypeOptions(d.itemTypes ?? []);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludedKey, value.dateFrom, value.dateTo]);

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <label className="block text-xs font-medium text-zinc-500">{t.yearLabel}</label>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <input
          type="date"
          value={value.dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value })}
          className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-zinc-500">–</span>
        <input
          type="date"
          value={value.dateTo}
          onChange={(e) => onChange({ dateTo: e.target.value })}
          className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          disabled={!value.dateFrom}
          onClick={() => onChange({ dateTo: spanEndFromIsoDate(value.dateFrom, 1, "month") })}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {t.plusOneMonth}
        </button>
        <button
          type="button"
          disabled={!value.dateFrom}
          onClick={() => onChange({ dateTo: spanEndFromIsoDate(value.dateFrom, 1, "year") })}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {t.plusOneYear}
        </button>
      </div>

      <label className="mt-3 block text-xs font-medium text-zinc-500">{t.itemTypesLabel}</label>
      <div className="mt-1">
        <ItemTypeFilter
          options={itemTypeOptions}
          excluded={value.excludedItemTypes}
          onChange={(excludedItemTypes) => onChange({ excludedItemTypes })}
        />
      </div>
    </div>
  );
}
