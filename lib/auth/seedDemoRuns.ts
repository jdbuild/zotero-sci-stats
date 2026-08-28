import { Config } from "@/lib/db/models/Config";
import { ComparisonRun } from "@/lib/db/models/ComparisonRun";
import { NetworkRun } from "@/lib/db/models/NetworkRun";
import { computeQuerySetStats, type QuerySetInput } from "@/lib/stats/aggregate";

const DEMO_COMPARE_TAGS = ["CDHSI", "IGW"];

/**
 * Gives a newly created member two demo saved runs instead of an empty
 * history: a simple CDHSI vs. IGW Tag Compare, and a copy of the most
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

  const querySets: QuerySetInput[] = DEMO_COMPARE_TAGS.map((tag) => ({
    id: crypto.randomUUID(),
    name: tag,
    tags: [tag],
    tagMode: "AND",
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
