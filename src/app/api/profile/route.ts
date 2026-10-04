import { NextRequest, NextResponse } from "next/server";
import { requireAllowedUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const TRACKS = ["science", "social"];

export async function GET(request: NextRequest) {
  const email = await requireAllowedUser(request);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.userProfile.findUnique({ where: { email } });
  return NextResponse.json({ track: profile?.track ?? null });
}

export async function PUT(request: NextRequest) {
  const email = await requireAllowedUser(request);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!TRACKS.includes(body.track)) return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  const profile = await prisma.userProfile.upsert({
    where: { email },
    update: { track: body.track },
    create: { email, track: body.track },
  });
  return NextResponse.json({ track: profile.track });
}