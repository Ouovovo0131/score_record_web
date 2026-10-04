// Prisma seed script. Run with `npx prisma db seed` after `npx prisma db push`
// once POSTGRES_URL is set. Uses upsert with fixed IDs so re-running does not
// duplicate data.
import { PrismaClient } from "@prisma/client";
import { DEFAULT_RECORDS, DEFAULT_ENGLISH_RECORDS, DEFAULT_GOALS } from "../src/lib/data";

const prisma = new PrismaClient();

const USER_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "default@example.com";

async function main() {
  for (const record of DEFAULT_RECORDS) {
    await prisma.examRecord.upsert({
      where: { id: record.id },
      update: {},
      create: {
        id: record.id,
        userEmail: USER_EMAIL,
        examName: record.examName,
        examDate: new Date(record.examDate),
        totalScore: record.totalScore,
        totalGrade: record.totalGrade,
        chineseScore: record.chineseScore,
        chineseGrade: record.chineseGrade,
        englishScore: record.englishScore,
        englishGrade: record.englishGrade,
        mathScore: record.mathScore,
        mathGrade: record.mathGrade,
        socialScore: record.socialScore,
        socialGrade: record.socialGrade,
        scienceScore: record.scienceScore,
        scienceGrade: record.scienceGrade,
        physicsScore: record.physicsScore,
        chemistryScore: record.chemistryScore,
        biologyScore: record.biologyScore,
        earthScienceScore: record.earthScienceScore,
        reviewTags: record.reviewTags,
        notes: record.notes,
      },
    });
  }

  for (const record of DEFAULT_ENGLISH_RECORDS) {
    await prisma.englishRecord.upsert({
      where: { id: record.id },
      update: {},
      create: {
        id: record.id,
        userEmail: USER_EMAIL,
        practiceType: record.practiceType,
        practiceDate: new Date(record.practiceDate),
        practiceName: record.practiceName,
        totalScore: record.totalScore,
        vocabularyScore: record.vocabularyScore,
        clozeScore: record.clozeScore,
        contextScore: record.contextScore,
        structureScore: record.structureScore,
        readingScore: record.readingScore,
        mixedScore: record.mixedScore,
        notes: record.notes,
      },
    });
  }

  await prisma.goal.upsert({
    where: { userEmail: USER_EMAIL },
    update: {},
    create: {
      userEmail: USER_EMAIL,
      goalName: DEFAULT_GOALS.goalName,
      targetTotalGrade: DEFAULT_GOALS.targetTotalGrade,
      targetChineseGrade: DEFAULT_GOALS.targetChineseGrade,
      targetEnglishGrade: DEFAULT_GOALS.targetEnglishGrade,
      targetMathGrade: DEFAULT_GOALS.targetMathGrade,
      targetScienceGrade: DEFAULT_GOALS.targetScienceGrade,
      targetSocialGrade: DEFAULT_GOALS.targetSocialGrade,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
