import { NextRequest, NextResponse } from "next/server";
import { isAllowedEmail, verifyIdToken } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  const email = await verifyIdToken(request);
  if (!email) return NextResponse.json({ allowed: false }, { status: 401 });
  return NextResponse.json({ allowed: await isAllowedEmail(email) });
}