import { NextRequest, NextResponse } from "next/server";
import { requireAllowedUser } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  const email = await requireAllowedUser(request);
  return email
    ? NextResponse.json({ allowed: true })
    : NextResponse.json({ allowed: false }, { status: 401 });
}