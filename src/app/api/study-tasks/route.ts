// NOTE: Not protected by server-side auth verification - see the
// exam-records route for the accepted tradeoff note.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "default@example.com";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SUBJECT_KEYS = ["chinese", "english", "math", "science", "other"];

function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(toDbDate(value).getTime());
}

function serialize(task: {
  id: string;
  title: string;
  subject: string;
  startDate: Date;
  endDate: Date;
  note: string;
  done: boolean;
}) {
  return {
    id: task.id,
    title: task.title,
    subject: task.subject,
    startDate: task.startDate.toISOString().slice(0, 10),
    endDate: task.endDate.toISOString().slice(0, 10),
    note: task.note,
    done: task.done,
  };
}

export async function GET() {
  const tasks = await prisma.studyTask.findMany({
    where: { userEmail: DEFAULT_USER_EMAIL },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(tasks.map(serialize));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 100) : "";
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!validDate(body.startDate)) return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
  const endDate = body.endDate ? body.endDate : body.startDate;
  if (!validDate(endDate) || endDate < body.startDate) return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });

  const task = await prisma.studyTask.create({
    data: {
      userEmail: DEFAULT_USER_EMAIL,
      title,
      subject: SUBJECT_KEYS.includes(body.subject) ? body.subject : "other",
      startDate: toDbDate(body.startDate),
      endDate: toDbDate(endDate),
      note: typeof body.note === "string" ? body.note.slice(0, 300) : "",
    },
  });
  return NextResponse.json(serialize(task), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.done === "boolean") data.done = body.done;
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 100);
  if (typeof body.note === "string") data.note = body.note.slice(0, 300);
  if (SUBJECT_KEYS.includes(body.subject)) data.subject = body.subject;
  if (validDate(body.startDate)) data.startDate = toDbDate(body.startDate);
  if (validDate(body.endDate)) data.endDate = toDbDate(body.endDate);

  const result = await prisma.studyTask.updateMany({ where: { id, userEmail: DEFAULT_USER_EMAIL }, data });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const task = await prisma.studyTask.findUnique({ where: { id } });
  return NextResponse.json(task ? serialize(task) : { id });
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.studyTask.deleteMany({ where: { id, userEmail: DEFAULT_USER_EMAIL } });
  return NextResponse.json({ id });
}
