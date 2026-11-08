ALTER TABLE "Goal"
ADD COLUMN "targetEnglishAccuracy" DOUBLE PRECISION,
ADD COLUMN "targetDate" DATE;

ALTER TABLE "EnglishRecord"
ADD COLUMN "questionsAttempted" INTEGER,
ADD COLUMN "questionsCorrect" INTEGER;

CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "studyDate" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'other',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnglishQuestion" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "englishRecordId" TEXT,
    "questionIdentifier" TEXT NOT NULL DEFAULT '',
    "questionContent" TEXT NOT NULL DEFAULT '',
    "userAnswer" TEXT NOT NULL DEFAULT '',
    "correctAnswer" TEXT NOT NULL DEFAULT '',
    "errorCategory" TEXT NOT NULL DEFAULT 'other',
    "correctionNotes" TEXT NOT NULL DEFAULT '',
    "reviewStatus" TEXT NOT NULL DEFAULT 'not_reviewed',
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnglishQuestion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EnglishQuestion_englishRecordId_fkey" FOREIGN KEY ("englishRecordId")
        REFERENCES "EnglishRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "EnglishQuestionReview" (
    "id" TEXT NOT NULL,
    "englishQuestionId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "EnglishQuestionReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EnglishQuestionReview_englishQuestionId_fkey" FOREIGN KEY ("englishQuestionId")
        REFERENCES "EnglishQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Weakness" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'other',
    "topic" TEXT NOT NULL DEFAULT '',
    "discoveredAt" DATE NOT NULL,
    "errorDescription" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'not_reviewed',
    "reviewNotes" TEXT NOT NULL DEFAULT '',
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Weakness_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeaknessReview" (
    "id" TEXT NOT NULL,
    "weaknessId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "WeaknessReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WeaknessReview_weaknessId_fkey" FOREIGN KEY ("weaknessId")
        REFERENCES "Weakness"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "StudySession_userEmail_studyDate_idx" ON "StudySession"("userEmail", "studyDate");
CREATE INDEX "EnglishQuestion_userEmail_reviewStatus_idx" ON "EnglishQuestion"("userEmail", "reviewStatus");
CREATE INDEX "EnglishQuestion_userEmail_errorCategory_idx" ON "EnglishQuestion"("userEmail", "errorCategory");
CREATE INDEX "EnglishQuestionReview_englishQuestionId_reviewedAt_idx" ON "EnglishQuestionReview"("englishQuestionId", "reviewedAt");
CREATE INDEX "Weakness_userEmail_status_idx" ON "Weakness"("userEmail", "status");
CREATE INDEX "Weakness_userEmail_discoveredAt_idx" ON "Weakness"("userEmail", "discoveredAt");
CREATE INDEX "WeaknessReview_weaknessId_reviewedAt_idx" ON "WeaknessReview"("weaknessId", "reviewedAt");
