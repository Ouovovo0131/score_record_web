// NOTE: This route is not currently protected by server-side auth verification
// (no Firebase Admin token check). It relies on the client-side RequireAuth
// gate only. This is an accepted tradeoff for a personal single-user app —
// anyone who discovers the API URL could read/write data. Add Firebase Admin
// ID token verification here if this app is ever made multi-user or public.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "default@example.com";

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
  reviewTags: unknown;
  notes: string;
}) {
  return {
    ...record,
    examDate: record.examDate.toISOString().slice(0, 10),
    reviewTags: Array.isArray(record.reviewTags) ? record.reviewTags : [],
  };
}

export async function GET() {
  const records = await prisma.examRecord.findMany({
    where: { userEmail: DEFAULT_USER_EMAIL },
    orderBy: { examDate: "asc" },
  });
  return NextResponse.json(records.map(serialize));
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const record = await prisma.examRecord.create({
    data: {
      userEmail: DEFAULT_USER_EMAIL,
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
      reviewTags: body.reviewTags ?? [],
      notes: body.notes ?? "",
    },
  });

  return NextResponse.json(serialize(record), { status: 201 });
}
