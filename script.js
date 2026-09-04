const STORAGE_KEYS = {
  records: "score-record-web.records",
  schedules: "score-record-web.schedules",
  legacyCountdown: "score-record-web.countdown",
};

const SUBJECTS = [
  { key: "chinese", label: "國文" },
  { key: "english", label: "英文" },
  { key: "math", label: "數學" },
  { key: "social", label: "社會" },
  { key: "science", label: "自然" },
];

const scoreForm = document.querySelector("#score-form");
const countdownForm = document.querySelector("#countdown-form");
const recordsBody = document.querySelector("#records-body");
const rowTemplate = document.querySelector("#record-row-template");
const scheduleTemplate = document.querySelector("#schedule-item-template");
const loadDemoButton = document.querySelector("#load-demo-btn");
const resetFormButton = document.querySelector("#reset-form-btn");
const clearRecordsButton = document.querySelector("#clear-records-btn");
const clearCountdownButton = document.querySelector("#clear-countdown-btn");
const chart = document.querySelector("#trend-chart");
const chartEmpty = document.querySelector("#chart-empty");
const statusMessage = document.querySelector("#status-message");

const countdownTitle = document.querySelector("#countdown-title");
const countdownSubtitle = document.querySelector("#countdown-subtitle");
const daysLeft = document.querySelector("#days-left");
const hoursLeft = document.querySelector("#hours-left");
const minutesLeft = document.querySelector("#minutes-left");
const secondsLeft = document.querySelector("#seconds-left");
const scheduleList = document.querySelector("#schedule-list");

const statNodes = {
  recordCount: document.querySelector("#record-count"),
  averageScore: document.querySelector("#average-score"),
  highestScore: document.querySelector("#highest-score"),
  scoreDelta: document.querySelector("#score-delta"),
};

const subjectStatsContainer = document.querySelector("#subject-stats");
const nextExamNameInput = document.querySelector("#next-exam-name");
const nextExamStartDateInput = document.querySelector("#next-exam-start-date");
const nextExamEndDateInput = document.querySelector("#next-exam-end-date");

migrateLegacyCountdown();

let records = loadRecords();
let schedules = loadSchedules();
let countdownTimerId = null;

initialize();

function initialize() {
  scoreForm.addEventListener("submit", handleAddRecord);
  countdownForm.addEventListener("submit", handleAddSchedule);
  loadDemoButton.addEventListener("click", handleLoadDemoData);
  resetFormButton.addEventListener("click", () => scoreForm.reset());
  clearRecordsButton.addEventListener("click", handleClearRecords);
  clearCountdownButton.addEventListener("click", handleClearSchedules);

  renderAll();
  startCountdownTimer();
}

function handleAddRecord(event) {
  event.preventDefault();

  const formData = new FormData(scoreForm);
  const record = {
    id: crypto.randomUUID(),
    examName: String(formData.get("examName")).trim(),
    examDate: String(formData.get("examDate")),
    totalScore: toNumber(formData.get("totalScore")),
    chinese: toNumber(formData.get("chineseScore")),
    english: toNumber(formData.get("englishScore")),
    math: toNumber(formData.get("mathScore")),
    social: toNumber(formData.get("socialScore")),
    science: toNumber(formData.get("scienceScore")),
    notes: String(formData.get("notes")).trim(),
  };

  if (!isValidRecord(record)) {
    window.alert("請完整填寫正確的考試資料後再新增。");
    return;
  }

  const nextRecords = sortRecords(records.concat(record));
  if (!saveRecords(nextRecords)) {
    return;
  }

  renderAll();
  scoreForm.reset();
  showStatus("已新增模擬考紀錄。", "success");
}

function handleAddSchedule(event) {
  event.preventDefault();

  const name = nextExamNameInput.value.trim();
  const startDate = nextExamStartDateInput.value;
  const endDate = nextExamEndDateInput.value || startDate;

  if (!name || !startDate) {
    window.alert("請先輸入考試名稱與開始日期。");
    return;
  }

  if (new Date(endDate) < new Date(startDate)) {
    window.alert("結束日期不能早於開始日期。");
    return;
  }

  const nextSchedules = sortSchedules(schedules.concat({
    id: crypto.randomUUID(),
    name,
    startDate,
    endDate,
  }));

  if (!saveSchedules(nextSchedules)) {
    return;
  }

  countdownForm.reset();
  renderSchedules();
  showStatus("已新增考試倒數。", "success");
}

