"use client";

import type { QuerySetStats } from "@/lib/stats/aggregate";
import { CHART_COLORS } from "./ComparisonChart";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function pct(count: number, columnTotal: number): string {
  if (columnTotal <= 0) return "0%";
  return `${Math.round((count / columnTotal) * 100)}%`;
}

/**
 * Percentages are per-column, not per-row: each column (Total hits, and
 * every item type) sums to 100% down the query sets, and a cell shows
 * that query set's *share of the column*, not what fraction of its own
 * row the cell represents. The Total row is therefore always 100% by
 * construction and shown as plain counts, not repeated as "(100%)".
 */
export function ComparisonTable({ stats }: { stats: QuerySetStats[] }) {
  const { messages } = useLanguage();
  const t = messages.compare;
  const itemTypes = new Set<string>();
  for (const s of stats) for (const it of s.byItemType) itemTypes.add(it.itemType);
  const sortedTypes = Array.from(itemTypes).sort();

  const grandTotal = stats.reduce((sum, s) => sum + s.total, 0);
  const columnTotals = sortedTypes.map((type) =>
    stats.reduce((sum, s) => sum + (s.byItemType.find((it) => it.itemType === type)?.count ?? 0), 0)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
            <th className="py-2 pr-4">{t.querySetColumn}</th>
            <th className="py-2 pr-4">{t.totalHits}</th>
            {sortedTypes.map((type) => (
              <th key={type} className="py-2 pr-4 font-normal text-zinc-500">
                {type}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 pr-4 font-medium">
                <span
                  className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                {s.name}
              </td>
              <td className="py-2 pr-4">
                {s.total} <span className="text-xs text-zinc-400 dark:text-zinc-500">({pct(s.total, grandTotal)})</span>
              </td>
              {sortedTypes.map((type, idx) => {
                const count = s.byItemType.find((it) => it.itemType === type)?.count ?? 0;
                return (
                  <td key={type} className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                    {count}{" "}
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      ({pct(count, columnTotals[idx])})
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-300 font-medium dark:border-zinc-700">
            <td className="py-2 pr-4">{t.totalRowLabel}</td>
            <td className="py-2 pr-4">{grandTotal}</td>
            {sortedTypes.map((type, idx) => (
              <td key={type} className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                {columnTotals[idx]}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
