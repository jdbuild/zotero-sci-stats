import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { computeFacets, type MatchFilter } from "@/lib/stats/aggregate";
import { isPeerReviewed, itemTypeLabel } from "@/lib/zotero/itemTypes";

/**
 * Tag/author/item-type suggestions for the Compare page, scoped to a
 * query set's *other* currently active filters - so narrowing by, say,
 * item type also narrows the tag and author dropdowns, matching the
 * chart/table instead of always listing the whole library.
 */
export async function POST(request: Request) {
  const filter = ((await request.json()) ?? {}) as Partial<MatchFilter>;

  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) {
    return NextResponse.json({ tags: [], authors: [], itemTypes: [] });
  }

  const facets = await computeFacets(config.libraryId, {
    tags: filter.tags ?? [],
    tagMode: filter.tagMode ?? "AND",
    authors: filter.authors ?? [],
    authorMode: filter.authorMode ?? "OR",
    excludedItemTypes: filter.excludedItemTypes ?? [],
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  });

  return NextResponse.json({
    tags: facets.tags,
    authors: facets.authors,
    itemTypes: facets.itemTypes.map((c) => ({
      itemType: c.itemType,
      label: itemTypeLabel(c.itemType),
      count: c.count,
      peerReviewed: isPeerReviewed(c.itemType),
    })),
  });
}
