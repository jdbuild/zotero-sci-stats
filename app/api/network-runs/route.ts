import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { NetworkRun } from "@/lib/db/models/NetworkRun";

const HISTORY_LIMIT = 20;

export async function GET() {
  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) {
    return NextResponse.json({ runs: [] });
  }

  const runs = await NetworkRun.find({ libraryId: config.libraryId })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();

  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const { querySets, network } = (await request.json()) ?? {};
  if (!Array.isArray(querySets) || !network) {
    return NextResponse.json({ error: "querySets and network are required." }, { status: 400 });
  }

  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) {
    return NextResponse.json({ error: "No library configured yet." }, { status: 409 });
  }

  const run = await NetworkRun.create({ libraryId: config.libraryId, querySets, network });

  // Keep the history bounded - drop anything older than the limit.
  const stale = await NetworkRun.find({ libraryId: config.libraryId })
    .sort({ createdAt: -1 })
    .skip(HISTORY_LIMIT)
    .select({ _id: 1 })
    .lean();
  if (stale.length > 0) {
    await NetworkRun.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
  }

  return NextResponse.json({ run });
}
