import { Schema, model, models, type InferSchemaType } from "mongoose";

const SavedQuerySchema = new Schema(
  {
    name: { type: String, required: true },
    tags: { type: [String], default: [] },
    tagMode: { type: String, enum: ["AND", "OR"], default: "AND" },
    yearFrom: { type: Number, default: null },
    yearTo: { type: Number, default: null },
    color: { type: String, default: "" },
  },
  { timestamps: true }
);

export type SavedQueryDoc = InferSchemaType<typeof SavedQuerySchema>;

export const SavedQuery = models.SavedQuery ?? model("SavedQuery", SavedQuerySchema);
