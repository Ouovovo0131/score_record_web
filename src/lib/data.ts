// Shared constants ported from legacy-static-site/data.js.
// Kept as the single source of truth for subject lists, goals, schedules,
// and default seed data used both by the seed script and the API/UI.

export interface Subject {
  key: "chinese" | "english" | "math" | "mathB" | "science" | "social";
  label: string;
  shortLabel: string;
  scoreKey: string;
  gradeKey: string;
  components: { key: string; label: string; maxScore?: number }[];
}

export const SUBJECTS: Subject[] = [
  {
    key: "chinese",
    label: "國文",
    shortLabel: "國",
    scoreKey: "chineseScore",
    gradeKey: "chineseGrade",
    components: [
      { key: "chineseComprehensiveScore", label: "國綜", maxScore: 100 },
      { key: "chineseWritingScore", label: "國寫", maxScore: 50 },
    ],
  },
  {
    key: "english",
    label: "英文",
    shortLabel: "英",
    scoreKey: "englishScore",
    gradeKey: "englishGrade",
    components: [
      { key: "englishChoiceScore", label: "選擇題", maxScore: 62 },
      { key: "englishMixedScore", label: "混合題", maxScore: 10 },
      { key: "englishTranslationScore", label: "翻譯", maxScore: 8 },
      { key: "englishEssayScore", label: "作文", maxScore: 20 },
    ],
  },
  {
    key: "math",
    label: "數A",
    shortLabel: "數A",
    scoreKey: "mathScore",
    gradeKey: "mathGrade",
    components: [
      { key: "mathChoiceScore", label: "選擇題", maxScore: 85 },
      { key: "mathMixedScore", label: "混合題", maxScore: 15 },
    ],
  },
  {
    key: "mathB",
    label: "數B",
    shortLabel: "數B",
    scoreKey: "mathBScore",
    gradeKey: "mathBGrade",
    components: [
      { key: "mathBChoiceScore", label: "選擇題", maxScore: 85 },
      { key: "mathBMixedScore", label: "混合題", maxScore: 15 },
    ],
  },
  {
    key: "science",
    label: "自然",
    shortLabel: "自",
    scoreKey: "scienceScore",
    gradeKey: "scienceGrade",
    components: [
      { key: "scienceChoiceScore", label: "選擇題", maxScore: 72 },
      { key: "scienceMixedScore", label: "混合題", maxScore: 56 },
    ],
  },
  {
    key: "social",
    label: "社會",
    shortLabel: "社",
    scoreKey: "socialScore",
    gradeKey: "socialGrade",
    components: [
      { key: "socialHistoryScore", label: "歷史", maxScore: 48 },
      { key: "socialGeographyScore", label: "地理", maxScore: 48 },
      { key: "socialCivicsScore", label: "公民", maxScore: 48 },
    ],
  },
];

export type Track = "science" | "social" | "all";

export const TRACK_LABELS: Record<Track, string> = { science: "自然組", social: "社會組", all: "全科" };

// Science: Chinese/English/Math A + Science. Social: Chinese/English/Math A + Math B + Social.
// All: every subject.
export function subjectsForTrack(track: Track | null | undefined): Subject[] {
  if (track === "all") return SUBJECTS;
  const hidden: Subject["key"][] = track === "social" ? ["science"] : ["social", "mathB"];
  return SUBJECTS.filter((subject) => !hidden.includes(subject.key));
}

export const SCIENCE_DETAIL_MAX_SCORE = 32;

export const SCIENCE_DETAIL_SCORES = [
  { key: "physicsScore", legacyKey: "physicsNonChoiceScore", label: "物理" },
  { key: "chemistryScore", legacyKey: "chemistryNonChoiceScore", label: "化學" },
  { key: "biologyScore", legacyKey: "biologyNonChoiceScore", label: "生物" },
  { key: "earthScienceScore", legacyKey: "earthScienceNonChoiceScore", label: "地球科學" },
] as const;

export function calculateSubjectScore(
  record: Record<string, number | null | undefined>,
  subject: Subject
): number | null {
  const values = subject.components.map(({ key }) => record[key]);
  if (subject.key === "social" && !values.some((value) => Number.isFinite(value))) return null;
  if (!values.some((value) => Number.isFinite(value))) {
    const legacyScore = record[subject.scoreKey];
    return Number.isFinite(legacyScore) ? (legacyScore as number) : null;
  }
  if (subject.key === "chinese") {
    return ((record.chineseComprehensiveScore ?? 0) / 2) + (record.chineseWritingScore ?? 0);
  }
  return values.reduce<number>((sum, value) => sum + (Number.isFinite(value) ? (value as number) : 0), 0);
}

