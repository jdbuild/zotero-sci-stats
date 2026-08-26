"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuerySetStats } from "@/lib/stats/aggregate";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

// 12 colors so up to a dozen query sets/nodes stay visually distinguishable
// (the first 6 are unchanged from before, so anything with <=6 sets looks
// exactly as it always has - the rest fill the largest remaining hue gaps).
export const CHART_COLORS = [
  "#dc2f36", // red
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#65a30d", // lime
  "#db2777", // pink
  "#c026d3", // fuchsia
  "#4f46e5", // indigo
  "#0d9488", // teal
  "#92400e", // brown
];

export function ComparisonChart({ stats }: { stats: QuerySetStats[] }) {
  const { messages } = useLanguage();
  const years = new Set<number>();
  for (const s of stats) for (const y of s.byYear) years.add(y.year);
  const sortedYears = Array.from(years).sort((a, b) => a - b);

  const data = sortedYears.map((year) => {
    const row: Record<string, number> = { year };
    for (const s of stats) {
      row[s.name] = s.byYear.find((y) => y.year === year)?.count ?? 0;
    }
    return row;
  });

  if (sortedYears.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">{messages.compare.noYearData}</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {stats.map((s, i) => (
            <Bar key={s.id} dataKey={s.name} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
