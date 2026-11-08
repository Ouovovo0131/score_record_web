import { NextRequest, NextResponse } from "next/server";
import { ENGLISH_PRACTICE_TYPES } from "@/lib/data";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const DAY_MS = 86400000;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  return new Date(`${dayKey(date)}T00:00:00.000Z`);
}

function labelCategory(value: string) {
  const labels: Record<string, string> = {
    vocabulary: "詞彙不熟",
    grammar: "文法錯誤",
    context: "文意理解",
    careless: "粗心失誤",
    time_management: "時間管理",
    other: "其他",
  };
  return labels[value] ?? value;
}

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());
  const currentStart = new Date(today.getTime() - 6 * DAY_MS);
  const previousStart = new Date(today.getTime() - 13 * DAY_MS);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const previousEnd = currentStart;

  const [
    sessions,
    currentEnglish,
    previousEnglish,
    recentErrors,
    currentLogs,
    latestExam,
  ] = await Promise.all([
    prisma.studySession.findMany({
      where: { userEmail, studyDate: { gte: currentStart, lt: tomorrow } },
      select: { minutes: true, subject: true },
    }),
    prisma.englishRecord.findMany({
      where: { userEmail, practiceDate: { gte: currentStart, lt: tomorrow } },
      select: { practiceType: true, totalScore: true },
    }),
    prisma.englishRecord.findMany({
      where: { userEmail, practiceDate: { gte: previousStart, lt: previousEnd } },
      select: { practiceType: true, totalScore: true },
    }),
    prisma.englishQuestion.findMany({
      where: { userEmail, createdAt: { gte: currentStart, lt: tomorrow } },
      select: { errorCategory: true },
    }),
    prisma.studyLog.count({ where: { userEmail, studyDate: { gte: currentStart, lt: tomorrow } } }),
    prisma.examRecord.findFirst({
      where: { userEmail, examDate: { lt: tomorrow }, totalGrade: { not: null } },
      select: { examName: true, examDate: true, totalGrade: true },
      orderBy: { examDate: "desc" },
    }),
  ]);
  const previousExam = latestExam
    ? await prisma.examRecord.findFirst({
        where: { userEmail, examDate: { lt: latestExam.examDate }, totalGrade: { not: null } },
        select: { examName: true, examDate: true, totalGrade: true },
        orderBy: { examDate: "desc" },
      })
    : null;

  const scoreRate = (records: typeof currentEnglish) => {
    const scored = records.filter((record) => Number.isFinite(record.totalScore));
    const possible = scored.reduce(
      (sum, record) => sum + (ENGLISH_PRACTICE_TYPES.find((type) => type.key === record.practiceType)?.maxScore ?? 0),
      0
    );
    if (!possible) return null;
    return scored.reduce((sum, record) => sum + (record.totalScore ?? 0), 0) / possible * 100;
  };
  const currentRate = scoreRate(currentEnglish);
  const previousRate = scoreRate(previousEnglish);
  const counts = new Map<string, number>();
  for (const { errorCategory } of recentErrors) counts.set(errorCategory, (counts.get(errorCategory) ?? 0) + 1);
  const topErrors = [...counts.entries()]
    .map(([category, count]) => ({ category, label: labelCategory(category), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const minutesBySubject = sessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.subject] = (acc[session.subject] ?? 0) + session.minutes;
    return acc;
  }, {});
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  const examChange = latestExam?.totalGrade !== null && latestExam?.totalGrade !== undefined &&
    previousExam?.totalGrade !== null && previousExam?.totalGrade !== undefined
    ? latestExam.totalGrade - previousExam.totalGrade
    : null;

  return NextResponse.json({
    period: { startDate: dayKey(currentStart), endDate: dayKey(today), previousStartDate: dayKey(previousStart), previousEndDate: dayKey(new Date(currentStart.getTime() - DAY_MS)) },
    study: { totalMinutes, sessionCount: sessions.length, studyDays: currentLogs, minutesBySubject },
    english: {
      practiceCount: currentEnglish.length,
      scoreRate: currentRate,
      previousScoreRate: previousRate,
      scoreRateChange: currentRate !== null && previousRate !== null ? currentRate - previousRate : null,
    },
    exams: {
      latest: latestExam ? { name: latestExam.examName, date: dayKey(latestExam.examDate), totalGrade: latestExam.totalGrade } : null,
      previous: previousExam ? { name: previousExam.examName, date: dayKey(previousExam.examDate), totalGrade: previousExam.totalGrade } : null,
      change: examChange,
    },
    topErrors,
    caveats: {
      studyHours: "只統計新增的讀書時段；舊的每日讀書標記不含時數。",
      englishAccuracy: "現有練習總分除以該類型滿分，為得分率而非逐題正確率。",
      correlation: "目前報告不推論讀書時間造成成績變化。",
      emptyErrors: recentErrors.length === 0,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
