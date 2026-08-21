import { connectToDatabase } from "@/lib/db/mongodb";
import { Item } from "@/lib/db/models/Item";
import { toAPAParts, type APACitationParts } from "@/lib/citations/apa";
import { buildItemMatch, type MatchFilter } from "@/lib/stats/aggregate";
import type { ZoteroItemData } from "@/lib/zotero/types";

const OVERLAP_ITEM_CAP = 100;

export interface NetworkNodeInput extends MatchFilter {
  id: string;
  name: string;
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

export interface NetworkEdge {
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  count: number;
  items: APACitationParts[];
  itemsTruncated: boolean;
}

export interface Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
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

  for (const q of querySets) {
    const match = buildItemMatch(libraryId, q);
    const docs = await Item.find(match).select({ zoteroKey: 1 }).lean();
    const keys = new Set(docs.map((d) => d.zoteroKey as string));
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

      edges.push({
        sourceId: a.id,
        targetId: b.id,
        sourceName: a.name,
        targetName: b.name,
        count: overlapKeys.length,
        items,
        itemsTruncated: overlapKeys.length > items.length,
      });
    }
  }

  edges.sort((x, y) => y.count - x.count);

  return { nodes, edges };
}
