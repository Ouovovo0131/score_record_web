// NOTE: This route is not currently protected by server-side auth
// verification (no Firebase Admin token check) — see the exam-records route
// for the same accepted tradeoff note. Relies on client-side RequireAuth only.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "default@example.com";

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

export async function GET() {
  await prisma.englishRecord.updateMany({
    where: { userEmail: DEFAULT_USER_EMAIL, practiceType: "miaomiao", translationScore: null },
    data: { translationScore: 0 },
  });
  const records = await prisma.englishRecord.findMany({
    where: { userEmail: DEFAULT_USER_EMAIL },
    orderBy: { practiceDate: "asc" },
  });
  return NextResponse.json(records.map(serialize));
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const record = await prisma.englishRecord.create({
    data: {
      userEmail: DEFAULT_USER_EMAIL,
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

  return NextResponse.json(serialize(record), { status: 201 });
}
