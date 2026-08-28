import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { NetworkRun } from "@/lib/db/models/NetworkRun";
import { getOwnerFilter } from "@/lib/auth/session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerFilter = await getOwnerFilter();
  if (!ownerFilter) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  await NetworkRun.deleteOne({ _id: id, ...ownerFilter });
  return NextResponse.json({ ok: true });
}
