// NOTE: Not protected by server-side auth verification - see the
// exam-records route for the accepted tradeoff note.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { dateFromKey, isDateKey, isOneOf, readJsonObject } from "@/lib/learning-validation";

const SUBJECT_KEYS = ["chinese", "english", "math", "mathB", "science", "social", "other"] as const;
const KIND_KEYS = ["exam", "review"] as const;

function validDate(value: unknown): value is string {
  return isDateKey(value);
}

function serialize(task: {
  id: string;
  title: string;
  subject: string;
  kind: string;
  startDate: Date;
  endDate: Date;
  note: string;
  done: boolean;
}) {
  return {
    id: task.id,
    title: task.title,
    subject: task.subject,
    kind: task.kind,
    startDate: task.startDate.toISOString().slice(0, 10),
    endDate: task.endDate.toISOString().slice(0, 10),
    note: task.note,
    done: task.done,
  };
}

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await prisma.studyTask.findMany({
    where: { userEmail },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(tasks.map(serialize));
}

export async function POST(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 100) : "";
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!validDate(body.startDate)) return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
  const endDate = body.endDate ? body.endDate : body.startDate;
  if (!validDate(endDate) || endDate < body.startDate) return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });

  const subject = body.subject === undefined ? "other" : isOneOf(body.subject, SUBJECT_KEYS) ? body.subject : null;
  const kind = body.kind === undefined ? "review" : isOneOf(body.kind, KIND_KEYS) ? body.kind : null;
  if (subject === null) {
    return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
  }
  if (kind === null) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  const task = await prisma.studyTask.create({
    data: {
      userEmail,
      title,
      subject,
      kind,
      startDate: dateFromKey(body.startDate),
      endDate: dateFromKey(endDate),
      note: typeof body.note === "string" ? body.note.slice(0, 300) : "",
    },
  });
  return NextResponse.json(serialize(task), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Prisma.StudyTaskUpdateManyMutationInput = {};
  if (typeof body.done === "boolean") data.done = body.done;
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 100);
  if (typeof body.note === "string") data.note = body.note.slice(0, 300);
  if (body.subject !== undefined) {
    if (!isOneOf(body.subject, SUBJECT_KEYS)) return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    data.subject = body.subject;
  }
  if (body.kind !== undefined) {
    if (!isOneOf(body.kind, KIND_KEYS)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    data.kind = body.kind;
  }
  if (body.startDate !== undefined) {
    if (!validDate(body.startDate)) return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    data.startDate = dateFromKey(body.startDate);
  }
  if (body.endDate !== undefined) {
    if (!validDate(body.endDate)) return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
    data.endDate = dateFromKey(body.endDate);
  }
  const existing = await prisma.studyTask.findFirst({
    where: { id, userEmail },
    select: { startDate: true, endDate: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const startDate = data.startDate instanceof Date ? data.startDate : existing.startDate;
  const endDate = data.endDate instanceof Date ? data.endDate : existing.endDate;
  if (endDate < startDate) return NextResponse.json({ error: "endDate must be on or after startDate" }, { status: 400 });
  if (!Object.keys(data).length) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });

  const result = await prisma.studyTask.updateMany({ where: { id, userEmail }, data });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const task = await prisma.studyTask.findFirst({ where: { id, userEmail } });
  return NextResponse.json(task ? serialize(task) : { id });
}

export async function DELETE(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.studyTask.deleteMany({ where: { id, userEmail } });
  return NextResponse.json({ id });
}
