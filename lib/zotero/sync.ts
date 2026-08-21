import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { Item } from "@/lib/db/models/Item";
import { SyncMeta } from "@/lib/db/models/SyncMeta";
import { getDeleted, getItemsPage } from "@/lib/zotero/client";
import { creatorNames } from "@/lib/zotero/creators";
import { parsePublicationDate, parsePublicationYear } from "@/lib/zotero/parseDate";
import type { ZoteroItemResponse, ZoteroLibraryType } from "@/lib/zotero/types";

export class SyncNotConfiguredError extends Error {
  constructor() {
    super("No Zotero library is configured yet. Set it up on the Settings page first.");
    this.name = "SyncNotConfiguredError";
  }
}

function toItemDocument(libraryId: string, item: ZoteroItemResponse) {
  const d = item.data;
  return {
    zoteroKey: item.key,
    libraryId,
    version: item.version,
    itemType: d.itemType,
    title: d.title ?? "",
    creators: d.creators ?? [],
    creatorNames: creatorNames(d.creators),
    date: d.date ?? "",
    publicationYear: parsePublicationYear(d.date),
    publicationDate: parsePublicationDate(d.date),
    dateAdded: d.dateAdded ? new Date(d.dateAdded) : undefined,
    dateModified: d.dateModified ? new Date(d.dateModified) : undefined,
    tags: (d.tags ?? []).map((t) => t.tag),
    collections: d.collections ?? [],
    publicationTitle: d.publicationTitle ?? "",
    url: d.url ?? "",
    abstractNote: d.abstractNote ?? "",
    raw: d,
  };
}

export interface SyncResult {
  itemCount: number;
  version: number;
  durationMs: number;
  bytesSynced: number;
  added: number;
  updated: number;
  deleted: number;
}

/**
 * Runs a full or incremental sync for the currently configured library.
 * Only ever issues GET requests to Zotero (see lib/zotero/client.ts).
 *
 * Reliability: all pages for this run are fetched and upserted first;
 * SyncMeta.lastVersion only advances after every page succeeded, so a
 * failed run never leaves the "since" checkpoint in an inconsistent
 * state - the next attempt simply retries the same (idempotent) window.
 */
export async function runSync(): Promise<SyncResult> {
  await connectToDatabase();

  const config = await Config.findOne({ singleton: "config" });
  if (!config?.zoteroApiKey || !config.libraryId || !config.libraryType) {
    throw new SyncNotConfiguredError();
  }

  const { zoteroApiKey: apiKey, libraryId, libraryType } = config;
  const libType = libraryType as ZoteroLibraryType;

  let meta = await SyncMeta.findOne({ libraryId });
  if (!meta) {
    meta = await SyncMeta.create({ libraryId, libraryType: libType, lastVersion: 0 });
  }

  await SyncMeta.updateOne({ libraryId }, { status: "syncing", lastError: "" });

  const sinceVersion = meta.lastVersion > 0 ? meta.lastVersion : undefined;
  const startedAt = Date.now();

  try {
    let start = 0;
    let totalResults = Infinity;
    let maxVersion = meta.lastVersion;
    let bytesSynced = 0;
    const upserts: ReturnType<typeof toItemDocument>[] = [];

    while (start < totalResults) {
      const page = await getItemsPage(apiKey, libType, libraryId, start, sinceVersion);
      totalResults = page.totalResults;
      maxVersion = Math.max(maxVersion, page.libraryVersion);
      bytesSynced += Buffer.byteLength(JSON.stringify(page.items));

      for (const item of page.items) {
        if (item.data.deleted) continue;
        upserts.push(toItemDocument(libraryId, item));
      }

      start += page.items.length;
      if (page.items.length === 0) break; // safety net against infinite loops
    }

    let added = 0;
    let updated = 0;
    if (upserts.length > 0) {
      const result = await Item.bulkWrite(
        upserts.map((doc) => ({
          updateOne: {
            filter: { zoteroKey: doc.zoteroKey },
            update: { $set: doc },
            upsert: true,
          },
        }))
      );
      added = result.upsertedCount ?? 0;
      updated = result.modifiedCount ?? 0;
    }

    // Incremental syncs must also remove items deleted upstream.
    let deletedCount = 0;
    if (sinceVersion !== undefined) {
      const deleted = await getDeleted(apiKey, libType, libraryId, sinceVersion);
      if (deleted.items.length > 0) {
        const result = await Item.deleteMany({ libraryId, zoteroKey: { $in: deleted.items } });
        deletedCount = result.deletedCount ?? deleted.items.length;
      }
    }

    const itemCount = await Item.countDocuments({ libraryId });
    const durationMs = Date.now() - startedAt;

    await SyncMeta.updateOne(
      { libraryId },
      {
        status: "idle",
        lastVersion: maxVersion,
        lastSyncedAt: new Date(),
        itemCount,
        lastError: "",
        durationMs,
        bytesSynced,
        lastRun: { added, updated, deleted: deletedCount },
      }
    );

    return { itemCount, version: maxVersion, durationMs, bytesSynced, added, updated, deleted: deletedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await SyncMeta.updateOne({ libraryId }, { status: "error", lastError: message });
    throw err;
  }
}

export async function getSyncStatus() {
  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" });
  if (!config?.libraryId) return null;
  return SyncMeta.findOne({ libraryId: config.libraryId }).lean();
}
