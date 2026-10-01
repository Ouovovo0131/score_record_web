// NOTE: Not protected by server-side auth verification — see route.ts comment
// in the parent directory for details on this accepted tradeoff.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExamRecordData, serializeExamRecord } from "@/lib/exam-record";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { userEmail: _userEmail, ...data } = buildExamRecordData(body);
  const record = await prisma.examRecord.update({
    where: { id },
    data,
  });
  return NextResponse.json(serializeExamRecord(record));
}
