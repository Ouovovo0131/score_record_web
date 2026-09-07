function formatDate(dateString) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? dateString
    : new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function compactDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

function parseStartDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function parseEndDate(dateString) {
  return new Date(`${dateString}T23:59:59`);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getScheduleState(schedule, now) {
  const start = parseStartDate(schedule.startDate);
  const end = parseEndDate(schedule.endDate || schedule.startDate);

  if (now < start) {
    return {
      phase: "upcoming",
      diffMs: start.getTime() - now.getTime(),
      start,
      end,
    };
  }

  if (now <= end) {
    const totalDays = Math.floor((stripTime(end).getTime() - stripTime(start).getTime()) / 86400000) + 1;
    const currentDay = Math.floor((stripTime(now).getTime() - stripTime(start).getTime()) / 86400000) + 1;
    return {
      phase: "active",
      diffMs: end.getTime() - now.getTime(),
      totalDays,
      currentDay,
      start,
      end,
    };
  }

  return {
    phase: "completed",
    diffMs: 0,
    start,
    end,
  };
}

function formatScheduleRange(schedule) {
  const startLabel = formatDate(schedule.startDate);
  const endValue = schedule.endDate || schedule.startDate;
  if (endValue === schedule.startDate) {
    return startLabel;
  }
  return `${startLabel} - ${formatDate(endValue)}`;
}

const FIREBASE_CONFIG = window.SCORE_RECORD_FIREBASE_CONFIG || null;
const FIRESTORE_COLLECTION = "score_record_web";
const FIRESTORE_DOCUMENT = "dashboard_data";
let firestoreRefPromise = null;

function hasValidFirebaseConfig(config) {
  if (!config || typeof config !== "object") {
    return false;
  }

  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
  return requiredKeys.every((key) => {
    const value = config[key];
    return typeof value === "string" && value.trim() && !value.startsWith("REPLACE_");
  });
}

function isFirestoreEnabled() {
  return hasValidFirebaseConfig(FIREBASE_CONFIG);
}

function getFirestoreRef() {
  if (!isFirestoreEnabled()) {
    return Promise.resolve(null);
  }

  if (!firestoreRefPromise) {
    firestoreRefPromise = Promise.resolve().then(() => {
      if (!window.firebase || typeof window.firebase.initializeApp !== "function") {
        throw new Error("Firebase SDK 尚未載入，請確認 HTML 已引入 firebase-app-compat.js 與 firebase-firestore-compat.js。");
      }

      const app = window.firebase.apps && window.firebase.apps.length
        ? window.firebase.app()
        : window.firebase.initializeApp(FIREBASE_CONFIG);
      return app.firestore().collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOCUMENT);
    });
  }

  return firestoreRefPromise;
}

function readLocalJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${key} 的本機資料格式錯誤：${error.message}`);
  }
}

function writeLocalJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function readStoredValue(key) {
  if (!isFirestoreEnabled()) {
    return readLocalJson(key);
  }

  try {
    const docRef = await getFirestoreRef();
    const snapshot = await docRef.get();
    const remoteData = snapshot.exists ? snapshot.data() : {};

    if (Object.prototype.hasOwnProperty.call(remoteData, key)) {
      writeLocalJson(key, remoteData[key]);
      return remoteData[key];
    }

    const localValue = readLocalJson(key);
    if (localValue !== null) {
      await docRef.set({ [key]: localValue }, { merge: true });
      return localValue;
    }

    return null;
  } catch (error) {
    console.error("Firestore 讀取失敗，改用本機資料。", error);
    return readLocalJson(key);
  }
}

async function writeStoredValue(key, value) {
  if (isFirestoreEnabled()) {
    try {
      const docRef = await getFirestoreRef();
      await docRef.set({ [key]: value }, { merge: true });
    } catch (error) {
      console.error("Firestore 寫入失敗，僅儲存到本機。", error);
    }
  }
  writeLocalJson(key, value);
}

window.ScoreRecordApp = {
  STORAGE_KEYS: {
    records: "score-record-web.records",
    goals: "score-record-web.goals",
    englishRecords: "score-record-web.english-records",
  },
  SUBJECTS: [
    { key: "chinese", label: "國文", shortLabel: "國", scoreKey: "chineseScore", gradeKey: "chineseGrade" },
    { key: "english", label: "英文", shortLabel: "英", scoreKey: "englishScore", gradeKey: "englishGrade" },
    { key: "math", label: "數學 A", shortLabel: "數A", scoreKey: "mathScore", gradeKey: "mathGrade" },
    { key: "social", label: "社會", shortLabel: "社", scoreKey: "socialScore", gradeKey: "socialGrade" },
    { key: "science", label: "自然", shortLabel: "自", scoreKey: "scienceScore", gradeKey: "scienceGrade" },
  ],
  DEFAULT_RECORDS: [
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
  ],
  DEFAULT_GOALS: {
    goalName: "台大資工",
    targetTotalScore: null,
    targetTotalGrade: 54,
    targetChineseGrade: 12,
    targetEnglishGrade: 13,
    targetMathGrade: 15,
    targetSocialGrade: null,
    targetScienceGrade: 14,
  },
  FIXED_SCHEDULES: [
    { id: "schedule-mock-1", name: "第一次模擬考", startDate: "2026-07-29", endDate: "2026-07-30" },
    { id: "schedule-mock-2", name: "第二次模擬考", startDate: "2026-09-02", endDate: "2026-09-03" },
    { id: "schedule-midterm", name: "期中考", startDate: "2026-10-12", endDate: "2026-10-13" },
    { id: "schedule-mock-3", name: "第三次模擬考", startDate: "2026-10-28", endDate: "2026-10-29" },
    { id: "schedule-mock-4", name: "第四次模擬考", startDate: "2026-12-08", endDate: "2026-12-09" },
    { id: "schedule-final", name: "期末考", startDate: "2026-12-16", endDate: "2026-12-17" },
    { id: "schedule-gsat", name: "學測", startDate: "2027-01-22", endDate: "2027-01-24" },
  ],
  ENGLISH_PRACTICE_TYPES: [
    { key: "miaomiao", label: "妙妙卷" },
    { key: "cloze", label: "克漏字" },
  ],
  ENGLISH_UNAVAILABLE_CATEGORY_MAP: {
    miaomiao: [],
    cloze: ["vocabularyScore", "readingScore", "mixedScore"],
  },
  ENGLISH_CATEGORIES: [
    { key: "vocabularyScore", label: "詞彙題", maxScore: 10 },
    { key: "clozeScore", label: "綜合測驗", maxScore: 10 },
    { key: "contextScore", label: "文意選填", maxScore: 10 },
    { key: "structureScore", label: "篇章結構", maxScore: 8 },
    { key: "readingScore", label: "閱讀題", maxScore: 24 },
    { key: "mixedScore", label: "混合題", maxScore: 10 },
  ],
  DEFAULT_ENGLISH_RECORDS: [
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
  ],
  average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  },
  formatScore(value) {
    return Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1);
  },
  formatDate,
  compactDate,
  parseStartDate,
  parseEndDate,
  stripTime,
  getScheduleState,
  formatScheduleRange,
  isFirestoreEnabled,
  readStoredValue,
  writeStoredValue,
  formatDurationShort(diffMs) {
    const totalSeconds = Math.floor(Math.max(diffMs, 0) / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    if (days > 0) {
      return `${days} 天 ${hours} 小時`;
    }
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} 小時 ${minutes} 分`;
  },
  padTime(value) {
    return String(value).padStart(2, "0");
  },
};
