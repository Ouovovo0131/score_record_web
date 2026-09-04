const {
  STORAGE_KEYS,
  SUBJECTS,
  DEFAULT_RECORDS,
  average,
  compactDate: formatCompactDate,
  formatDate: formatDisplayDate,
  formatScore: formatDisplayScore,
} = window.ScoreRecordApp;

const scoreForm = document.querySelector("#score-form");
const recordsBody = document.querySelector("#records-body");
const rowTemplate = document.querySelector("#record-row-template");
const resetFormButton = document.querySelector("#reset-form-btn");
const clearRecordsButton = document.querySelector("#clear-records-btn");
const chart = document.querySelector("#trend-chart");
const chartEmpty = document.querySelector("#chart-empty");
const statusMessage = document.querySelector("#status-message");

const statNodes = {
  recordCount: document.querySelector("#record-count"),
  averageScore: document.querySelector("#average-score"),
  highestScore: document.querySelector("#highest-score"),
  scoreDelta: document.querySelector("#score-delta"),
};

const subjectStatsContainer = document.querySelector("#subject-stats");

let records = loadRecords();

initialize();

function initialize() {
  scoreForm.addEventListener("submit", handleAddRecord);
  resetFormButton.addEventListener("click", () => scoreForm.reset());
  clearRecordsButton.addEventListener("click", handleClearRecords);
  renderAll();
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

function handleDeleteRecord(recordId) {
  const nextRecords = records.filter((record) => record.id !== recordId);
  if (!saveRecords(nextRecords)) {
    return;
  }

  renderAll();
  showStatus("已刪除該筆成績紀錄。", "success");
}

function handleClearRecords() {
  if (!records.length) {
    window.alert("目前沒有可清空的成績紀錄。");
    return;
  }

  const confirmed = window.confirm("確定要刪除所有模擬考紀錄嗎？這會包含目前內建的一模資料。");
  if (!confirmed) {
    return;
  }

  if (!saveRecords([])) {
    return;
  }

  renderAll();
  showStatus("已清空所有模擬考紀錄。", "success");
}

function renderAll() {
  renderRecords();
  renderStats();
  renderSubjectStats();
  renderChart();
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
    row.querySelector('[data-field="date"]').textContent = formatDisplayDate(record.examDate);
    row.querySelector('[data-field="name"]').textContent = record.examName;
    row.querySelector('[data-field="total"]').textContent = formatDisplayScore(record.totalScore);
    row.querySelector('[data-field="chinese"]').textContent = formatDisplayScore(record.chinese);
    row.querySelector('[data-field="english"]').textContent = formatDisplayScore(record.english);
    row.querySelector('[data-field="math"]').textContent = formatDisplayScore(record.math);
    row.querySelector('[data-field="social"]').textContent = formatDisplayScore(record.social);
    row.querySelector('[data-field="science"]').textContent = formatDisplayScore(record.science);
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
  statNodes.averageScore.textContent = records.length ? formatDisplayScore(average(totals)) : "0";
  statNodes.highestScore.textContent = records.length ? formatDisplayScore(Math.max(...totals)) : "0";
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
      <p>${scores.length ? formatDisplayScore(average(scores)) : "0"}</p>
      <span>平均分數</span>
      <span>最近一次：${latestScore !== null ? formatDisplayScore(latestScore) : "—"}</span>
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
    }, formatDisplayScore(value));
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
    }, formatDisplayScore(point.record.totalScore));

    appendSvgNode("text", {
      x: point.x,
      y: height - padding.bottom + 22,
      fill: "#5d6880",
      "font-size": "12",
      "text-anchor": "middle",
    }, formatCompactDate(point.record.examDate));
  });
}

function appendSvgNode(tagName, attributes, textContent = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  if (textContent) {
    node.textContent = textContent;
  }
  chart.appendChild(node);
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEYS.records);
  if (!raw) {
    try {
      localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(DEFAULT_RECORDS));
    } catch (error) {
      reportStorageError("成績資料無法初始化到瀏覽器。", error);
    }
    return sortRecords(DEFAULT_RECORDS);
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? mergeDefaultRecords(parsed.filter(isStoredRecord)) : sortRecords(DEFAULT_RECORDS);
  } catch (error) {
    reportStorageError("已儲存的成績資料格式錯誤，請重新建立紀錄。", error);
    return sortRecords(DEFAULT_RECORDS);
  }
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

function sortRecords(sourceRecords) {
  return [...sourceRecords].sort((left, right) => new Date(left.examDate) - new Date(right.examDate));
}

function mergeDefaultRecords(sourceRecords) {
  const mergedRecords = [...sourceRecords];

  DEFAULT_RECORDS.forEach((defaultRecord) => {
    const exists = mergedRecords.some((record) => (
      record.id === defaultRecord.id
      || (record.examName === defaultRecord.examName && record.examDate === defaultRecord.examDate)
    ));
    if (!exists) {
      mergedRecords.unshift(defaultRecord);
    }
  });

  return sortRecords(mergedRecords);
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

function toNumber(value) {
  return Number(value);
}

function formatSignedScore(value) {
  if (value > 0) {
    return `+${formatDisplayScore(value)}`;
  }
  return formatDisplayScore(value);
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
