import { NextResponse } from "next/server";
import { reprocessDerivedFields } from "@/lib/zotero/reprocess";
import { SyncNotConfiguredError } from "@/lib/zotero/sync";

/**
 * Recomputes derived fields (author names, publication year) for the
 * already-synced cache, entirely from data already stored locally - no
 * Zotero API calls. Lets a library that was synced before a new derived
 * field existed pick it up without a full re-sync.
 */
export async function POST() {
  try {
    const result = await reprocessDerivedFields();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof SyncNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Reprocessing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
