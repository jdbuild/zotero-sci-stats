import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ComparisonRun } from "@/lib/db/models/ComparisonRun";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectToDatabase();
  await ComparisonRun.deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
