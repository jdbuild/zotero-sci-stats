import { Schema, model, models, type InferSchemaType } from "mongoose";

const CreatorSchema = new Schema(
  {
    creatorType: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    name: { type: String },
  },
  { _id: false }
);

const ItemSchema = new Schema(
  {
    // Zotero's own item key, unique within a library. Our sync identity.
    zoteroKey: { type: String, required: true, unique: true, index: true },
    libraryId: { type: String, required: true, index: true },
    version: { type: Number, required: true },

    itemType: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    creators: { type: [CreatorSchema], default: [] },
    // Flattened "First Last" (or institutional `name`) per creator, so
    // author filtering is a plain array match instead of parsing `creators`.
    creatorNames: { type: [String], default: [], index: true },

    // Raw Zotero "date" string (e.g. "2026", "2026-03", "March 2026").
    date: { type: String, default: "" },
    // Parsed publication year, extracted from `date` for the by-year chart.
    // Null when Zotero's date string has no recognizable year.
    publicationYear: { type: Number, default: null, index: true },
    // Day-precision parse of `date`, for the date-range filter. Missing
    // month/day are normalized to the 1st - see lib/zotero/parseDate.ts.
    publicationDate: { type: Date, default: null, index: true },

    dateAdded: { type: Date },
    dateModified: { type: Date },

    tags: { type: [String], default: [], index: true },
    collections: { type: [String], default: [] },

    publicationTitle: { type: String, default: "" },
    url: { type: String, default: "" },
    abstractNote: { type: String, default: "" },

    // Full raw Zotero item payload, kept for fields we don't model explicitly.
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ItemSchema.index({ libraryId: 1, tags: 1 });
ItemSchema.index({ libraryId: 1, publicationYear: 1 });
ItemSchema.index({ libraryId: 1, creatorNames: 1 });

export type ItemDoc = InferSchemaType<typeof ItemSchema>;

export const Item = models.Item ?? model("Item", ItemSchema);
