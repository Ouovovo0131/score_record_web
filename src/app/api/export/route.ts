import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const CSV_DATASETS = [
  "exam-records",
  "english-records",
  "study-logs",
  "study-sessions",
  "english-questions",
  "weaknesses",
] as const;

type CsvDataset = (typeof CSV_DATASETS)[number];
type Row = Record<string, unknown>;

function csvCell(value: unknown): string {
  let text = value instanceof Date
    ? value.toISOString()
    : value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Row[]): string {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (!keys.length) return "";
  return [
    keys.map(csvCell).join(","),
    ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n");
}

async function loadDataset(dataset: CsvDataset, userEmail: string): Promise<Row[]> {
  switch (dataset) {
    case "exam-records":
      return prisma.examRecord.findMany({ where: { userEmail }, orderBy: { examDate: "asc" } });
    case "english-records":
      return prisma.englishRecord.findMany({ where: { userEmail }, orderBy: { practiceDate: "asc" } });
    case "study-logs":
      return prisma.studyLog.findMany({ where: { userEmail }, orderBy: { studyDate: "asc" } });
    case "study-sessions":
      return prisma.studySession.findMany({ where: { userEmail }, orderBy: { studyDate: "asc" } });
    case "english-questions":
      return prisma.englishQuestion.findMany({
        where: { userEmail },
        include: { reviewHistory: { orderBy: { reviewedAt: "asc" } } },
      });
    case "weaknesses":
      return prisma.weakness.findMany({
        where: { userEmail },
        include: { reviewHistory: { orderBy: { reviewedAt: "asc" } } },
      });
  }
}

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  if (format === "csv") {
    const dataset = request.nextUrl.searchParams.get("dataset");
    if (!dataset || !CSV_DATASETS.includes(dataset as CsvDataset)) {
      return NextResponse.json({ error: `dataset must be one of: ${CSV_DATASETS.join(", ")}` }, { status: 400 });
    }
    const rows = await loadDataset(dataset as CsvDataset, userEmail);
    const csv = `\uFEFF${toCsv(rows)}`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dataset}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (format !== "json") return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
  const datasets = await Promise.all(CSV_DATASETS.map(async (dataset) => [dataset, await loadDataset(dataset, userEmail)] as const));
  const goal = await prisma.goal.findUnique({
    where: { userEmail },
    select: {
      goalName: true,
      targetTotalGrade: true,
      targetChineseGrade: true,
      targetEnglishGrade: true,
      targetMathGrade: true,
      targetMathBGrade: true,
      targetScienceGrade: true,
      targetSocialGrade: true,
      targetEnglishAccuracy: true,
      targetDate: true,
    },
  });
  const profile = await prisma.userProfile.findUnique({ where: { email: userEmail }, select: { track: true } });
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    data: { ...Object.fromEntries(datasets), goals: goal, profile },
  }, {
    headers: {
      "Content-Disposition": 'attachment; filename="study-backup.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
