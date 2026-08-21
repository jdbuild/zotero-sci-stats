import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { ComparisonRun } from "@/lib/db/models/ComparisonRun";

const HISTORY_LIMIT = 20;

export async function GET() {
  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) {
    return NextResponse.json({ runs: [] });
  }

  const runs = await ComparisonRun.find({ libraryId: config.libraryId })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();

  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const { querySets, stats } = (await request.json()) ?? {};
  if (!Array.isArray(querySets) || !Array.isArray(stats)) {
    return NextResponse.json({ error: "querySets and stats are required." }, { status: 400 });
  }

  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) {
    return NextResponse.json({ error: "No library configured yet." }, { status: 409 });
  }

  const run = await ComparisonRun.create({ libraryId: config.libraryId, querySets, stats });

  // Keep the history bounded - drop anything older than the limit.
  const stale = await ComparisonRun.find({ libraryId: config.libraryId })
    .sort({ createdAt: -1 })
    .skip(HISTORY_LIMIT)
    .select({ _id: 1 })
    .lean();
  if (stale.length > 0) {
    await ComparisonRun.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
  }

  return NextResponse.json({ run });
}
