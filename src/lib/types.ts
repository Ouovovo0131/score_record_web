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
  scienceTopGrade: number | null;
  scienceFrontGrade: number | null;
  scienceAverageGrade: number | null;
  scienceBackGrade: number | null;
  scienceBottomGrade: number | null;
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
  targetScienceGrade: number | null;
  targetSocialGrade: number | null;
}
