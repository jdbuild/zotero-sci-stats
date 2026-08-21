import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { Item } from "@/lib/db/models/Item";
import { SyncNotConfiguredError } from "@/lib/zotero/sync";
import { creatorNames } from "@/lib/zotero/creators";
import { parsePublicationDate, parsePublicationYear } from "@/lib/zotero/parseDate";
import type { ZoteroItemData } from "@/lib/zotero/types";

const BATCH_SIZE = 500;

/**
 * Recomputes derived fields (creatorNames, publicationYear, publicationDate) for every
 * already-synced item, purely from the raw Zotero payload already stored
 * in MongoDB - no Zotero API calls at all.
 *
 * Exists so a new derived field (e.g. the author filter's creatorNames)
 * can be backfilled onto a library that was synced before that field
 * existed, without forcing a full re-sync of a large library.
 */
export async function reprocessDerivedFields(): Promise<{ processed: number }> {
  await connectToDatabase();

  const config = await Config.findOne({ singleton: "config" });
  if (!config?.libraryId) {
    throw new SyncNotConfiguredError();
  }
  const libraryId = config.libraryId;

  const cursor = Item.find({ libraryId }).select({ raw: 1 }).cursor();
  let batch: { updateOne: { filter: { _id: unknown }; update: Record<string, unknown> } }[] = [];
  let processed = 0;

  for await (const doc of cursor) {
    const raw = (doc.get("raw") ?? {}) as ZoteroItemData;
    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            creatorNames: creatorNames(raw.creators),
            publicationYear: parsePublicationYear(raw.date),
            publicationDate: parsePublicationDate(raw.date),
          },
        },
      },
    });
    processed++;

    if (batch.length >= BATCH_SIZE) {
      await Item.bulkWrite(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await Item.bulkWrite(batch);
  }

  return { processed };
}
