import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

function serialize(record: {
  id: string;
  practiceType: string;
  practiceDate: Date;
  practiceName: string;
  totalScore: number | null;
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
  const body = await request.json();

  const result = await prisma.englishRecord.updateMany({
    where: { id, userEmail },
    data: {
      practiceType: body.practiceType,
      practiceDate: new Date(body.practiceDate),
      practiceName: body.practiceName,
      totalScore: body.totalScore ?? null,
      vocabularyScore: body.vocabularyScore ?? null,
      clozeScore: body.clozeScore ?? null,
      contextScore: body.contextScore ?? null,
      structureScore: body.structureScore ?? null,
      readingScore: body.readingScore ?? null,
      mixedScore: body.mixedScore ?? null,
      translationScore: body.translationScore ?? null,
      notes: body.notes ?? "",
    },
  });

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const record = await prisma.englishRecord.findFirst({ where: { id, userEmail } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serialize(record));
}
