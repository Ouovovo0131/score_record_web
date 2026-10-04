import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { buildExamRecordData, serializeExamRecord, validateExamRecordData } from "@/lib/exam-record";

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const records = await prisma.examRecord.findMany({
    where: { userEmail },
    orderBy: { examDate: "asc" },
  });
  return NextResponse.json(records.map(serializeExamRecord));
}

export async function POST(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const validationError = validateExamRecordData(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const data = buildExamRecordData(body);
  const record = await prisma.examRecord.create({
    data: { ...data, userEmail },
  });
  return NextResponse.json(serializeExamRecord(record), { status: 201 });
}