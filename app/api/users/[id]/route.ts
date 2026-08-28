import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/User";
import { Session } from "@/lib/db/models/Session";
import { requireAdmin } from "@/lib/auth/session";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.userId) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  await connectToDatabase();
  await User.deleteOne({ _id: id });
  await Session.deleteMany({ userId: id });
  return NextResponse.json({ ok: true });
}
