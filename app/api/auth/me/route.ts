import { NextResponse } from "next/server";
import { getCurrentSession, isAuthEnabled } from "@/lib/auth/session";

export async function GET() {
  if (!isAuthEnabled()) {
    return NextResponse.json({ authEnabled: false, role: null });
  }
  const session = await getCurrentSession();
  return NextResponse.json({ authEnabled: true, role: session?.role ?? null });
}
