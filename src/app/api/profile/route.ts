import { NextRequest, NextResponse } from "next/server";
import { requireAllowedUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { isOneOf, readJsonObject } from "@/lib/learning-validation";

const TRACKS = ["science", "social", "all"] as const;

export async function GET(request: NextRequest) {
  const email = await requireAllowedUser(request);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.userProfile.findUnique({ where: { email } });
  return NextResponse.json({ track: profile?.track ?? null });
}

export async function PUT(request: NextRequest) {
  const email = await requireAllowedUser(request);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  if (!isOneOf(body.track, TRACKS)) return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  const profile = await prisma.userProfile.upsert({
    where: { email },
    update: { track: body.track },
    create: { email, track: body.track },
  });
  return NextResponse.json({ track: profile.track });
}