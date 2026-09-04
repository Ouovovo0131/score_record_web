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
      socialGrade: null,
      scienceScore: 65,
      scienceGrade: 9,
      reviewTags: ["#一模", "#自然組"],
      notes: "班排 12/30、校排 75/200、總排 13085/39781",
    },
  ],
  DEFAULT_GOALS: {
    goalName: "",
    targetTotalScore: null,
    targetTotalGrade: null,
    targetChineseGrade: null,
    targetEnglishGrade: null,
    targetMathGrade: null,
    targetSocialGrade: null,
    targetScienceGrade: null,
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
  ENGLISH_CATEGORIES: [
    { key: "vocabularyScore", label: "詞彙題" },
    { key: "clozeScore", label: "綜合測驗" },
    { key: "contextScore", label: "文意選填" },
    { key: "structureScore", label: "篇章結構" },
    { key: "readingScore", label: "閱讀題" },
    { key: "mixedScore", label: "混合題" },
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
