import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import {
  boundedText,
  isOneOf,
  isOptionalRecordId,
  QUESTION_ERROR_CATEGORIES,
  QUESTION_REVIEW_STATUSES,
  readJsonObject,
} from "@/lib/learning-validation";

const questionFields = {
  id: true,
  englishRecordId: true,
  questionIdentifier: true,
  questionContent: true,
  userAnswer: true,
  correctAnswer: true,
  errorCategory: true,
  correctionNotes: true,
  reviewStatus: true,
  lastReviewedAt: true,
  reviewHistory: { orderBy: { reviewedAt: "desc" as const } },
};

function parseQuestion(body: Record<string, unknown>) {
  const questionIdentifier = boundedText(body.questionIdentifier, 100);
  const questionContent = boundedText(body.questionContent, 2000);
  const userAnswer = boundedText(body.userAnswer, 500);
  const correctAnswer = boundedText(body.correctAnswer, 500);
  const correctionNotes = boundedText(body.correctionNotes, 2000);
  if (
    questionIdentifier === null ||
    questionContent === null ||
    userAnswer === null ||
    correctAnswer === null ||
    correctionNotes === null
  ) return null;
  if (!isOneOf(body.errorCategory, QUESTION_ERROR_CATEGORIES)) return null;
  if (!isOneOf(body.reviewStatus, QUESTION_REVIEW_STATUSES)) return null;
  if (!isOptionalRecordId(body.englishRecordId)) return null;
  if (!questionIdentifier && !questionContent) return null;
  return {
    questionIdentifier,
    questionContent,
    userAnswer,
    correctAnswer,
    correctionNotes,
    errorCategory: body.errorCategory,
    reviewStatus: body.reviewStatus,
    englishRecordId: body.englishRecordId || null,
  };
}

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = request.nextUrl.searchParams.get("status");
  const category = request.nextUrl.searchParams.get("category");
  const questions = await prisma.englishQuestion.findMany({
    where: {
      userEmail,
      ...(status && isOneOf(status, QUESTION_REVIEW_STATUSES) ? { reviewStatus: status } : {}),
      ...(category && isOneOf(category, QUESTION_ERROR_CATEGORIES) ? { errorCategory: category } : {}),
    },
    select: questionFields,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(questions);
}

export async function POST(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const data = parseQuestion(body);
  if (!data) return NextResponse.json({ error: "Invalid question fields" }, { status: 400 });
  if (data.englishRecordId) {
    const record = await prisma.englishRecord.findFirst({ where: { id: data.englishRecordId, userEmail }, select: { id: true } });
    if (!record) return NextResponse.json({ error: "English record not found" }, { status: 404 });
  }
  const question = await prisma.englishQuestion.create({
    data: { ...data, userEmail },
    select: questionFields,
  });
  return NextResponse.json(question, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await readJsonObject(request);
  if (!input) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  if (typeof input.id !== "string" || !input.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  const fields = ["questionIdentifier", "questionContent", "userAnswer", "correctAnswer", "correctionNotes"] as const;
  const limits = { questionIdentifier: 100, questionContent: 2000, userAnswer: 500, correctAnswer: 500, correctionNotes: 2000 };
  for (const field of fields) {
    if (input[field] === undefined) continue;
    const value = boundedText(input[field], limits[field]);
    if (value === null) return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
    patch[field] = value;
  }
  if (input.errorCategory !== undefined) {
    if (!isOneOf(input.errorCategory, QUESTION_ERROR_CATEGORIES)) return NextResponse.json({ error: "Invalid errorCategory" }, { status: 400 });
    patch.errorCategory = input.errorCategory;
  }
  if (input.reviewStatus !== undefined) {
    if (!isOneOf(input.reviewStatus, QUESTION_REVIEW_STATUSES)) return NextResponse.json({ error: "Invalid reviewStatus" }, { status: 400 });
    patch.reviewStatus = input.reviewStatus;
    if (input.reviewStatus === "reviewed") patch.lastReviewedAt = new Date();
  }
  if (input.englishRecordId !== undefined) {
    if (!isOptionalRecordId(input.englishRecordId)) return NextResponse.json({ error: "Invalid englishRecordId" }, { status: 400 });
    if (input.englishRecordId) {
      const record = await prisma.englishRecord.findFirst({ where: { id: input.englishRecordId, userEmail }, select: { id: true } });
      if (!record) return NextResponse.json({ error: "English record not found" }, { status: 404 });
    }
    patch.englishRecordId = input.englishRecordId || null;
  }
  const reviewNote = input.reviewNote === undefined ? undefined : boundedText(input.reviewNote, 2000);
  if (reviewNote === null) return NextResponse.json({ error: "Invalid reviewNote" }, { status: 400 });
  if (reviewNote !== undefined) {
    patch.lastReviewedAt = new Date();
    patch.reviewStatus = "reviewed";
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.englishQuestion.updateMany({ where: { id: input.id as string, userEmail }, data: patch });
    if (!updated.count) return null;
    if (reviewNote !== undefined) {
      await tx.englishQuestionReview.create({
        data: { englishQuestionId: input.id as string, note: reviewNote },
      });
    }
    return tx.englishQuestion.findFirst({ where: { id: input.id as string, userEmail }, select: questionFields });
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const result = await prisma.englishQuestion.deleteMany({ where: { id, userEmail } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id });
}
