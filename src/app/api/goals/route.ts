import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GOALS } from "@/lib/data";
import { dateFromKey, isDateKey, readJsonObject } from "@/lib/learning-validation";

const GRADE_KEYS = [
  "targetTotalGrade",
  "targetChineseGrade",
  "targetEnglishGrade",
  "targetMathGrade",
  "targetMathBGrade",
  "targetScienceGrade",
  "targetSocialGrade",
] as const;

function parseGoalNumber(value: unknown, key: (typeof GRADE_KEYS)[number] | "targetEnglishAccuracy"): number | null | undefined {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const max = key === "targetEnglishAccuracy" ? 100 : key === "targetTotalGrade" ? 90 : 15;
  return value >= 0 && value <= max ? value : undefined;
}

export async function GET(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let goal = await prisma.goal.findUnique({ where: { userEmail } });

  if (!goal) {
    // Only the data owner gets the seeded example goal; new accounts start blank.
    const isOwner = userEmail === (process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "");
    goal = await prisma.goal.create({
      data: isOwner
        ? {
            userEmail,
            goalName: DEFAULT_GOALS.goalName,
            targetTotalGrade: DEFAULT_GOALS.targetTotalGrade,
            targetChineseGrade: DEFAULT_GOALS.targetChineseGrade,
            targetEnglishGrade: DEFAULT_GOALS.targetEnglishGrade,
            targetMathGrade: DEFAULT_GOALS.targetMathGrade,
            targetScienceGrade: DEFAULT_GOALS.targetScienceGrade,
            targetSocialGrade: DEFAULT_GOALS.targetSocialGrade,
          }
        : { userEmail, goalName: "" },
    });
  }

  return NextResponse.json({ ...goal, targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null });
}

export async function PUT(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await readJsonObject(request);
  if (!input) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const numericValues = Object.fromEntries(
    [...GRADE_KEYS, "targetEnglishAccuracy" as const].map((key) => [key, parseGoalNumber(input[key], key)])
  ) as Record<(typeof GRADE_KEYS)[number] | "targetEnglishAccuracy", number | null | undefined>;
  if (Object.values(numericValues).some((value) => value === undefined)) {
    return NextResponse.json({ error: "Goal scores are outside their allowed ranges" }, { status: 400 });
  }
  const targetDate = input.targetDate === undefined || input.targetDate === null || input.targetDate === ""
    ? null
    : isDateKey(input.targetDate)
      ? dateFromKey(input.targetDate)
      : undefined;
  if (targetDate === undefined) return NextResponse.json({ error: "Invalid targetDate" }, { status: 400 });
  const values = {
    goalName: typeof input.goalName === "string" ? input.goalName.trim().slice(0, 100) : "",
    ...numericValues,
    targetDate,
  };

  const goal = await prisma.goal.upsert({
    where: { userEmail },
    update: values,
    create: { userEmail, ...values },
  });

  return NextResponse.json({ ...goal, targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null });
}