// NOTE: Not protected by server-side auth verification — see route.ts comment
// in the parent directory for details on this accepted tradeoff.
import { NextRequest, NextResponse } from "next/server";
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
  const { id } = await params;
  const body = await request.json();

  const record = await prisma.englishRecord.update({
    where: { id },
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

  return NextResponse.json(serialize(record));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.englishRecord.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
