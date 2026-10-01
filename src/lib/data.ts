// Shared constants ported from legacy-static-site/data.js.
// Kept as the single source of truth for subject lists, goals, schedules,
// and default seed data used both by the seed script and the API/UI.

export interface Subject {
  key: "chinese" | "english" | "math" | "social" | "science";
  label: string;
  shortLabel: string;
  scoreKey: string;
  gradeKey: string;
}

export const SUBJECTS: Subject[] = [
  { key: "chinese", label: "國文", shortLabel: "國", scoreKey: "chineseScore", gradeKey: "chineseGrade" },
  { key: "english", label: "英文", shortLabel: "英", scoreKey: "englishScore", gradeKey: "englishGrade" },
  { key: "math", label: "數學 A", shortLabel: "數A", scoreKey: "mathScore", gradeKey: "mathGrade" },
  { key: "social", label: "社會", shortLabel: "社", scoreKey: "socialScore", gradeKey: "socialGrade" },
  { key: "science", label: "自然", shortLabel: "自", scoreKey: "scienceScore", gradeKey: "scienceGrade" },
];

export const DEFAULT_RECORDS = [
  {
    id: "mock-1",
    examName: "第一次模擬考",
    examDate: "2026-07-29",
    totalScore: 235.5,
    totalGrade: 40,
    chineseScore: 56.5,
    chineseGrade: 12,
    englishScore: 41,
    englishGrade: 7,
    mathScore: 73,
    mathGrade: 12,
    socialScore: 0,
    socialGrade: 0,
    scienceScore: 65,
    scienceGrade: 9,
    reviewTags: ["#第一次考", "#沒讀完範圍"],
    notes: "班排 12/30、校排 75/200、總排 13085/39781",
  },
];

export const DEFAULT_GOALS = {
  goalName: "台大資工",
  targetTotalGrade: 54,
  targetChineseGrade: 12,
  targetEnglishGrade: 13,
  targetMathGrade: 15,
  targetSocialGrade: null as number | null,
  targetScienceGrade: 14,
};

export interface FixedSchedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export const FIXED_SCHEDULES: FixedSchedule[] = [
  { id: "schedule-mock-1", name: "第一次模擬考", startDate: "2026-07-29", endDate: "2026-07-30" },
  { id: "schedule-mock-2", name: "第二次模擬考", startDate: "2026-09-02", endDate: "2026-09-03" },
  { id: "schedule-midterm", name: "期中考", startDate: "2026-10-12", endDate: "2026-10-13" },
  { id: "schedule-mock-3", name: "第三次模擬考", startDate: "2026-10-28", endDate: "2026-10-29" },
  { id: "schedule-mock-4", name: "第四次模擬考", startDate: "2026-12-08", endDate: "2026-12-09" },
  { id: "schedule-final", name: "期末考", startDate: "2026-12-16", endDate: "2026-12-17" },
  { id: "schedule-gsat", name: "學測", startDate: "2027-01-22", endDate: "2027-01-24" },
];

export const ENGLISH_PRACTICE_TYPES = [
  { key: "miaomiao", label: "妙妙卷", maxScore: 80 },
  { key: "cloze", label: "克漏字", maxScore: 28 },
] as const;

export type EnglishPracticeType = (typeof ENGLISH_PRACTICE_TYPES)[number]["key"];

// Total score upper bound for the combined "all" trend view: the sum of every
// practice type's own full score (80 + 28 = 108). Kept derived from
// ENGLISH_PRACTICE_TYPES so it automatically stays consistent if a type's
// max score ever changes.
export const ENGLISH_TOTAL_MAX_SCORE = ENGLISH_PRACTICE_TYPES.reduce((sum, type) => sum + type.maxScore, 0);

export const ENGLISH_UNAVAILABLE_CATEGORY_MAP: Record<string, string[]> = {
  miaomiao: [],
  cloze: ["vocabularyScore", "readingScore", "mixedScore"],
};

export const ENGLISH_CATEGORIES = [
  { key: "vocabularyScore", label: "詞彙題", maxScore: 10 },
  { key: "clozeScore", label: "綜合測驗", maxScore: 10 },
  { key: "contextScore", label: "文意選填", maxScore: 10 },
  { key: "structureScore", label: "篇章結構", maxScore: 8 },
  { key: "readingScore", label: "閱讀題", maxScore: 24 },
  { key: "mixedScore", label: "混合題", maxScore: 10 },
] as const;

