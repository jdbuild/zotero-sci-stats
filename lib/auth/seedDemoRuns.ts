import { Config } from "@/lib/db/models/Config";
import { ComparisonRun } from "@/lib/db/models/ComparisonRun";
import { NetworkRun } from "@/lib/db/models/NetworkRun";
import { computeQuerySetStats, type QuerySetInput } from "@/lib/stats/aggregate";

const DEMO_COMPARE_QUERY_SETS: { name: string; tag: string }[] = [
  { name: "Center for Digital Health and Social Innovation", tag: "CDHSI" },
  { name: "Institut für Gesundheitswissenschaften", tag: "IGW" },
];
const DEMO_COMPARE_DATE_FROM = "2025-01-01";
const DEMO_COMPARE_DATE_TO = "2025-12-31";

/**
 * Gives a newly created member two demo saved runs instead of an empty
 * history: a CDHSI vs. IGW Tag Compare for 2025, and a copy of the most
 * recent Tag NetworkVis run (whatever institutes/filters were last built
 * - typically the fullest, most representative network so far). The copy
 * is independent of the original - deleting one never affects the other.
 *
 * Best-effort: a library that isn't configured yet, or has no saved
 * network run yet, just means fewer demo runs - this must never block
 * member creation itself, so callers should wrap it in try/catch.
 */
export async function seedDemoRunsForUser(userId: string): Promise<void> {
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) return;
  const libraryId = config.libraryId;

  const querySets: QuerySetInput[] = DEMO_COMPARE_QUERY_SETS.map(({ name, tag }) => ({
    id: crypto.randomUUID(),
    name,
    tags: [tag],
    tagMode: "AND",
    dateFrom: DEMO_COMPARE_DATE_FROM,
    dateTo: DEMO_COMPARE_DATE_TO,
  }));
  const stats = await computeQuerySetStats(libraryId, querySets);
  await ComparisonRun.create({ libraryId, querySets, stats, userId });

  const lastNetworkRun = await NetworkRun.findOne({ libraryId }).sort({ createdAt: -1 }).lean();
  if (lastNetworkRun) {
    await NetworkRun.create({
      libraryId,
      querySets: lastNetworkRun.querySets,
      network: lastNetworkRun.network,
      userId,
    });
  }
}
