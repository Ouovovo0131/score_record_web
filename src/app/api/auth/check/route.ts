import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const email = await verifyIdToken(request);
  if (!email) return NextResponse.json({ allowed: false }, { status: 401 });
  // Any verified Google account is registered on first sign-in.
  try {
    await prisma.allowedUser.upsert({ where: { email }, update: {}, create: { email, addedBy: "self" } });
  } catch {
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
  return NextResponse.json({ allowed: true });
}