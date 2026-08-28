import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, ROLE_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  await deleteSession(cookieStore.get(SESSION_COOKIE)?.value);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ROLE_COOKIE);
  return response;
}
