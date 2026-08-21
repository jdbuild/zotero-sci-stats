import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Config } from "@/lib/db/models/Config";
import { computeNetwork } from "@/lib/stats/network";
import type { NetworkNodeInput } from "@/lib/stats/network";

export async function POST(request: Request) {
  const { querySets } = (await request.json()) as { querySets: NetworkNodeInput[] };

  if (!Array.isArray(querySets) || querySets.length < 2) {
    return NextResponse.json({ error: "At least two query sets are required." }, { status: 400 });
  }

  await connectToDatabase();
  const config = await Config.findOne({ singleton: "config" }).lean();
  if (!config?.libraryId) {
    return NextResponse.json({ error: "No library configured yet." }, { status: 409 });
  }

  const network = await computeNetwork(config.libraryId, querySets);
  return NextResponse.json({ network });
}
