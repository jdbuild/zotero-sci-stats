import { Schema, model, models, type InferSchemaType } from "mongoose";

// A saved result of one "Compare" run: the query sets the user built plus
// the computed stats, so past comparisons stay on the page across reloads
// without re-querying anything.
const ComparisonRunSchema = new Schema(
  {
    libraryId: { type: String, required: true, index: true },
    querySets: { type: Schema.Types.Mixed, required: true },
    stats: { type: Schema.Types.Mixed, required: true },
    // Only set when access management is enabled - see lib/auth/session.ts.
    // Absent on runs saved before that feature existed, and on every run
    // saved while it's off, so history stays library-wide (not per-user)
    // exactly as before on a deployment that never turns access management on.
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type ComparisonRunDoc = InferSchemaType<typeof ComparisonRunSchema>;

export const ComparisonRun = models.ComparisonRun ?? model("ComparisonRun", ComparisonRunSchema);
