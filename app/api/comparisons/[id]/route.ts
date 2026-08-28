import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ComparisonRun } from "@/lib/db/models/ComparisonRun";
import { getOwnerFilter } from "@/lib/auth/session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerFilter = await getOwnerFilter();
  if (!ownerFilter) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  await ComparisonRun.deleteOne({ _id: id, ...ownerFilter });
  return NextResponse.json({ ok: true });
}