function handleDeleteRecord(recordId) {
  const nextRecords = records.filter((record) => record.id !== recordId);
  if (!saveRecords(nextRecords)) {
    return;
  }

  renderAll();
  showStatus("已刪除該筆成績紀錄。", "success");
}

function handleDeleteSchedule(scheduleId) {
  const nextSchedules = schedules.filter((schedule) => schedule.id !== scheduleId);
  if (!saveSchedules(nextSchedules)) {
    return;
  }

  renderSchedules();
  showStatus("已刪除該筆考程。", "success");
}

function handleClearRecords() {
  if (!records.length) {
    window.alert("目前沒有可清空的成績紀錄。");
    return;
  }

  const confirmed = window.confirm("確定要刪除所有模擬考紀錄嗎？這個動作無法復原。");
  if (!confirmed) {
    return;
  }

  if (!saveRecords([])) {
    return;
  }

  renderAll();
  showStatus("已清空所有模擬考紀錄。", "success");
}

function handleClearSchedules() {
  if (!schedules.length) {
    window.alert("目前沒有可清空的考程。");
    return;
  }

  const confirmed = window.confirm("確定要清空所有考試倒數嗎？");
  if (!confirmed) {
    return;
  }

  if (!saveSchedules([])) {
    return;
  }

  countdownForm.reset();
  renderSchedules();
  showStatus("已清空所有考程。", "success");
}

function handleLoadDemoData() {
  if (records.length || schedules.length) {
    const confirmed = window.confirm("載入示範資料會保留目前資料並一起顯示，是否繼續？");
    if (!confirmed) {
      return;
    }
  }

  const demoRecords = [
    {
      id: crypto.randomUUID(),
      examName: "高三第一次模擬考",
      examDate: "2026-03-05",
      totalScore: 332,
      chinese: 61,
      english: 64,
      math: 58,
      social: 72,
      science: 77,
      notes: "數學計算錯誤較多，需要再加強速度。",
    },
    {
      id: crypto.randomUUID(),
      examName: "高三第二次模擬考",
      examDate: "2026-04-16",
      totalScore: 351,
      chinese: 66,
      english: 68,
      math: 62,
      social: 75,
      science: 80,
      notes: "英文穩定上升，社會複習策略有效。",
    },
    {
      id: crypto.randomUUID(),
      examName: "高三第三次模擬考",
      examDate: "2026-05-28",
      totalScore: 376,
      chinese: 70,
      english: 74,
      math: 68,
      social: 79,
      science: 85,
      notes: "整體進步明顯，數學與自然成長最多。",
    },
  ];

  const demoSchedules = [
    { id: crypto.randomUUID(), name: "期中考", startDate: "2026-10-12", endDate: "2026-10-13" },
    { id: crypto.randomUUID(), name: "第三次模擬考", startDate: "2026-10-28", endDate: "2026-10-29" },
  ];

  if (!saveRecords(sortRecords(records.concat(demoRecords)))) {
    return;
  }

  if (!saveSchedules(sortSchedules(schedules.concat(demoSchedules)))) {
    return;
  }

  renderAll();
  showStatus("已載入示範資料。", "success");
}

function renderAll() {
  renderRecords();
  renderStats();
  renderSubjectStats();
  renderChart();
  renderSchedules();
}

