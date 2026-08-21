import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { computeQuerySetStats, type QuerySetInput } from "@/lib/stats/aggregate";

export async function POST(request: Request) {
  const { querySets } = (await request.json()) as { querySets: QuerySetInput[] };

  if (!Array.isArray(querySets) || querySets.length === 0) {
    return NextResponse.json({ error: "At least one query set is required." }, { status: 400 });
  }

  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) {
    return NextResponse.json({ error: "No library configured yet." }, { status: 409 });
  }

  const stats = await computeQuerySetStats(config.libraryId, querySets);
  return NextResponse.json({ stats });
}
