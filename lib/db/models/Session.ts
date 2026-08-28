import { Schema, model, models, type InferSchemaType } from "mongoose";

// A logged-in session, looked up by its opaque `token` (the value stored
// in the httpOnly "session" cookie - see lib/auth/session.ts). `role` is
// denormalized from the user at login time so a session check never needs
// a second lookup. MongoDB automatically deletes documents past
// `expiresAt` via the TTL index below - no manual cleanup job needed.
const SessionSchema = new Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  role: { type: String, enum: ["admin", "member"], required: true },
  expiresAt: { type: Date, required: true },
});

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof SessionSchema>;

export const Session = models.Session ?? model("Session", SessionSchema);
