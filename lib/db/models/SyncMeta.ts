import { Schema, model, models, type InferSchemaType } from "mongoose";

const SyncMetaSchema = new Schema({
  libraryId: { type: String, required: true, unique: true },
  libraryType: { type: String, enum: ["user", "group"], required: true },

  // Zotero library version as of the last successful sync. Drives the
  // `?since=` incremental sync on the next run.
  lastVersion: { type: Number, default: 0 },
  lastSyncedAt: { type: Date },

  status: {
    type: String,
    enum: ["idle", "syncing", "error"],
    default: "idle",
  },
  lastError: { type: String, default: "" },
  itemCount: { type: Number, default: 0 },

  // How long the most recent sync run took, wall-clock.
  durationMs: { type: Number, default: 0 },
  // Approximate size of the item payloads fetched from Zotero in that run
  // (JSON byte length) - not the same as the current cache size, see
  // lib/stats/aggregate.ts#getCacheSize for the live, always-available figure.
  bytesSynced: { type: Number, default: 0 },

  lastRun: {
    added: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },
  },
});

export type SyncMetaDoc = InferSchemaType<typeof SyncMetaSchema>;

export const SyncMeta = models.SyncMeta ?? model("SyncMeta", SyncMetaSchema);