export const DEFAULT_ENGLISH_RECORDS = [
  {
    id: "eng-2026-07-01-miaomiao-1",
    practiceType: "miaomiao",
    practiceDate: "2026-07-01",
    practiceName: "妙一",
    totalScore: 29,
    vocabularyScore: 6,
    clozeScore: 6,
    contextScore: 3,
    structureScore: 6,
    readingScore: 6,
    mixedScore: 2,
    notes: "第一次寫題本",
  },
  {
    id: "eng-2026-07-08-miaomiao-2",
    practiceType: "miaomiao",
    practiceDate: "2026-07-08",
    practiceName: "妙二",
    totalScore: 35,
    vocabularyScore: 3,
    clozeScore: 5,
    contextScore: 3,
    structureScore: 4,
    readingScore: 20,
    mixedScore: 0,
    notes: "",
  },
  {
    id: "eng-2026-07-15-miaomiao-3",
    practiceType: "miaomiao",
    practiceDate: "2026-07-15",
    practiceName: "妙三",
    totalScore: 28.4,
    vocabularyScore: 4,
    clozeScore: 6,
    contextScore: 2,
    structureScore: 2,
    readingScore: 8,
    mixedScore: 6.4,
    notes: "",
  },
  {
    id: "eng-2026-07-19-miaomiao-4",
    practiceType: "miaomiao",
    practiceDate: "2026-07-19",
    practiceName: "妙四",
    totalScore: 21,
    vocabularyScore: 5,
    clozeScore: 6,
    contextScore: 4,
    structureScore: 0,
    readingScore: 6,
    mixedScore: 0,
    notes: "沒寫完",
  },
  {
    id: "eng-2026-07-22-miaomiao-5",
    practiceType: "miaomiao",
    practiceDate: "2026-07-22",
    practiceName: "妙五",
    totalScore: 31,
    vocabularyScore: 4,
    clozeScore: 5,
    contextScore: 2,
    structureScore: 8,
    readingScore: 12,
    mixedScore: 0,
    notes: "有意識到英文的程度真的不足",
  },
  {
    id: "eng-2026-07-25-miaomiao-6",
    practiceType: "miaomiao",
    practiceDate: "2026-07-25",
    practiceName: "妙六",
    totalScore: 29,
    vocabularyScore: 6,
    clozeScore: 4,
    contextScore: 3,
    structureScore: 8,
    readingScore: 8,
    mixedScore: 0,
    notes: "詞彙量有提升，但還是不夠用",
  },
  {
    id: "eng-2026-08-01-cloze-1",
    practiceType: "cloze",
    practiceDate: "2026-08-01",
    practiceName: "新新世代第一回",
    totalScore: 20,
    vocabularyScore: null,
    clozeScore: 7,
    contextScore: 5,
    structureScore: 8,
    readingScore: null,
    mixedScore: null,
    notes: "寫起來還有點順",
  },
  {
    id: "eng-2026-08-08-cloze-2",
    practiceType: "cloze",
    practiceDate: "2026-08-08",
    practiceName: "新新世代第二回",
    totalScore: 22,
    vocabularyScore: null,
    clozeScore: 6,
    contextScore: 8,
    structureScore: 8,
    readingScore: null,
    mixedScore: null,
    notes: "",
  },
  {
    id: "eng-2026-08-19-cloze-3",
    practiceType: "cloze",
    practiceDate: "2026-08-19",
    practiceName: "新新世代第三回",
    totalScore: 12,
    vocabularyScore: null,
    clozeScore: 4,
    contextScore: 4,
    structureScore: 4,
    readingScore: null,
    mixedScore: null,
    notes: "",
  },
  {
    id: "eng-2026-08-22-cloze-4",
    practiceType: "cloze",
    practiceDate: "2026-08-22",
    practiceName: "新新世代第四回",
    totalScore: 14,
    vocabularyScore: null,
    clozeScore: 4,
    contextScore: 4,
    structureScore: 6,
    readingScore: null,
    mixedScore: null,
    notes: "",
  },
  {
    id: "eng-2026-08-30-cloze-5",
    practiceType: "cloze",
    practiceDate: "2026-08-30",
    practiceName: "人生哲理 第一回",
    totalScore: 20,
    vocabularyScore: null,
    clozeScore: 6,
    contextScore: 10,
    structureScore: 4,
    readingScore: null,
    mixedScore: null,
    notes: "",
  },
  {
    id: "eng-2026-09-06-miaomiao-10",
    practiceType: "miaomiao",
    practiceDate: "2026-09-06",
    practiceName: "妙妙卷 第十回",
    totalScore: 51,
    vocabularyScore: 8,
    clozeScore: 4,
    contextScore: 5,
    structureScore: 8,
    readingScore: 20,
    mixedScore: 6,
    notes: "",
  },
  {
    id: "eng-2026-09-07-cloze-6",
    practiceType: "cloze",
    practiceDate: "2026-09-07",
    practiceName: "人生哲理 第二回",
    totalScore: 20,
    vocabularyScore: null,
    clozeScore: 5,
    contextScore: 7,
    structureScore: 8,
    readingScore: null,
    mixedScore: null,
    notes: "速度適中、單字量有增加",
  },
];

export function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface PredictionResult {
  /** The predicted next score. */
  value: number;
  /**
   * True when the value is a fallback (the most recent score) rather than
   * an actual regression estimate, because there weren't enough points
   * (< 2) to compute a trend. Callers should surface this so the UI doesn't
   * present a single-point fallback as if it were a full regression result.
   */
  isApproximate: boolean;
}

/**
 * Predicts the next value of a chronological score series using simple
 * linear regression (index as x, score as y). Returns null when there is no
 * data at all. When there are fewer than 2 points the regression slope
 * cannot be determined, so we fall back to the most recent score (flagged
 * via `isApproximate`) instead of forcing a value of 0 — a single data
 * point is still the best guess we have for "next time" performance.
 */
export function predictNextValue(values: number[]): PredictionResult | null {
  if (!values.length) return null;
  if (values.length < 2) return { value: values[values.length - 1], isApproximate: true };

  const meanX = (values.length - 1) / 2;
  const meanY = average(values);
  const denominator = values.reduce((sum, _, index) => sum + (index - meanX) ** 2, 0);
  const slope = values.reduce((sum, value, index) => sum + (index - meanX) * (value - meanY), 0) / denominator;
  return { value: meanY + slope * (values.length - meanX), isApproximate: false };
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? dateString
    : new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function compactDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}
