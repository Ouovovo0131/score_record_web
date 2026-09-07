// NOTE: Not protected by server-side auth verification — see the
// exam-records route for the accepted tradeoff note.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GOALS } from "@/lib/data";

const DEFAULT_USER_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "default@example.com";

export async function GET() {
  let goal = await prisma.goal.findUnique({ where: { userEmail: DEFAULT_USER_EMAIL } });

  if (!goal) {
    goal = await prisma.goal.create({
      data: {
        userEmail: DEFAULT_USER_EMAIL,
        goalName: DEFAULT_GOALS.goalName,
        targetTotalGrade: DEFAULT_GOALS.targetTotalGrade,
        targetChineseGrade: DEFAULT_GOALS.targetChineseGrade,
        targetEnglishGrade: DEFAULT_GOALS.targetEnglishGrade,
        targetMathGrade: DEFAULT_GOALS.targetMathGrade,
        targetScienceGrade: DEFAULT_GOALS.targetScienceGrade,
        targetSocialGrade: DEFAULT_GOALS.targetSocialGrade,
      },
    });
  }

  return NextResponse.json(goal);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  const goal = await prisma.goal.upsert({
    where: { userEmail: DEFAULT_USER_EMAIL },
    update: {
      goalName: body.goalName,
      targetTotalGrade: body.targetTotalGrade ?? null,
      targetChineseGrade: body.targetChineseGrade ?? null,
      targetEnglishGrade: body.targetEnglishGrade ?? null,
      targetMathGrade: body.targetMathGrade ?? null,
      targetScienceGrade: body.targetScienceGrade ?? null,
      targetSocialGrade: body.targetSocialGrade ?? null,
    },
    create: {
      userEmail: DEFAULT_USER_EMAIL,
      goalName: body.goalName,
      targetTotalGrade: body.targetTotalGrade ?? null,
      targetChineseGrade: body.targetChineseGrade ?? null,
      targetEnglishGrade: body.targetEnglishGrade ?? null,
      targetMathGrade: body.targetMathGrade ?? null,
      targetScienceGrade: body.targetScienceGrade ?? null,
      targetSocialGrade: body.targetSocialGrade ?? null,
    },
  });

  return NextResponse.json(goal);
}
