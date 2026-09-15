const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

/**
 * Runs once when a new server instance starts (see
 * node_modules/next/dist/docs/.../instrumentation.md) - used here to warm
 * the MongoDB connection before the first real visitor arrives, and to keep
 * pinging it periodically for the life of the process so it never sits idle
 * long enough for MongoDB Atlas (or a network hop in between) to silently
 * close it. This doesn't eliminate the cold-start/stale-connection path
 * entirely (a fresh deploy, or a ping that happens to land mid-outage,
 * still hits it) - see lib/db/mongodb.ts and app/api/auth/login/route.ts
 * for the fallback that handles that gracefully when it does happen.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { connectToDatabase } = await import("@/lib/db/mongodb");

  try {
    await connectToDatabase();
  } catch {
    // Best-effort - a failed warm-up just means the first real request
    // pays the cold-start cost instead, exactly like before this existed.
  }

  setInterval(() => {
    connectToDatabase().catch(() => {});
  }, KEEP_ALIVE_INTERVAL_MS);
}
