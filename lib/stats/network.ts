import { connectToDatabase } from "@/lib/db/mongodb";
import { Item } from "@/lib/db/models/Item";
import { toAPAParts, type APACitationParts } from "@/lib/citations/apa";
import { buildItemMatch, type MatchFilter } from "@/lib/stats/aggregate";
import { firstAuthorName } from "@/lib/zotero/creators";
import type { ZoteroCreator, ZoteroItemData } from "@/lib/zotero/types";

const OVERLAP_ITEM_CAP = 100;

export interface NetworkNodeInput extends MatchFilter {
  id: string;
  name: string;
  /**
   * Names to attribute overlap items to - purely informational, never
   * narrows which items belong to this node (that's still `tags`/
   * `authors` above). Lets you declare e.g. "these people are members of
   * this tag's group" so edges can show who's actually behind a given
   * pairwise overlap, without changing what the node itself counts as.
   */
  members?: string[];
}

export interface NetworkNode {
  id: string;
  name: string;
  total: number;
  /**
   * Count of *distinct* items in this node's own set that also appear in
   * at least one other set - an item shared with several other sets at
   * once still counts once, unlike summing every edge's overlap count
   * (which double/triple-counts an item tagged into 3+ sets).
   */
  collabTotal: number;
}

export interface EdgeContributor {
  name: string;
  /** "shared" = declared a member of both nodes' rosters, not picked arbitrarily. */
  side: "source" | "target" | "shared";
  /** How many of this edge's overlap items include this person as a creator. */
  count: number;
}

export interface NetworkEdge {
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  count: number;
  items: APACitationParts[];
  itemsTruncated: boolean;
  /** Breakdown of the full (uncapped) overlap by declared roster member, strongest first. */
  contributors: EdgeContributor[];
  /**
   * Same idea as `contributors`, but only counting an item toward someone
   * if they're specifically its *first* author - "who originated this",
   * not just "who's on it". `side: "shared"` items (first author declared
   * on both rosters) are deliberately excluded from a clean single-side
   * claim.
   */
  originators: EdgeContributor[];
  /** Overlap items whose first author matched neither roster (or had none identifiable). */
  untrackedOriginCount: number;
}

export interface Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

/**
 * Breaks down an edge's *full* (uncapped) overlap by declared roster
 * member. A name declared on both sides is labelled "shared" rather than
 * attributed to one side or double-counted under both.
 */
function computeContributors(
  overlapKeys: string[],
  keyToCreatorNames: Map<string, string[]>,
  sourceMembers: string[] | undefined,
  targetMembers: string[] | undefined
): EdgeContributor[] {
  const sourceSet = new Set(sourceMembers ?? []);
  const targetSet = new Set(targetMembers ?? []);
  if (sourceSet.size === 0 && targetSet.size === 0) return [];

  const counts = new Map<string, number>();
  for (const key of overlapKeys) {
    const creators = keyToCreatorNames.get(key) ?? [];
    for (const name of creators) {
      if (sourceSet.has(name) || targetSet.has(name)) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      side: (sourceSet.has(name) && targetSet.has(name)
        ? "shared"
        : sourceSet.has(name)
          ? "source"
          : "target") as EdgeContributor["side"],
      count,
    }))
    .sort((x, y) => y.count - x.count);
}

/**
 * Like `computeContributors`, but only credits an item's *first* author
 * (Zotero's own creator order, first `creatorType: "author"` entry) -
 * "who originated this", not just "who's on it". Items whose first author
 * isn't on either roster (or has none identifiable) are tallied
 * separately rather than silently dropped, so the counts stay honest
 * about what wasn't attributable.
 */
function computeOriginators(
  overlapKeys: string[],
  keyToFirstAuthor: Map<string, string | null>,
  sourceMembers: string[] | undefined,
  targetMembers: string[] | undefined
): { originators: EdgeContributor[]; untrackedOriginCount: number } {
  const sourceSet = new Set(sourceMembers ?? []);
  const targetSet = new Set(targetMembers ?? []);

  const counts = new Map<string, number>();
  let untracked = 0;
  for (const key of overlapKeys) {
    const author = keyToFirstAuthor.get(key);
    if (!author || (!sourceSet.has(author) && !targetSet.has(author))) {
      untracked++;
      continue;
    }
    counts.set(author, (counts.get(author) ?? 0) + 1);
  }

  const originators = Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      side: (sourceSet.has(name) && targetSet.has(name)
        ? "shared"
        : sourceSet.has(name)
          ? "source"
          : "target") as EdgeContributor["side"],
      count,
    }))
    .sort((x, y) => y.count - x.count);

  return { originators, untrackedOriginCount: untracked };
}

