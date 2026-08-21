import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { NetworkRun } from "@/lib/db/models/NetworkRun";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectToDatabase();
  await NetworkRun.deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
