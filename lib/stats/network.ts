import { connectToDatabase } from "@/lib/db/mongodb";
import { Item } from "@/lib/db/models/Item";
import { toAPAParts, type APACitationParts } from "@/lib/citations/apa";
import { buildItemMatch, type MatchFilter } from "@/lib/stats/aggregate";
import { authorNamesInOrder } from "@/lib/zotero/creators";
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

/** Method 2: byline-position "medal table" scoring, summed per side. */
export interface MedalRaceResult {
  sourcePoints: number;
  targetPoints: number;
  sourceGold: number;
  sourceSilver: number;
  sourceBronze: number;
  targetGold: number;
  targetSilver: number;
  targetBronze: number;
  /** Overlap items where sourcePoints > targetPoints for that item. */
  sourceWins: number;
  targetWins: number;
  /** Equal points, both > 0. */
  ties: number;
  /** Equal points, both 0 - neither side has any roster member on the byline. */
  unassigned: number;
  /** Per-person medal tally behind each side's aggregate totals above, strongest first. */
  sourceMedalists: MedalistCount[];
  targetMedalists: MedalistCount[];
  /** Who's actually first-authoring the unassigned items - neither side has anyone on the byline. */
  unassignedFirstAuthors: NamedCount[];
}

export interface MedalistCount {
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  points: number;
}

/** Method 1: whichever side's earliest roster member appears first in the byline gets the whole item. */
export interface InitiatorResult {
  sourceWins: number;
  targetWins: number;
  /** No roster member from either side on the byline, or a tie (the
   * earliest roster member is on both rosters at once - a declared
   * "shared" person). */
  unassigned: number;
  /**
   * The byline's true earliest tracked author belongs to some *other*
   * node's roster - not source, not target - so neither side gets credit.
   * Only possible with 3+ nodes in the network; without checking every
   * node's roster (not just this pair's), that earlier third-party author
   * would otherwise be invisible and the item could get wrongly credited
   * to whichever of source/target merely happens to appear first *among
   * just those two* rosters.
   */
  otherQuerySet: number;
  /**
   * Who's actually first-authoring the unassigned items - not on any
   * roster, or the earliest tracked name but shared between both compared
   * rosters. Sorted strongest first, so the most common untracked name is
   * the obvious "maybe add them to a roster" candidate.
   */
  unassignedFirstAuthors: NamedCount[];
  /** Which other node (and which of its members) is actually behind the `otherQuerySet` items. */
  otherQuerySetBreakdown: { nodeId: string; nodeName: string; name: string; count: number }[];
  /** Who was actually the earliest tracked author behind each side's credited items, strongest first. */
  sourceCredited: NamedCount[];
  targetCredited: NamedCount[];
}

export interface NamedCount {
  name: string;
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
  initiator: InitiatorResult;
  medalRace: MedalRaceResult;
}

export interface Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

type MedalTier = "gold" | "silver" | "bronze";

/** Which tier a 1-based author position earns out of N total authors, per
 * the medal spec: gold=first, silver=first-co-author-or-last, bronze=any
 * position strictly between those two, no medal for N=0. */
function medalTier(position1Based: number, n: number): MedalTier | null {
  if (position1Based === 1) return "gold";
  if (n >= 2 && (position1Based === 2 || position1Based === n)) return "silver";
  if (n >= 3 && position1Based > 2 && position1Based < n) return "bronze";
  return null;
}

function tierPoints(tier: MedalTier): number {
  return tier === "gold" ? 3 : tier === "silver" ? 2 : 1;
}

const NO_AUTHOR_PLACEHOLDER = "(no author)";

/**
 * Method 2, "medal race": for each overlap item, every byline position
 * earns a gold/silver/bronze tier by the spec above; a position's medal
 * goes to whichever roster(s) that author is declared on (both, if
 * declared on both - a shared person scores for both sides on that item,
 * not neither). Per item, whichever side has more points wins it; tallied
 * across the full overlap for the edge-level table.
 */
