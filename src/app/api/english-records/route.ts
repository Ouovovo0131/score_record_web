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

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const records = await prisma.englishRecord.findMany({
    where: { userEmail },
    orderBy: { practiceDate: "asc" },
  });
  return NextResponse.json(records.map(serialize));
}

export async function POST(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const validationError = validateEnglishRecordInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const input = body as EnglishRecordInput;

  const record = await prisma.englishRecord.create({
    data: {
      userEmail,
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

  return NextResponse.json(serialize(record), { status: 201 });
}
