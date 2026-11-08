// Shared client-side types for API payloads (dates as ISO strings since JSON
// serialization converts Prisma DateTime objects to strings).

export interface ExamRecordDTO {
  id: string;
  examName: string;
  examDate: string;
  totalGrade: number | null;
  chineseScore: number | null;
  chineseGrade: number | null;
  englishScore: number | null;
  englishGrade: number | null;
  mathScore: number | null;
  mathGrade: number | null;
  mathBScore: number | null;
  mathBGrade: number | null;
  socialScore: number | null;
  socialGrade: number | null;
  mathBChoiceScore: number | null;
  mathBMixedScore: number | null;
  scienceScore: number | null;
  scienceGrade: number | null;
  chineseComprehensiveScore: number | null;
  chineseWritingScore: number | null;
  englishChoiceScore: number | null;
  englishMixedScore: number | null;
  englishTranslationScore: number | null;
  englishEssayScore: number | null;
  mathChoiceScore: number | null;
  mathMixedScore: number | null;
  socialHistoryScore: number | null;
  socialGeographyScore: number | null;
  socialCivicsScore: number | null;
  scienceChoiceScore: number | null;
  scienceMixedScore: number | null;
  physicsScore: number | null;
  chemistryScore: number | null;
  biologyScore: number | null;
  earthScienceScore: number | null;
  chineseTopGrade: number | null;
  chineseFrontGrade: number | null;
  chineseAverageGrade: number | null;
  chineseBackGrade: number | null;
  chineseBottomGrade: number | null;
  englishTopGrade: number | null;
  englishFrontGrade: number | null;
  englishAverageGrade: number | null;
  englishBackGrade: number | null;
  englishBottomGrade: number | null;
  mathTopGrade: number | null;
  mathFrontGrade: number | null;
  mathAverageGrade: number | null;
  mathBackGrade: number | null;
  mathBottomGrade: number | null;
  mathBTopGrade: number | null;
  mathBFrontGrade: number | null;
  mathBAverageGrade: number | null;
  mathBBackGrade: number | null;
  mathBBottomGrade: number | null;
  scienceTopGrade: number | null;
  scienceFrontGrade: number | null;
  scienceAverageGrade: number | null;
  scienceBackGrade: number | null;
  scienceBottomGrade: number | null;
  socialTopGrade: number | null;
  socialFrontGrade: number | null;
  socialAverageGrade: number | null;
  socialBackGrade: number | null;
  socialBottomGrade: number | null;
  classRank: number | null;
  classTotal: number | null;
  schoolRank: number | null;
  schoolTotal: number | null;
  overallRank: number | null;
  overallTotal: number | null;
  reviewTags: string[];
  notes: string;
}

export interface EnglishRecordDTO {
  id: string;
  practiceType: string;
  practiceDate: string;
  practiceName: string;
  totalScore: number | null;
  questionsAttempted: number | null;
  questionsCorrect: number | null;
  vocabularyScore: number | null;
  clozeScore: number | null;
  contextScore: number | null;
  structureScore: number | null;
  readingScore: number | null;
  mixedScore: number | null;
  translationScore: number | null;
  notes: string;
}

export interface GoalDTO {
  goalName: string;
  targetTotalGrade: number | null;
  targetChineseGrade: number | null;
  targetEnglishGrade: number | null;
  targetMathGrade: number | null;
  targetMathBGrade: number | null;
  targetScienceGrade: number | null;
  targetSocialGrade: number | null;
  targetEnglishAccuracy: number | null;
  targetDate: string | null;
}

export interface StudySessionDTO {
  id: string;
  studyDate: string;
  minutes: number;
  subject: string;
  note: string;
}

export type QuestionReviewStatus = "not_reviewed" | "reviewing" | "reviewed";

export interface EnglishQuestionDTO {
  id: string;
  englishRecordId: string | null;
  questionIdentifier: string;
  questionContent: string;
  userAnswer: string;
  correctAnswer: string;
  errorCategory: string;
  correctionNotes: string;
  reviewStatus: QuestionReviewStatus;
  lastReviewedAt: string | null;
  reviewHistory: { id: string; reviewedAt: string; note: string }[];
}

export type WeaknessStatus = "not_reviewed" | "reviewing" | "improving" | "resolved";

export interface WeaknessDTO {
  id: string;
  title: string;
  subject: string;
  topic: string;
  discoveredAt: string;
  errorDescription: string;
  status: WeaknessStatus;
  reviewNotes: string;
  lastReviewedAt: string | null;
  reviewHistory: { id: string; reviewedAt: string; note: string }[];
}
