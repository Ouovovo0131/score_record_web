// NOTE: Not protected by server-side auth verification — see the
// exam-records route for the accepted tradeoff note.
import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await prisma.studyLog.findMany({
    where: { userEmail },
    orderBy: { studyDate: "asc" },
  });
  return NextResponse.json(logs.map((log) => ({ date: log.studyDate.toISOString().slice(0, 10), note: log.note })));
}

// studied=true upserts the day (optionally with a note); studied=false removes it.
export async function PUT(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const date = String(body.date ?? "");
  if (!DATE_PATTERN.test(date) || Number.isNaN(toDbDate(date).getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (body.studied === false) {
    await prisma.studyLog.deleteMany({ where: { userEmail, studyDate: toDbDate(date) } });
    return NextResponse.json({ date, studied: false });
  }

  const note = typeof body.note === "string" ? body.note.slice(0, 200) : undefined;
  const log = await prisma.studyLog.upsert({
    where: { userEmail_studyDate: { userEmail, studyDate: toDbDate(date) } },
    update: note === undefined ? {} : { note },
    create: { userEmail, studyDate: toDbDate(date), note: note ?? "" },
  });
  return NextResponse.json({ date, studied: true, note: log.note });
}
