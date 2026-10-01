import type { ExamRecord, Prisma } from "@prisma/client";
import { BENCHMARKS, SUBJECTS, calculateSubjectScore, calculateTotalGrade } from "@/lib/data";

const COMPONENT_KEYS = SUBJECTS.flatMap((subject) => subject.components.map(({ key }) => key));
const BENCHMARK_KEYS = SUBJECTS.flatMap((subject) =>
  BENCHMARKS.map(({ key }) => `${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade`)
);
const RANK_KEYS = ["classRank", "classTotal", "schoolRank", "schoolTotal", "overallRank", "overallTotal"];

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function recordValues(record: Record<string, number | null | undefined>) {
  const values: Record<string, number | null> = {};
  for (const key of [...COMPONENT_KEYS, ...SUBJECTS.map(({ gradeKey }) => gradeKey), ...BENCHMARK_KEYS, ...RANK_KEYS]) {
    values[key] = toNumberOrNull(record[key]);
  }
  for (const subject of SUBJECTS) {
    values[subject.scoreKey] = toNumberOrNull(record[subject.scoreKey]);
    values[subject.scoreKey] = calculateSubjectScore(values, subject);
  }
  return values;
}

export function buildExamRecordData(body: Record<string, unknown>): Prisma.ExamRecordUncheckedCreateInput {
  const values = recordValues(body as Record<string, number | null | undefined>);
  return {
    userEmail: process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "default@example.com",
    examName: String(body.examName || "").trim(),
    examDate: new Date(String(body.examDate || "")),
    totalScore: 0,
    totalGrade: calculateTotalGrade(values),
    ...values,
    reviewTags: Array.isArray(body.reviewTags) ? body.reviewTags : [],
    notes: String(body.notes || ""),
  } as Prisma.ExamRecordUncheckedCreateInput;
}

export function serializeExamRecord(record: ExamRecord) {
  const publicRecord = { ...record } as Record<string, unknown>;
  delete publicRecord.totalScore;
  delete publicRecord.socialScore;
  delete publicRecord.socialGrade;
  const values = recordValues(record as unknown as Record<string, number | null | undefined>);
  return {
    ...publicRecord,
    ...Object.fromEntries(SUBJECTS.map(({ scoreKey }) => [scoreKey, values[scoreKey]])),
    totalGrade: calculateTotalGrade(values) ?? record.totalGrade,
    examDate: record.examDate.toISOString().slice(0, 10),
    reviewTags: Array.isArray(record.reviewTags) ? record.reviewTags : [],
  };
}
