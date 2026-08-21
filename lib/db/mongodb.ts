import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/zoterosci-stats";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Reused across hot-reloads in dev so we don't open a new connection per request.
declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Fail fast instead of the ~30s default - MongoDB being unreachable
      // (e.g. `docker compose up -d` not run yet) should surface as a
      // quick, clear error, not a long hang that looks like nothing happened.
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    // Let the next call retry with a fresh connection attempt instead of
    // re-awaiting this same rejected promise forever.
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}