function computeMedalRace(
  overlapKeys: string[],
  keyToAuthorOrder: Map<string, string[]>,
  sourceMembers: string[] | undefined,
  targetMembers: string[] | undefined
): MedalRaceResult {
  const sourceSet = new Set(sourceMembers ?? []);
  const targetSet = new Set(targetMembers ?? []);

  const result: MedalRaceResult = {
    sourcePoints: 0,
    targetPoints: 0,
    sourceGold: 0,
    sourceSilver: 0,
    sourceBronze: 0,
    targetGold: 0,
    targetSilver: 0,
    targetBronze: 0,
    sourceWins: 0,
    targetWins: 0,
    ties: 0,
    unassigned: 0,
    sourceMedalists: [],
    targetMedalists: [],
    unassignedFirstAuthors: [],
  };

  const tierCountKey = { gold: "Gold", silver: "Silver", bronze: "Bronze" } as const;
  const sourceMedalists = new Map<string, MedalistCount>();
  const targetMedalists = new Map<string, MedalistCount>();
  const unassignedCounts = new Map<string, number>();

  function credit(map: Map<string, MedalistCount>, name: string, tier: MedalTier, points: number) {
    const entry = map.get(name) ?? { name, gold: 0, silver: 0, bronze: 0, points: 0 };
    entry[tier]++;
    entry.points += points;
    map.set(name, entry);
  }

  for (const key of overlapKeys) {
    const authors = keyToAuthorOrder.get(key) ?? [];
    const n = authors.length;
    let itemSource = 0;
    let itemTarget = 0;
    authors.forEach((name, idx) => {
      const tier = medalTier(idx + 1, n);
      if (!tier) return;
      const points = tierPoints(tier);
      if (sourceSet.has(name)) {
        itemSource += points;
        result[`source${tierCountKey[tier]}`]++;
        credit(sourceMedalists, name, tier, points);
      }
      if (targetSet.has(name)) {
        itemTarget += points;
        result[`target${tierCountKey[tier]}`]++;
        credit(targetMedalists, name, tier, points);
      }
    });

    result.sourcePoints += itemSource;
    result.targetPoints += itemTarget;
    if (itemSource > itemTarget) result.sourceWins++;
    else if (itemTarget > itemSource) result.targetWins++;
    else if (itemSource > 0) result.ties++;
    else {
      result.unassigned++;
      const label = authors[0] ?? NO_AUTHOR_PLACEHOLDER;
      unassignedCounts.set(label, (unassignedCounts.get(label) ?? 0) + 1);
    }
  }

  result.sourceMedalists = Array.from(sourceMedalists.values()).sort((a, b) => b.points - a.points);
  result.targetMedalists = Array.from(targetMedalists.values()).sort((a, b) => b.points - a.points);
  result.unassignedFirstAuthors = Array.from(unassignedCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return result;
}

/**
 * Method 1, "initiator": for each overlap item, find the *true* earliest
 * byline position that's tracked by any node's roster in the whole
 * network - not just this pair's two rosters. Whichever side that
 * position belongs to gets the whole item - no partial credit.
 *
 * Checking every node (not just source/target) matters as soon as there
 * are 3+ nodes: a paper first-authored by a third query set's tracked
 * member, with source's and target's tracked members appearing later,
 * would otherwise look to *this pair* like source or target initiated it
 * - whichever of the two happens to appear earlier between themselves -
 * silently misattributing a paper that neither of them actually led.
 */
function computeInitiator(
  overlapKeys: string[],
  keyToAuthorOrder: Map<string, string[]>,
  sourceId: string,
  targetId: string,
  nameToNodeIds: Map<string, Set<string>>,
  nodeNameById: Map<string, string>
): InitiatorResult {
  const result: InitiatorResult = {
    sourceWins: 0,
    targetWins: 0,
    unassigned: 0,
    otherQuerySet: 0,
    unassignedFirstAuthors: [],
    otherQuerySetBreakdown: [],
    sourceCredited: [],
    targetCredited: [],
  };
  const unassignedCounts = new Map<string, number>();
  const otherCounts = new Map<string, { nodeId: string; name: string; count: number }>();
  const sourceCreditedCounts = new Map<string, number>();
  const targetCreditedCounts = new Map<string, number>();

  for (const key of overlapKeys) {
    const authors = keyToAuthorOrder.get(key) ?? [];
    let earliestName: string | undefined;
    let earliestNodeIds: Set<string> | undefined;
    for (const name of authors) {
      const nodeIds = nameToNodeIds.get(name);
      if (nodeIds && nodeIds.size > 0) {
        earliestName = name;
        earliestNodeIds = nodeIds;
        break;
      }
    }

    if (!earliestNodeIds) {
      result.unassigned++;
      const label = authors[0] ?? NO_AUTHOR_PLACEHOLDER;
      unassignedCounts.set(label, (unassignedCounts.get(label) ?? 0) + 1);
      continue;
    }

    const onSource = earliestNodeIds.has(sourceId);
    const onTarget = earliestNodeIds.has(targetId);
    if (onSource && onTarget) {
      result.unassigned++;
      unassignedCounts.set(earliestName!, (unassignedCounts.get(earliestName!) ?? 0) + 1);
    } else if (onSource) {
      result.sourceWins++;
      sourceCreditedCounts.set(earliestName!, (sourceCreditedCounts.get(earliestName!) ?? 0) + 1);
    } else if (onTarget) {
      result.targetWins++;
      targetCreditedCounts.set(earliestName!, (targetCreditedCounts.get(earliestName!) ?? 0) + 1);
    } else {
      result.otherQuerySet++;
      // Usually declared on exactly one other node - if declared on
      // several, just attribute to the first for this breakdown.
      const otherNodeId = [...earliestNodeIds][0];
      const dedupeKey = `${otherNodeId}::${earliestName}`;
      const existing = otherCounts.get(dedupeKey);
      if (existing) existing.count++;
      else otherCounts.set(dedupeKey, { nodeId: otherNodeId, name: earliestName!, count: 1 });
    }
  }

  result.unassignedFirstAuthors = Array.from(unassignedCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  result.otherQuerySetBreakdown = Array.from(otherCounts.values())
    .map((o) => ({ nodeId: o.nodeId, nodeName: nodeNameById.get(o.nodeId) ?? o.nodeId, name: o.name, count: o.count }))
    .sort((a, b) => b.count - a.count);

  result.sourceCredited = Array.from(sourceCreditedCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  result.targetCredited = Array.from(targetCreditedCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return result;
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
  // Author-only (no editors/translators), in Zotero's own byline order -
  // the shared basis for both scoring methods below. Built up alongside
  // each node's own key fetch, so no per-edge query is needed - an item's
  // creators are the same regardless of which node's query surfaced it.
  const keyToAuthorOrder = new Map<string, string[]>();

  for (const q of querySets) {
    const match = buildItemMatch(libraryId, q);
    const docs = await Item.find(match).select({ zoteroKey: 1, creators: 1 }).lean();
    const keys = new Set(docs.map((d) => d.zoteroKey as string));
    for (const d of docs) {
      keyToAuthorOrder.set(d.zoteroKey as string, authorNamesInOrder(d.creators as ZoteroCreator[] | undefined));
    }
    keysBySetId.set(q.id, keys);
    nodes.push({ id: q.id, name: q.name, total: keys.size, collabTotal: 0 });
  }

  // Every declared roster name -> the set of node ids that declared it,
  // across the *whole* network (not scoped to any one pair) - this is
  // what lets the "initiator" method see a third node's roster member
  // even when computing a completely different pair's edge. Rosters are
  // small, human-curated lists, so this is cheap regardless of N.
  const nameToNodeIds = new Map<string, Set<string>>();
  for (const q of querySets) {
    for (const name of q.members ?? []) {
      if (!nameToNodeIds.has(name)) nameToNodeIds.set(name, new Set());
      nameToNodeIds.get(name)!.add(q.id);
    }
  }
  const nodeNameById = new Map(querySets.map((q) => [q.id, q.name]));

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
        initiator: computeInitiator(overlapKeys, keyToAuthorOrder, a.id, b.id, nameToNodeIds, nodeNameById),
        medalRace: computeMedalRace(overlapKeys, keyToAuthorOrder, a.members, b.members),
      });
    }
  }

  edges.sort((x, y) => y.count - x.count);

  return { nodes, edges };
}
