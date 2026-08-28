import { Schema, model, models, type InferSchemaType } from "mongoose";

// A saved result of one Collaboration Network run: the query sets used
// plus the computed network (nodes + edges), so past networks stay on
// the page across reloads without recomputing anything - mirrors
// ComparisonRun for the Compare page.
const NetworkRunSchema = new Schema(
  {
    libraryId: { type: String, required: true, index: true },
    querySets: { type: Schema.Types.Mixed, required: true },
    network: { type: Schema.Types.Mixed, required: true },
    // Same opt-in per-user ownership as ComparisonRun.userId - see that
    // model's comment.
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type NetworkRunDoc = InferSchemaType<typeof NetworkRunSchema>;

export const NetworkRun = models.NetworkRun ?? model("NetworkRun", NetworkRunSchema);
