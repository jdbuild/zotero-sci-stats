import { Schema, model, models, type InferSchemaType } from "mongoose";

// Singleton document: the one Zotero library this local instance is
// connected to. Not committed to git - lives only in the local MongoDB.
const ConfigSchema = new Schema({
  singleton: { type: String, default: "config", unique: true },

  zoteroApiKey: { type: String, default: "" },
  libraryId: { type: String, default: "" },
  libraryType: { type: String, enum: ["user", "group", ""], default: "" },
  libraryName: { type: String, default: "" },
});

export type ConfigDoc = InferSchemaType<typeof ConfigSchema>;

export const Config = models.Config ?? model("Config", ConfigSchema);
