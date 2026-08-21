import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { getCacheSizeBytes } from "@/lib/stats/aggregate";
import { getSyncStatus, runSync, SyncNotConfiguredError } from "@/lib/zotero/sync";

export async function GET() {
  const status = await getSyncStatus();

  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();
  const cacheSizeBytes = config?.libraryId ? await getCacheSizeBytes(config.libraryId) : 0;

  return NextResponse.json({ status, cacheSizeBytes });
}

export async function POST() {
  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof SyncNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
