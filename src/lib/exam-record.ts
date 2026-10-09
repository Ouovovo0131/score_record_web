import type { ExamRecord, Prisma } from "@prisma/client";
import { BENCHMARKS, SCIENCE_DETAIL_SCORES, SUBJECTS, calculateSubjectScore, calculateTotalGrade, inferTrackSubjects } from "@/lib/data";

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
  SCIENCE_DETAIL_SCORES.forEach(({ key, legacyKey }) => {
    values[key] = toNumberOrNull(record[key]) ?? toNumberOrNull(record[legacyKey]);
  });
  // Legacy rows stored 0 for the unused social subject; treat that as "no data".
  const socialEntered = SUBJECTS.find((s) => s.key === "social")!.components.some(({ key }) => values[key] !== null);
  if (!socialEntered && values.socialGrade === 0) values.socialGrade = null;
  for (const subject of SUBJECTS) {
    values[subject.scoreKey] = toNumberOrNull(record[subject.scoreKey]);
    values[subject.scoreKey] = calculateSubjectScore(values, subject);
  }
  return values;
}

export function validateExamRecordData(body: Record<string, unknown>): string | null {
  const values = recordValues(body as Record<string, number | null | undefined>);
  if ([...COMPONENT_KEYS, ...SCIENCE_DETAIL_SCORES.map(({ key }) => key)].some((key) => values[key] !== null && values[key] < 0)) {
    return "分數不可小於 0。";
  }
  if (Number(values.englishScore) > 100) return "英文分數不可超過 100 分。";
  if (Number(values.mathScore) > 100) return "數A分數不可超過 100 分。";
  if (Number(values.mathBScore) > 100) return "數B分數不可超過 100 分。";
  if (Number(values.scienceChoiceScore) > 72) return "自然選擇題不可超過 72 分。";
  if (Number(values.scienceMixedScore) > 56) return "自然混合題不可超過 56 分。";
  const scienceDetailsEntered = SCIENCE_DETAIL_SCORES.some(({ key }) => values[key] !== null);
  const scienceDetailsComplete = SCIENCE_DETAIL_SCORES.every(({ key }) => values[key] !== null);
  if (
    scienceDetailsEntered &&
    scienceDetailsComplete &&
    values.scienceChoiceScore !== null &&
    values.scienceMixedScore !== null &&
    Math.abs(
      SCIENCE_DETAIL_SCORES.reduce((sum, { key }) => sum + (values[key] ?? 0), 0) -
        (values.scienceChoiceScore + values.scienceMixedScore)
    ) > 0.001
  ) {
    return "物理、化學、生物及地球科學整份考卷得分合計需等於自然選擇題與混合題分數總和。";
  }
  if (SUBJECTS.find((s) => s.key === "social")!.components.some(({ key, maxScore }) => Number(values[key]) > (maxScore ?? Infinity))) {
    return "社會各科分數不可超過 48 分。";
  }
  if (Number(values.scienceScore) > 128) return "自然分數不可超過 128 分。";
  for (const key of [...SUBJECTS.map(({ gradeKey }) => gradeKey), ...BENCHMARK_KEYS]) {
    if (values[key] !== null && (values[key] < 0 || values[key] > 15)) return "級分需介於 0 到 15 級分。";
  }
  for (const { key, totalKey } of [
    { key: "classRank", totalKey: "classTotal" },
    { key: "schoolRank", totalKey: "schoolTotal" },
    { key: "overallRank", totalKey: "overallTotal" },
  ]) {
    const rank = values[key];
    const total = values[totalKey];
    if (
      (rank !== null && (!Number.isInteger(rank) || rank < 1)) ||
      (total !== null && (!Number.isInteger(total) || total < 1)) ||
      (rank !== null && total !== null && rank > total)
    ) {
      return "排名須為正整數，且名次不可大於總人數。";
    }
  }
  return null;
}

export function buildExamRecordData(body: Record<string, unknown>): Prisma.ExamRecordUncheckedCreateInput {
  const values = recordValues(body as Record<string, number | null | undefined>);
  return {
    userEmail: process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "default@example.com",
    examName: String(body.examName || "").trim(),
    examDate: new Date(String(body.examDate || "")),
    totalScore: 0,
    totalGrade: calculateTotalGrade(values, inferTrackSubjects(values)),
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
  delete publicRecord.userEmail;
  SCIENCE_DETAIL_SCORES.forEach(({ legacyKey }) => delete publicRecord[legacyKey]);
  const values = recordValues(record as unknown as Record<string, number | null | undefined>);
  return {
    ...publicRecord,
    ...values,
    ...Object.fromEntries(SUBJECTS.map(({ scoreKey }) => [scoreKey, values[scoreKey]])),
    totalGrade: calculateTotalGrade(values, inferTrackSubjects(values)) ?? record.totalGrade,
    examDate: record.examDate.toISOString().slice(0, 10),
    reviewTags: Array.isArray(record.reviewTags) ? record.reviewTags : [],
  };
}
