import { Config } from "@/lib/db/models/Config";
import { ComparisonRun } from "@/lib/db/models/ComparisonRun";
import { NetworkRun } from "@/lib/db/models/NetworkRun";
import { computeQuerySetStats, type QuerySetInput } from "@/lib/stats/aggregate";

const DEMO_COMPARE_DATE_FROM = "2025-01-01";
const DEMO_COMPARE_DATE_TO = "2025-12-31";

/** Which two tags the demo comparison uses - deliberately not hardcoded in
 * source (this repo is public; the actual tag names identify real
 * organizational units in whoever's deployment this is). Configure via
 * DEMO_TAG_1/DEMO_TAG_1_LABEL and DEMO_TAG_2/DEMO_TAG_2_LABEL in
 * .env.local (git-ignored). Unset - either pair, or both - means fewer
 * demo runs, not an error; see seedDemoRunsForUser's own doc comment. */
function getDemoCompareTags(): { name: string; tag: string }[] {
  const pairs: [string | undefined, string | undefined][] = [
    [process.env.DEMO_TAG_1_LABEL, process.env.DEMO_TAG_1],
    [process.env.DEMO_TAG_2_LABEL, process.env.DEMO_TAG_2],
  ];
  return pairs
    .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1]))
    .map(([name, tag]) => ({ name, tag }));
}

/**
 * Gives a newly created member two demo saved runs instead of an empty
 * history: a two-tag Tag Compare for 2025 (tags configured via
 * DEMO_TAG_1/DEMO_TAG_2 env vars - see getDemoCompareTags), and a copy of
 * the most recent Tag NetworkVis run (whatever institutes/filters were
 * last built - typically the fullest, most representative network so
 * far). The copy is independent of the original - deleting one never
 * affects the other.
 *
 * Best-effort: a library that isn't configured yet, demo tags that aren't
 * configured, or no saved network run yet, just mean fewer demo runs -
 * this must never block member creation itself, so callers should wrap
 * it in try/catch.
 */
export async function seedDemoRunsForUser(userId: string): Promise<void> {
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) return;
  const libraryId = config.libraryId;

  const demoCompareTags = getDemoCompareTags();
  if (demoCompareTags.length > 0) {
    const querySets: QuerySetInput[] = demoCompareTags.map(({ name, tag }) => ({
      id: crypto.randomUUID(),
      name,
      tags: [tag],
      tagMode: "AND",
      dateFrom: DEMO_COMPARE_DATE_FROM,
      dateTo: DEMO_COMPARE_DATE_TO,
    }));
    const stats = await computeQuerySetStats(libraryId, querySets);
    await ComparisonRun.create({ libraryId, querySets, stats, userId });
  }

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
