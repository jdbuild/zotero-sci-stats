import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/User";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSession, isAuthEnabled, ROLE_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";
import { ensureBootstrapAdmin } from "@/lib/auth/bootstrap";

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Access management is not enabled." }, { status: 404 });
  }

  const { username, password } = (await request.json()) as { username?: string; password?: string };
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  await ensureBootstrapAdmin();
  await connectToDatabase();
  const user = await User.findOne({ username }).lean();
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(String(user._id), user.role as "admin" | "member");

  const response = NextResponse.json({ role: user.role });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
  response.cookies.set(SESSION_COOKIE, token, cookieOptions);
  // Cheap role hint for proxy.ts's optimistic /settings redirect - never
  // the real check, see isAdminOrAuthDisabled()/requireAdmin().
  response.cookies.set(ROLE_COOKIE, user.role, cookieOptions);
  return response;
}
