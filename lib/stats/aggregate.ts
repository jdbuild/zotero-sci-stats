import { connectToDatabase } from "@/lib/db/mongodb";
import { Item } from "@/lib/db/models/Item";
import { toAPAParts, type APACitationParts } from "@/lib/citations/apa";
import type { ZoteroItemData } from "@/lib/zotero/types";

const ITEM_LIST_CAP = 150;
const FACET_MIN_COUNT = 2;

/** The filterable fields shared by a query set and a facet lookup. */
export interface MatchFilter {
  tags: string[];
  tagMode: "AND" | "OR";
  authors?: string[];
  authorMode?: "AND" | "OR";
  /** Item types the user unchecked. Empty/absent = every type included. */
  excludedItemTypes?: string[];
  /** ISO "YYYY-MM-DD", day-precision range against publicationDate. */
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface QuerySetInput extends MatchFilter {
  id: string;
  name: string;
}

export interface QuerySetStats {
  id: string;
  name: string;
  total: number;
  byYear: { year: number; count: number }[];
  byItemType: { itemType: string; count: number }[];
  items: APACitationParts[];
  itemsTruncated: boolean;
}

/** Exported so lib/stats/network.ts can build the same match without duplicating the logic. */
export function buildItemMatch(libraryId: string, q: MatchFilter) {
  const match: Record<string, unknown> = { libraryId };

  if (q.tags.length > 0) {
    match.tags = q.tagMode === "AND" ? { $all: q.tags } : { $in: q.tags };
  }

  const authors = q.authors ?? [];
  if (authors.length > 0) {
    match.creatorNames = (q.authorMode ?? "OR") === "AND" ? { $all: authors } : { $in: authors };
  }

  const excludedItemTypes = q.excludedItemTypes ?? [];
  if (excludedItemTypes.length > 0) {
    match.itemType = { $nin: excludedItemTypes };
  }

  if (q.dateFrom || q.dateTo) {
    const range: Record<string, Date> = {};
    if (q.dateFrom) range.$gte = isoDayToUtcDate(q.dateFrom);
    if (q.dateTo) range.$lte = isoDayToUtcDate(q.dateTo);
    match.publicationDate = range;
  }

  return match;
}

/** "YYYY-MM-DD" -> UTC midnight, matching how publicationDate is stored. */
function isoDayToUtcDate(isoDay: string): Date {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function computeQuerySetStats(
  libraryId: string,
  querySets: QuerySetInput[]
): Promise<QuerySetStats[]> {
  await connectToDatabase();

  return Promise.all(
    querySets.map(async (q) => {
      const match = buildItemMatch(libraryId, q);

      const [byYear, byItemType, total, rawItems] = await Promise.all([
        Item.aggregate([
          { $match: match },
          { $match: { publicationYear: { $ne: null } } },
          { $group: { _id: "$publicationYear", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Item.aggregate([
          { $match: match },
          { $group: { _id: "$itemType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Item.countDocuments(match),
        Item.find(match)
          .sort({ publicationYear: -1, title: 1 })
          .limit(ITEM_LIST_CAP)
          .select({ title: 1, itemType: 1, date: 1, publicationYear: 1, raw: 1 })
          .lean(),
      ]);

      const items = rawItems.map((doc) =>
        toAPAParts({
          itemType: doc.itemType as string,
          title: doc.title as string,
          publicationYear: (doc.publicationYear as number | null) ?? null,
          date: doc.date as string,
          raw: (doc.raw ?? {}) as ZoteroItemData,
        })
      );

      return {
        id: q.id,
        name: q.name,
        total,
        byYear: byYear.map((r) => ({ year: r._id as number, count: r.count as number })),
        byItemType: byItemType.map((r) => ({ itemType: r._id as string, count: r.count as number })),
        items,
        itemsTruncated: total > items.length,
      };
    })
  );
}

export interface Facets {
  tags: string[];
  authors: string[];
  itemTypes: { itemType: string; count: number }[];
}

async function rankedValuesForMatch(
  match: Record<string, unknown>,
  field: string,
  minCount: number
): Promise<string[]> {
  const results = await Item.aggregate([
    { $match: match },
    { $unwind: `$${field}` },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $match: { count: { $gte: minCount } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  return results.map((r) => r._id as string);
}

/**
 * Tag/author/item-type options scoped to the *other* currently active
 * filters of a query set - the dropdowns should narrow down together
 * with the chart, not stay static once something is filtered. Each facet
 * excludes its own field from the match it runs against (so picking a
 * tag doesn't hide itself from the tag list, and "what item types remain"
 * ignores the item-type selection itself), but keeps every other filter -
 * **except the date range**, deliberately: tags/authors/types are a
 * library-wide vocabulary, not something that should appear or vanish as
 * you adjust dates. A value legitimately having zero matches for the
 * current date range is a fact the results/count show, not a reason to
 * remove it from the suggestion list.
 */
export async function computeFacets(libraryId: string, filter: MatchFilter): Promise<Facets> {
  await connectToDatabase();

  const noDateFilter = { ...filter, dateFrom: undefined, dateTo: undefined };
  const matchForTags = buildItemMatch(libraryId, { ...noDateFilter, tags: [] });
  const matchForAuthors = buildItemMatch(libraryId, { ...noDateFilter, authors: [] });
  const matchForItemTypes = buildItemMatch(libraryId, { ...noDateFilter, excludedItemTypes: [] });

  const [tags, authors, itemTypeCounts] = await Promise.all([
    rankedValuesForMatch(matchForTags, "tags", FACET_MIN_COUNT),
    rankedValuesForMatch(matchForAuthors, "creatorNames", FACET_MIN_COUNT),
    Item.aggregate([
      { $match: matchForItemTypes },
      { $group: { _id: "$itemType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    tags,
    authors,
    itemTypes: itemTypeCounts.map((r) => ({ itemType: r._id as string, count: r.count as number })),
  };
}

/** Current on-disk size of the cached items for this library, in bytes. */
export async function getCacheSizeBytes(libraryId: string): Promise<number> {
  await connectToDatabase();
  const result = await Item.aggregate([
    { $match: { libraryId } },
    { $group: { _id: null, totalBytes: { $sum: { $bsonSize: "$$ROOT" } } } },
  ]);
  return result[0]?.totalBytes ?? 0;
}