/**
 * For every pair of query sets, how many publications match *both* -
 * i.e. how strong the "bond" between them is. With N sets this produces
 * N*(N-1)/2 edges (every pair exactly once), sorted strongest first.
 *
 * Each set's matching item keys are fetched once; pairwise overlaps are
 * then plain Set intersections in memory rather than N^2 separate
 * database queries - cheap even for a dozen-ish query sets.
 */
export async function computeNetwork(libraryId: string, querySets: NetworkNodeInput[]): Promise<Network> {
  await connectToDatabase();

  const keysBySetId = new Map<string, Set<string>>();
  const nodes: NetworkNode[] = [];
  // Built up alongside each node's own key fetch, so the per-edge
  // contributor/originator breakdown never needs an extra query - an
  // item's creators are the same regardless of which node's query
  // happened to surface it.
  const keyToCreatorNames = new Map<string, string[]>();
  const keyToFirstAuthor = new Map<string, string | null>();

  for (const q of querySets) {
    const match = buildItemMatch(libraryId, q);
    const docs = await Item.find(match).select({ zoteroKey: 1, creatorNames: 1, creators: 1 }).lean();
    const keys = new Set(docs.map((d) => d.zoteroKey as string));
    for (const d of docs) {
      const key = d.zoteroKey as string;
      keyToCreatorNames.set(key, (d.creatorNames as string[] | undefined) ?? []);
      keyToFirstAuthor.set(key, firstAuthorName(d.creators as ZoteroCreator[] | undefined));
    }
    keysBySetId.set(q.id, keys);
    nodes.push({ id: q.id, name: q.name, total: keys.size, collabTotal: 0 });
  }

  for (const node of nodes) {
    const keys = keysBySetId.get(node.id) ?? new Set<string>();
    let count = 0;
    for (const k of keys) {
      for (const [otherId, otherKeys] of keysBySetId) {
        if (otherId === node.id) continue;
        if (otherKeys.has(k)) {
          count++;
          break;
        }
      }
    }
    node.collabTotal = count;
  }

  const edges: NetworkEdge[] = [];

  for (let i = 0; i < querySets.length; i++) {
    for (let j = i + 1; j < querySets.length; j++) {
      const a = querySets[i];
      const b = querySets[j];
      const keysA = keysBySetId.get(a.id) ?? new Set<string>();
      const keysB = keysBySetId.get(b.id) ?? new Set<string>();
      const overlapKeys = [...keysA].filter((k) => keysB.has(k));

      let items: APACitationParts[] = [];
      if (overlapKeys.length > 0) {
        const docs = await Item.find({ libraryId, zoteroKey: { $in: overlapKeys } })
          .sort({ publicationYear: -1, title: 1 })
          .limit(OVERLAP_ITEM_CAP)
          .select({ title: 1, itemType: 1, date: 1, publicationYear: 1, raw: 1 })
          .lean();
        items = docs.map((doc) =>
          toAPAParts({
            itemType: doc.itemType as string,
            title: doc.title as string,
            publicationYear: (doc.publicationYear as number | null) ?? null,
            date: doc.date as string,
            raw: (doc.raw ?? {}) as ZoteroItemData,
          })
        );
      }

      const { originators, untrackedOriginCount } = computeOriginators(
        overlapKeys,
        keyToFirstAuthor,
        a.members,
        b.members
      );

      edges.push({
        sourceId: a.id,
        targetId: b.id,
        sourceName: a.name,
        targetName: b.name,
        count: overlapKeys.length,
        items,
        itemsTruncated: overlapKeys.length > items.length,
        contributors: computeContributors(overlapKeys, keyToCreatorNames, a.members, b.members),
        originators,
        untrackedOriginCount,
      });
    }
  }

  edges.sort((x, y) => y.count - x.count);

  return { nodes, edges };
}
