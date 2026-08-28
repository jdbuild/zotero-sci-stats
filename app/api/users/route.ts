import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models/User";
import { requireAdmin } from "@/lib/auth/session";
import { generatePassword, hashPassword } from "@/lib/auth/passwords";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  await connectToDatabase();
  const users = await User.find({}, { username: 1, role: 1, createdAt: 1 }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({
    users: users.map((u) => ({ id: String(u._id), username: u.username, role: u.role, createdAt: u.createdAt })),
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { username } = (await request.json()) as { username?: string };
  if (!username?.trim()) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await User.findOne({ username: username.trim() }).lean();
  if (existing) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  const user = await User.create({ username: username.trim(), passwordHash, role: "member" });

  // The only moment this plaintext password ever exists outside the
  // admin's own memory - never stored, never logged, never returned again.
  return NextResponse.json({
    id: String(user._id),
    username: user.username,
    password,
  });
}
