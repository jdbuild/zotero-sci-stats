import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/User";
import { hashPassword } from "@/lib/auth/passwords";
import { isAuthEnabled } from "@/lib/auth/session";

let checked = false;

/**
 * Creates the first admin account from ADMIN_USERNAME/ADMIN_PASSWORD env
 * vars, but only if no admin exists yet in this database - so it's safe
 * to leave those env vars set permanently without recreating/overwriting
 * an admin whose password you've since changed. The plaintext password
 * from the env var is hashed immediately and never read again after this
 * runs once; only the hash is ever persisted.
 *
 * Cheap to call on every login attempt - `checked` avoids repeating the
 * query for the lifetime of this process once an admin is confirmed to
 * exist (mirrors the connection-caching pattern in lib/db/mongodb.ts).
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  if (checked || !isAuthEnabled()) return;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    checked = true;
    return;
  }

  await connectToDatabase();
  const existingAdmin = await User.findOne({ role: "admin" }).lean();
  if (existingAdmin) {
    checked = true;
    return;
  }

  const passwordHash = await hashPassword(password);
  await User.findOneAndUpdate(
    { username },
    { username, passwordHash, role: "admin" },
    { upsert: true }
  );
  checked = true;
}