function renderRecords() {
  recordsBody.innerHTML = "";

  if (!records.length) {
    recordsBody.innerHTML = '<tr class="empty-row"><td colspan="10">目前還沒有任何模擬考紀錄。</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();

  records.forEach((record) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-field="date"]').textContent = formatDate(record.examDate);
    row.querySelector('[data-field="name"]').textContent = record.examName;
    row.querySelector('[data-field="total"]').textContent = formatScore(record.totalScore);
    row.querySelector('[data-field="chinese"]').textContent = formatScore(record.chinese);
    row.querySelector('[data-field="english"]').textContent = formatScore(record.english);
    row.querySelector('[data-field="math"]').textContent = formatScore(record.math);
    row.querySelector('[data-field="social"]').textContent = formatScore(record.social);
    row.querySelector('[data-field="science"]').textContent = formatScore(record.science);
    row.querySelector('[data-field="notes"]').textContent = record.notes || "—";
    row.querySelector(".table-delete-btn").addEventListener("click", () => handleDeleteRecord(record.id));
    fragment.appendChild(row);
  });

  recordsBody.appendChild(fragment);
}

function renderStats() {
  const totals = records.map((record) => record.totalScore);
  const latest = records.at(-1);
  const previous = records.at(-2);
  const delta = latest && previous ? latest.totalScore - previous.totalScore : 0;

  statNodes.recordCount.textContent = String(records.length);
  statNodes.averageScore.textContent = records.length ? formatScore(average(totals)) : "0";
  statNodes.highestScore.textContent = records.length ? formatScore(Math.max(...totals)) : "0";
  statNodes.scoreDelta.textContent = formatSignedScore(delta);
  statNodes.scoreDelta.className = delta > 0 ? "positive" : delta < 0 ? "negative" : "";
}

function renderSubjectStats() {
  subjectStatsContainer.innerHTML = "";

  const fragment = document.createDocumentFragment();
  SUBJECTS.forEach((subject) => {
    const scores = records.map((record) => record[subject.key]);
    const latestScore = records.length ? records.at(-1)[subject.key] : null;
    const card = document.createElement("article");
    card.className = "subject-card";
    card.innerHTML = `
      <h3>${subject.label}</h3>
      <p>${scores.length ? formatScore(average(scores)) : "0"}</p>
      <span>平均分數</span>
      <span>最近一次：${latestScore !== null ? formatScore(latestScore) : "—"}</span>
    `;
    fragment.appendChild(card);
  });

  subjectStatsContainer.appendChild(fragment);
}

function renderChart() {
  chart.innerHTML = "";

  if (!records.length) {
    chartEmpty.hidden = false;
    return;
  }

  chartEmpty.hidden = true;

  const width = 800;
  const height = 320;
  const padding = { top: 24, right: 28, bottom: 48, left: 54 };
  const totals = records.map((record) => record.totalScore);
  const minScore = Math.min(...totals);
  const maxScore = Math.max(...totals);
  const range = Math.max(maxScore - minScore, 10);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = records.map((record, index) => {
    const x = padding.left + (records.length === 1 ? innerWidth / 2 : (innerWidth * index) / (records.length - 1));
    const y = padding.top + innerHeight - ((record.totalScore - minScore) / range) * innerHeight;
    return { x, y, record };
  });

  appendSvgNode("line", {
    x1: padding.left,
    y1: padding.top,
    x2: padding.left,
    y2: height - padding.bottom,
    stroke: "#bfd0f5",
    "stroke-width": "1.5",
  });

  appendSvgNode("line", {
    x1: padding.left,
    y1: height - padding.bottom,
    x2: width - padding.right,
    y2: height - padding.bottom,
    stroke: "#bfd0f5",
    "stroke-width": "1.5",
  });

  for (let step = 0; step <= 4; step += 1) {
    const value = minScore + (range * step) / 4;
    const y = padding.top + innerHeight - (innerHeight * step) / 4;

    appendSvgNode("line", {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: "#e2ebfb",
      "stroke-width": "1",
      "stroke-dasharray": "4 6",
    });

    appendSvgNode("text", {
      x: padding.left - 10,
      y: y + 5,
      fill: "#5d6880",
      "font-size": "12",
      "text-anchor": "end",
    }, formatScore(value));
  }

  appendSvgNode("polyline", {
    fill: "none",
    stroke: "#3563e9",
    "stroke-width": "4",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    points: points.map((point) => `${point.x},${point.y}`).join(" "),
  });

  points.forEach((point) => {
    appendSvgNode("circle", {
      cx: point.x,
      cy: point.y,
      r: "5.5",
      fill: "#ffffff",
      stroke: "#3563e9",
      "stroke-width": "3",
    });

    appendSvgNode("text", {
      x: point.x,
      y: point.y - 12,
      fill: "#2648ac",
      "font-size": "12",
      "font-weight": "700",
      "text-anchor": "middle",
    }, formatScore(point.record.totalScore));

    appendSvgNode("text", {
      x: point.x,
      y: height - padding.bottom + 22,
      fill: "#5d6880",
      "font-size": "12",
      "text-anchor": "middle",
    }, compactDate(point.record.examDate));
  });
}

