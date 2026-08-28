import { Schema, model, models, type InferSchemaType } from "mongoose";

// An access-management account. Only ever consulted when NEXT_PUBLIC_AUTH_ENABLED
// is set - see lib/auth/session.ts. passwordHash is a bcrypt hash; the
// plaintext password is never stored anywhere once created.
const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "member"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User = models.User ?? model("User", UserSchema);
