import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Session } from "@/lib/db/models/Session";

export const SESSION_COOKIE = "session";
// Non-secret hint of the current role, set alongside the session cookie so
// proxy.ts can redirect a logged-in member away from /settings without a
// database round-trip. Never trusted for the real check - every Settings-
// related Route Handler re-verifies the role itself via requireAdmin()
// or isAdminOrAuthDisabled().
export const ROLE_COOKIE = "role";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type Role = "admin" | "member";

export interface VerifiedSession {
  userId: string;
  role: Role;
}

/** Whether access management is switched on at all for this deployment.
 * Everything else in this module is a no-op when this is false, so a
 * local `.env.local` with no `NEXT_PUBLIC_AUTH_ENABLED` line behaves
 * exactly as if this feature didn't exist. */
export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

export async function createSession(userId: string, role: Role): Promise<{ token: string; expiresAt: Date }> {
  await connectToDatabase();
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await Session.create({ token, userId, role, expiresAt });
  return { token, expiresAt };
}

/** The real, database-backed check - never trust a cookie's mere presence
 * (that's only proxy.ts's cheap optimistic layer) without confirming the
 * session still exists and hasn't expired. */
export async function verifySession(token: string | undefined): Promise<VerifiedSession | null> {
  if (!isAuthEnabled() || !token) return null;
  await connectToDatabase();
  const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  return { userId: String(session.userId), role: session.role as Role };
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await connectToDatabase();
  await Session.deleteOne({ token });
}

/** Reads and verifies the session cookie for the current request - the
 * one call every protected Route Handler / Server Component needs. */
export async function getCurrentSession(): Promise<VerifiedSession | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

/** For routes that only exist because of access management (e.g. member
 * management itself) - null both when the feature is off and when the
 * caller isn't an admin, since neither case should be allowed through. */
export async function requireAdmin(): Promise<VerifiedSession | null> {
  if (!isAuthEnabled()) return null;
  const session = await getCurrentSession();
  return session?.role === "admin" ? session : null;
}

/** For per-user-scoped resources (comparison/network run history). `null`
 * means "not authorized" - access management is on but there's no valid
 * session, so the caller should 401. `{}` means "don't scope by owner at
 * all" - either access management is off (today's library-wide history,
 * unchanged), spread this directly into a Mongo filter (adds nothing) or
 * a `.create()` call (sets no `userId`) either way. */
export async function getOwnerFilter(): Promise<{ userId?: string } | null> {
  if (!isAuthEnabled()) return {};
  const session = await getCurrentSession();
  return session ? { userId: session.userId } : null;
}

/** For core app routes (Zotero connection, sync, reprocess) that must keep
 * working unchanged on deployments that don't use access management at
 * all - only gates to admin once the feature is actually switched on. */
export async function isAdminOrAuthDisabled(): Promise<boolean> {
  if (!isAuthEnabled()) return true;
  const session = await getCurrentSession();
  return session?.role === "admin";
}
