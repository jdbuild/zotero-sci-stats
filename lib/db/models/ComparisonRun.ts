import { Schema, model, models, type InferSchemaType } from "mongoose";

// A saved result of one "Compare" run: the query sets the user built plus
// the computed stats, so past comparisons stay on the page across reloads
// without re-querying anything.
const ComparisonRunSchema = new Schema(
  {
    libraryId: { type: String, required: true, index: true },
    querySets: { type: Schema.Types.Mixed, required: true },
    stats: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type ComparisonRunDoc = InferSchemaType<typeof ComparisonRunSchema>;

export const ComparisonRun = models.ComparisonRun ?? model("ComparisonRun", ComparisonRunSchema);
