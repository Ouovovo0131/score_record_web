import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { boundedText, dateFromKey, isDateKey, isOneOf, readJsonObject, STUDY_SUBJECTS } from "@/lib/learning-validation";

function serialize(session: {
  id: string;
  studyDate: Date;
  minutes: number;
  subject: string;
  note: string;
}) {
  return { ...session, studyDate: session.studyDate.toISOString().slice(0, 10) };
}

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await prisma.studySession.findMany({
    where: { userEmail },
    orderBy: [{ studyDate: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(sessions.map(serialize));
}

export async function POST(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await readJsonObject(request);
  if (!input) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const note = boundedText(input.note, 300);
  if (!isDateKey(input.studyDate)) return NextResponse.json({ error: "Invalid studyDate" }, { status: 400 });
  if (!Number.isInteger(input.minutes) || (input.minutes as number) < 1 || (input.minutes as number) > 1440) {
    return NextResponse.json({ error: "minutes must be an integer from 1 to 1440" }, { status: 400 });
  }
  if (!isOneOf(input.subject, STUDY_SUBJECTS) || note === null) {
    return NextResponse.json({ error: "Invalid subject or note" }, { status: 400 });
  }
  const session = await prisma.studySession.create({
    data: { userEmail, studyDate: dateFromKey(input.studyDate), minutes: input.minutes as number, subject: input.subject, note },
  });
  return NextResponse.json(serialize(session), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await readJsonObject(request);
  if (!input) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  if (typeof input.id !== "string" || !input.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: { studyDate?: Date; minutes?: number; subject?: string; note?: string } = {};
  if (input.studyDate !== undefined) {
    if (!isDateKey(input.studyDate)) return NextResponse.json({ error: "Invalid studyDate" }, { status: 400 });
    data.studyDate = dateFromKey(input.studyDate);
  }
  if (input.minutes !== undefined) {
    if (!Number.isInteger(input.minutes) || (input.minutes as number) < 1 || (input.minutes as number) > 1440) {
      return NextResponse.json({ error: "minutes must be an integer from 1 to 1440" }, { status: 400 });
    }
    data.minutes = input.minutes as number;
  }
  if (input.subject !== undefined) {
    if (!isOneOf(input.subject, STUDY_SUBJECTS)) return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    data.subject = input.subject;
  }
  if (input.note !== undefined) {
    const note = boundedText(input.note, 300);
    if (note === null) return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    data.note = note;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  const result = await prisma.studySession.updateMany({ where: { id: input.id, userEmail }, data });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await prisma.studySession.findFirst({ where: { id: input.id, userEmail } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serialize(session));
}

export async function DELETE(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const result = await prisma.studySession.deleteMany({ where: { id, userEmail } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id });
}
