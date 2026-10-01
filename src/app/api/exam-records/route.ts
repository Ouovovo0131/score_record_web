// NOTE: This route is not currently protected by server-side auth
// verification — see the accepted tradeoff note in the previous version.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExamRecordData, serializeExamRecord } from "@/lib/exam-record";

const DEFAULT_USER_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "default@example.com";

export async function GET() {
  const records = await prisma.examRecord.findMany({
    where: { userEmail: DEFAULT_USER_EMAIL },
    orderBy: { examDate: "asc" },
  });
  return NextResponse.json(records.map(serializeExamRecord));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = buildExamRecordData(body);
  const record = await prisma.examRecord.create({
    data: { ...data, userEmail: DEFAULT_USER_EMAIL },
  });
  return NextResponse.json(serializeExamRecord(record), { status: 201 });
}
