// NOTE: Not protected by server-side auth verification — see route.ts comment
// in the parent directory for details on this accepted tradeoff.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(record: {
  id: string;
  examName: string;
  examDate: Date;
  totalScore: number;
  totalGrade: number | null;
  chineseScore: number | null;
  chineseGrade: number | null;
  englishScore: number | null;
  englishGrade: number | null;
  mathScore: number | null;
  mathGrade: number | null;
  socialScore: number | null;
  socialGrade: number | null;
  scienceScore: number | null;
  scienceGrade: number | null;
  physicsScore: number | null;
  chemistryScore: number | null;
  biologyScore: number | null;
  earthScienceScore: number | null;
  reviewTags: unknown;
  notes: string;
}) {
  return {
    ...record,
    examDate: record.examDate.toISOString().slice(0, 10),
    reviewTags: Array.isArray(record.reviewTags) ? record.reviewTags : [],
  };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const record = await prisma.examRecord.update({
    where: { id },
    data: {
      examName: body.examName,
      examDate: new Date(body.examDate),
      totalScore: body.totalScore,
      totalGrade: body.totalGrade ?? null,
      chineseScore: body.chineseScore ?? null,
      chineseGrade: body.chineseGrade ?? null,
      englishScore: body.englishScore ?? null,
      englishGrade: body.englishGrade ?? null,
      mathScore: body.mathScore ?? null,
      mathGrade: body.mathGrade ?? null,
      socialScore: body.socialScore ?? null,
      socialGrade: body.socialGrade ?? null,
      scienceScore: body.scienceScore ?? null,
      scienceGrade: body.scienceGrade ?? null,
      physicsScore: body.physicsScore ?? null,
      chemistryScore: body.chemistryScore ?? null,
      biologyScore: body.biologyScore ?? null,
      earthScienceScore: body.earthScienceScore ?? null,
      reviewTags: body.reviewTags ?? [],
      notes: body.notes ?? "",
    },
  });

  return NextResponse.json(serialize(record));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.examRecord.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
