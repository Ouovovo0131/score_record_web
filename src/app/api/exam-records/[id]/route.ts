import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { buildExamRecordData, serializeExamRecord, validateExamRecordData } from "@/lib/exam-record";
import { readJsonObject } from "@/lib/learning-validation";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const validationError = validateExamRecordData(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const { userEmail: _userEmail, ...data } = buildExamRecordData(body);
  void _userEmail;
  const result = await prisma.examRecord.updateMany({ where: { id, userEmail }, data });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const record = await prisma.examRecord.findFirst({ where: { id, userEmail } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeExamRecord(record));
}