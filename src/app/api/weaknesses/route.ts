import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { boundedText, dateFromKey, isDateKey, isOneOf, readJsonObject, STUDY_SUBJECTS, WEAKNESS_STATUSES } from "@/lib/learning-validation";

const weaknessFields = {
  id: true,
  title: true,
  subject: true,
  topic: true,
  discoveredAt: true,
  errorDescription: true,
  status: true,
  reviewNotes: true,
  lastReviewedAt: true,
  reviewHistory: { orderBy: { reviewedAt: "desc" as const } },
};

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = request.nextUrl.searchParams.get("status");
  const weaknesses = await prisma.weakness.findMany({
    where: { userEmail, ...(status && isOneOf(status, WEAKNESS_STATUSES) ? { status } : {}) },
    select: weaknessFields,
    orderBy: [{ status: "asc" }, { discoveredAt: "desc" }],
  });
  return NextResponse.json(weaknesses);
}

export async function POST(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await readJsonObject(request);
  if (!input) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const title = boundedText(input.title, 150);
  const topic = boundedText(input.topic, 150);
  const errorDescription = boundedText(input.errorDescription, 2000);
  const reviewNotes = boundedText(input.reviewNotes, 2000);
  if (title === null || topic === null || errorDescription === null || reviewNotes === null) {
    return NextResponse.json({ error: "Invalid weakness text fields" }, { status: 400 });
  }
  if (!title.trim() || !isDateKey(input.discoveredAt) || !isOneOf(input.subject, STUDY_SUBJECTS) ||
      !isOneOf(input.status, WEAKNESS_STATUSES)) {
    return NextResponse.json({ error: "Invalid weakness fields" }, { status: 400 });
  }
  const weakness = await prisma.weakness.create({
    data: {
      userEmail,
      title,
      subject: input.subject,
      topic,
      discoveredAt: dateFromKey(input.discoveredAt),
      errorDescription,
      reviewNotes,
      status: input.status,
    },
    select: weaknessFields,
  });
  return NextResponse.json(weakness, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await readJsonObject(request);
  if (!input) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  if (typeof input.id !== "string" || !input.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: Record<string, unknown> = {};
  for (const [field, max] of [["title", 150], ["topic", 150], ["errorDescription", 2000], ["reviewNotes", 2000]] as const) {
    if (input[field] === undefined) continue;
    const value = boundedText(input[field], max);
    if (value === null || (field === "title" && !value)) return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
    data[field] = value;
  }
  if (input.subject !== undefined) {
    if (!isOneOf(input.subject, STUDY_SUBJECTS)) return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    data.subject = input.subject;
  }
  if (input.discoveredAt !== undefined) {
    if (!isDateKey(input.discoveredAt)) return NextResponse.json({ error: "Invalid discoveredAt" }, { status: 400 });
    data.discoveredAt = dateFromKey(input.discoveredAt);
  }
  if (input.status !== undefined) {
    if (!isOneOf(input.status, WEAKNESS_STATUSES)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    data.status = input.status;
  }
  const reviewNote = input.reviewNote === undefined ? undefined : boundedText(input.reviewNote, 2000);
  if (reviewNote === null) return NextResponse.json({ error: "Invalid reviewNote" }, { status: 400 });
  if (reviewNote !== undefined) {
    data.lastReviewedAt = new Date();
    data.reviewNotes = reviewNote;
    if (input.status === undefined) data.status = "reviewing";
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.weakness.updateMany({ where: { id: input.id as string, userEmail }, data });
    if (!updated.count) return null;
    if (reviewNote !== undefined) await tx.weaknessReview.create({ data: { weaknessId: input.id as string, note: reviewNote } });
    return tx.weakness.findFirst({ where: { id: input.id as string, userEmail }, select: weaknessFields });
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const result = await prisma.weakness.deleteMany({ where: { id, userEmail } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id });
}