function renderSchedules() {
  renderCountdownSummary();
  renderScheduleList();
}

function renderCountdownSummary() {
  const primarySchedule = getPrimarySchedule();
  if (!primarySchedule) {
    countdownTitle.textContent = "尚未設定考試";
    countdownSubtitle.textContent = "新增考程後就會顯示最近一場考試的倒數。";
    setCountdownValues("--", "--", "--", "--");
    return;
  }

  const scheduleState = getScheduleState(primarySchedule, new Date());
  if (scheduleState.phase === "active") {
    countdownTitle.textContent = `${primarySchedule.name} 進行中`;
    countdownSubtitle.textContent = `${formatScheduleRange(primarySchedule)} · 第 ${scheduleState.currentDay} / ${scheduleState.totalDays} 天`;
    setCountdownFromMs(scheduleState.diffMs);
    return;
  }

  if (scheduleState.phase === "completed") {
    countdownTitle.textContent = `${primarySchedule.name} 已結束`;
    countdownSubtitle.textContent = formatScheduleRange(primarySchedule);
    setCountdownValues("0", "0", "0", "0");
    return;
  }

  countdownTitle.textContent = `${primarySchedule.name} 倒數`;
  countdownSubtitle.textContent = formatScheduleRange(primarySchedule);
  setCountdownFromMs(scheduleState.diffMs);
}

function renderScheduleList() {
  scheduleList.innerHTML = "";

  if (!schedules.length) {
    scheduleList.innerHTML = '<div class="schedule-empty">目前還沒有任何考程。</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const now = new Date();

  schedules.forEach((schedule) => {
    const node = scheduleTemplate.content.firstElementChild.cloneNode(true);
    const state = getScheduleState(schedule, now);
    node.querySelector(".schedule-item-name").textContent = schedule.name;
    node.querySelector(".schedule-item-dates").textContent = formatScheduleRange(schedule);
    node.querySelector(".schedule-item-status").textContent = formatScheduleStatus(state);
    node.querySelector(".schedule-delete-btn").addEventListener("click", () => handleDeleteSchedule(schedule.id));
    fragment.appendChild(node);
  });

  scheduleList.appendChild(fragment);
}

function appendSvgNode(tagName, attributes, textContent = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  if (textContent) {
    node.textContent = textContent;
  }
  chart.appendChild(node);
}

function setCountdownFromMs(diffMs) {
  const safeMs = Math.max(diffMs, 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  setCountdownValues(String(days), padTime(hours), padTime(minutes), padTime(seconds));
}

function setCountdownValues(days, hours, minutes, seconds) {
  daysLeft.textContent = days;
  hoursLeft.textContent = hours;
  minutesLeft.textContent = minutes;
  secondsLeft.textContent = seconds;
}

function startCountdownTimer() {
  if (countdownTimerId !== null) {
    window.clearInterval(countdownTimerId);
  }

  countdownTimerId = window.setInterval(renderSchedules, 1000);
}

function saveRecords(nextRecords) {
  try {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(nextRecords));
    records = nextRecords;
    return true;
  } catch (error) {
    reportStorageError("成績資料無法儲存到瀏覽器。", error);
    return false;
  }
}

function saveSchedules(nextSchedules) {
  try {
    localStorage.setItem(STORAGE_KEYS.schedules, JSON.stringify(nextSchedules));
    schedules = nextSchedules;
    return true;
  } catch (error) {
    reportStorageError("考程資料無法儲存到瀏覽器。", error);
    return false;
  }
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEYS.records);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortRecords(parsed.filter(isStoredRecord)) : [];
  } catch (error) {
    reportStorageError("已儲存的成績資料格式錯誤，請重新建立紀錄。", error);
    return [];
  }
}

