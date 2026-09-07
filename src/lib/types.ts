// Shared client-side types for API payloads (dates as ISO strings since JSON
// serialization converts Prisma DateTime objects to strings).

export interface ExamRecordDTO {
  id: string;
  examName: string;
  examDate: string;
  totalScore: number;
  totalGrade: number | null;
  chineseScore: number | null;
  chineseGrade: number | null;
  englishScore: number | null;
  englishGrade: number | null;
  mathScore: number | null;
  mathGrade: number | null;
  socialScore: number | null;
  socialGrade: number | null;
  scienceScore: number | null;
  scienceGrade: number | null;
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
