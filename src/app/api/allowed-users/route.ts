import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, requireAllowedUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  if (!(await requireAllowedUser(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.allowedUser.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(users.map((u) => ({ email: u.email, addedBy: u.addedBy })));
}

export async function POST(request: NextRequest) {
  const me = await requireAllowedUser(request);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const email = normalizeEmail(body.email);
  if (!EMAIL_PATTERN.test(email) || email.length > 200) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  await prisma.allowedUser.upsert({ where: { email }, update: {}, create: { email, addedBy: me } });
  return NextResponse.json({ email, addedBy: me }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const me = await requireAllowedUser(request);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = normalizeEmail(new URL(request.url).searchParams.get("email"));
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (email === me) return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  await prisma.allowedUser.deleteMany({ where: { email } });
  return NextResponse.json({ email });
}