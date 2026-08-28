import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { isAdminOrAuthDisabled } from "@/lib/auth/session";

function maskKey(key: string): string {
  if (key.length <= 6) return "*".repeat(key.length);
  return `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}`;
}

export async function GET() {
  if (!(await isAdminOrAuthDisabled())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();

  if (!config) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: Boolean(config.zoteroApiKey && config.libraryId),
    libraryId: config.libraryId,
    libraryType: config.libraryType,
    libraryName: config.libraryName,
    apiKeyMasked: config.zoteroApiKey ? maskKey(config.zoteroApiKey) : "",
  });
}

export async function POST(request: Request) {
  if (!(await isAdminOrAuthDisabled())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await request.json();
  const { zoteroApiKey, libraryId, libraryType, libraryName } = body ?? {};

  if (!zoteroApiKey || !libraryId || !libraryType || !libraryName) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await Config.findOneAndUpdate(
      { singleton: "config" },
      { singleton: "config", zoteroApiKey, libraryId, libraryType, libraryName },
      { upsert: true }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reach MongoDB.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