function loadSchedules() {
  const raw = localStorage.getItem(STORAGE_KEYS.schedules);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortSchedules(parsed.filter(isStoredSchedule)) : [];
  } catch (error) {
    reportStorageError("已儲存的考程資料格式錯誤，請重新設定。", error);
    return [];
  }
}

function migrateLegacyCountdown() {
  const schedulesRaw = localStorage.getItem(STORAGE_KEYS.schedules);
  const legacyRaw = localStorage.getItem(STORAGE_KEYS.legacyCountdown);
  if (schedulesRaw || !legacyRaw) {
    return;
  }

  try {
    const parsed = JSON.parse(legacyRaw);
    if (parsed && typeof parsed.name === "string" && typeof parsed.dateTime === "string") {
      const startDate = parsed.dateTime.slice(0, 10);
      localStorage.setItem(STORAGE_KEYS.schedules, JSON.stringify([{
        id: crypto.randomUUID(),
        name: parsed.name,
        startDate,
        endDate: startDate,
      }]));
    }
  } catch (error) {
    console.error("舊版倒數資料轉換失敗。", error);
  }

  localStorage.removeItem(STORAGE_KEYS.legacyCountdown);
}

function sortRecords(sourceRecords) {
  return [...sourceRecords].sort((left, right) => new Date(left.examDate) - new Date(right.examDate));
}

function sortSchedules(sourceSchedules) {
  return [...sourceSchedules].sort((left, right) => new Date(left.startDate) - new Date(right.startDate));
}

function getPrimarySchedule() {
  const now = new Date();
  return schedules.find((schedule) => {
    const state = getScheduleState(schedule, now);
    return state.phase === "active";
  }) || schedules.find((schedule) => {
    const state = getScheduleState(schedule, now);
    return state.phase === "upcoming";
  }) || schedules.at(-1) || null;
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

function formatScheduleStatus(state) {
  if (state.phase === "upcoming") {
    return `距離開始還有 ${formatDurationShort(state.diffMs)}`;
  }

  if (state.phase === "active") {
    return `考試進行中，第 ${state.currentDay} / ${state.totalDays} 天`;
  }

  return "已結束";
}

function formatScheduleRange(schedule) {
  const startLabel = formatDate(schedule.startDate);
  const endValue = schedule.endDate || schedule.startDate;
  if (endValue === schedule.startDate) {
    return startLabel;
  }
  return `${startLabel} - ${formatDate(endValue)}`;
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

function isValidRecord(record) {
  return Boolean(
    record.examName &&
    record.examDate &&
    Number.isFinite(record.totalScore) &&
    SUBJECTS.every((subject) => Number.isFinite(record[subject.key]))
  );
}

function isStoredRecord(record) {
  return record &&
    typeof record.id === "string" &&
    typeof record.examName === "string" &&
    typeof record.examDate === "string" &&
    Number.isFinite(Number(record.totalScore)) &&
    SUBJECTS.every((subject) => Number.isFinite(Number(record[subject.key])));
}

function isStoredSchedule(schedule) {
  return schedule &&
    typeof schedule.id === "string" &&
    typeof schedule.name === "string" &&
    typeof schedule.startDate === "string" &&
    typeof schedule.endDate === "string";
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toNumber(value) {
  return Number(value);
}

function formatScore(value) {
  return Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1);
}

function formatSignedScore(value) {
  if (value > 0) {
    return `+${formatScore(value)}`;
  }
  return formatScore(value);
}

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

function formatDurationShort(diffMs) {
  const totalSeconds = Math.floor(Math.max(diffMs, 0) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) {
    return `${days} 天 ${hours} 小時`;
  }
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours} 小時 ${minutes} 分`;
}

function padTime(value) {
  return String(value).padStart(2, "0");
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.hidden = false;
}

function reportStorageError(message, error) {
  console.error(message, error);
  showStatus(message, "error");
}