export function calculateTotalGrade(record: Record<string, number | null | undefined>, subjects: Subject[] = SUBJECTS): number | null {
  const grades = subjects.map(({ gradeKey }) => record[gradeKey]).filter(Number.isFinite) as number[];
  return grades.length ? grades.reduce((sum, grade) => sum + grade, 0) : null;
}

export const BENCHMARKS = [
  { key: "top", label: "頂標" },
  { key: "front", label: "前標" },
  { key: "average", label: "均標" },
  { key: "back", label: "後標" },
  { key: "bottom", label: "底標" },
] as const;

export const RANK_FIELDS = [
  { key: "classRank", totalKey: "classTotal", label: "班排" },
  { key: "schoolRank", totalKey: "schoolTotal", label: "校排" },
  { key: "overallRank", totalKey: "overallTotal", label: "總排" },
] as const;

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
  targetMathBGrade: null as number | null,
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
  { key: "miaomiao", label: "妙妙卷", maxScore: 80, color: "#3563e9" },
  { key: "cloze", label: "克漏字", maxScore: 28, color: "#20a16b" },
  { key: "haohao", label: "好好學", maxScore: 65, color: "#8b5cf6" },
] as const;

export type EnglishPracticeType = (typeof ENGLISH_PRACTICE_TYPES)[number]["key"];

export const ENGLISH_TOTAL_MAX_SCORE = Math.max(...ENGLISH_PRACTICE_TYPES.map((type) => type.maxScore));

export const ENGLISH_PRACTICE_NAME_HINTS: Record<EnglishPracticeType, string> = {
  miaomiao: "妙幾",
  cloze: "主題幾第幾回",
  haohao: "單元幾",
};

export const ENGLISH_UNAVAILABLE_CATEGORY_MAP: Record<string, string[]> = {
  miaomiao: [],
  cloze: ["vocabularyScore", "readingScore", "mixedScore", "translationScore"],
  haohao: ["vocabularyScore"],
};

export const ENGLISH_CATEGORIES: {
  key: string;
  label: string;
  maxScore: number;
  maxScoreByType?: Partial<Record<EnglishPracticeType, number>>;
}[] = [
  { key: "vocabularyScore", label: "詞彙題", maxScore: 10 },
  { key: "clozeScore", label: "綜合測驗", maxScore: 10, maxScoreByType: { haohao: 5 } },
  { key: "contextScore", label: "文意選填", maxScore: 10 },
  { key: "structureScore", label: "篇章結構", maxScore: 8 },
  { key: "readingScore", label: "閱讀測驗", maxScore: 24, maxScoreByType: { haohao: 8 } },
  { key: "mixedScore", label: "混合題", maxScore: 10 },
  { key: "translationScore", label: "翻譯", maxScore: 8, maxScoreByType: { haohao: 24 } },
];

export function getEnglishCategoryMaxScore(categoryKey: string, practiceType: string): number {
  const category = ENGLISH_CATEGORIES.find((item) => item.key === categoryKey);
  return category?.maxScoreByType?.[practiceType as EnglishPracticeType] ?? category?.maxScore ?? 0;
}

export function validateEnglishRecordInput(body: Record<string, unknown>): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid record.";
  const practiceType = ENGLISH_PRACTICE_TYPES.find((type) => type.key === body.practiceType);
  if (!practiceType) return "Invalid practice type.";
  if (typeof body.practiceDate !== "string" || !Number.isFinite(Date.parse(body.practiceDate))) {
    return "Invalid practice date.";
  }
  if (body.practiceName !== undefined && typeof body.practiceName !== "string") {
    return "Invalid practice name.";
  }

  for (const category of ENGLISH_CATEGORIES) {
    const value = body[category.key];
    if (ENGLISH_UNAVAILABLE_CATEGORY_MAP[practiceType.key].includes(category.key)) {
      if (value !== null && value !== undefined) return "Score category is unavailable for this practice type.";
      continue;
    }
    if (value !== null && value !== undefined &&
      (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > getEnglishCategoryMaxScore(category.key, practiceType.key))) {
      return "Invalid category score.";
    }
  }

  const totalScore = body.totalScore;
  if (totalScore !== null && totalScore !== undefined &&
    (typeof totalScore !== "number" || !Number.isFinite(totalScore) || totalScore < 0 || totalScore > practiceType.maxScore)) {
    return "Invalid total score.";
  }

  return null;
}

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
