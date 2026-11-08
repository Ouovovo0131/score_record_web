import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { validateEnglishRecordInput, type EnglishRecordInput } from "@/lib/data";
import { readJsonObject } from "@/lib/learning-validation";

function serialize(record: {
  id: string;
  practiceType: string;
  practiceDate: Date;
  practiceName: string;
  totalScore: number | null;
  questionsAttempted: number | null;
  questionsCorrect: number | null;
  vocabularyScore: number | null;
  clozeScore: number | null;
  contextScore: number | null;
  structureScore: number | null;
  readingScore: number | null;
  mixedScore: number | null;
  translationScore: number | null;
  notes: string;
}) {
  return {
    ...record,
    practiceDate: record.practiceDate.toISOString().slice(0, 10),
  };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const validationError = validateEnglishRecordInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const input = body as EnglishRecordInput;

  const result = await prisma.englishRecord.updateMany({
    where: { id, userEmail },
    data: {
      practiceType: input.practiceType,
      practiceDate: new Date(input.practiceDate),
      practiceName: input.practiceName ?? "",
      totalScore: input.totalScore ?? null,
      questionsAttempted: input.questionsAttempted ?? null,
      questionsCorrect: input.questionsCorrect ?? null,
      vocabularyScore: input.vocabularyScore ?? null,
      clozeScore: input.clozeScore ?? null,
      contextScore: input.contextScore ?? null,
      structureScore: input.structureScore ?? null,
      readingScore: input.readingScore ?? null,
      mixedScore: input.mixedScore ?? null,
      translationScore: input.translationScore ?? null,
      notes: input.notes ?? "",
    },
  });

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const record = await prisma.englishRecord.findFirst({ where: { id, userEmail } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serialize(record));
}
