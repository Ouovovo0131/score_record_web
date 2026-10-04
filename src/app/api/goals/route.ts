import { NextRequest, NextResponse } from "next/server";
import { requireDataUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GOALS } from "@/lib/data";

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

  return NextResponse.json(goal);
}

export async function PUT(request: NextRequest) {
  const userEmail = await requireDataUser(request);
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const values = {
    goalName: typeof body.goalName === "string" ? body.goalName.slice(0, 100) : "",
    targetTotalGrade: body.targetTotalGrade ?? null,
    targetChineseGrade: body.targetChineseGrade ?? null,
    targetEnglishGrade: body.targetEnglishGrade ?? null,
    targetMathGrade: body.targetMathGrade ?? null,
    targetScienceGrade: body.targetScienceGrade ?? null,
    targetSocialGrade: body.targetSocialGrade ?? null,
  };

  const goal = await prisma.goal.upsert({
    where: { userEmail },
    update: values,
    create: { userEmail, ...values },
  });

  return NextResponse.json(goal);
}