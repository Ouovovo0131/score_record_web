const {
  STORAGE_KEYS,
  SUBJECTS,
  DEFAULT_RECORDS,
  DEFAULT_GOALS,
  average,
  compactDate: formatCompactDate,
  formatDate: formatDisplayDate,
  formatScore: formatDisplayScore,
} = window.ScoreRecordApp;

const scoreForm = document.querySelector("#score-form");
const goalForm = document.querySelector("#goal-form");
const recordsBody = document.querySelector("#records-body");
const rowTemplate = document.querySelector("#record-row-template");
const latestCardTemplate = document.querySelector("#latest-card-template");
const openScoreModalButton = document.querySelector("#open-score-modal-btn");
const closeScoreModalButton = document.querySelector("#close-score-modal-btn");
const resetFormButton = document.querySelector("#reset-form-btn");
const resetGoalButton = document.querySelector("#reset-goal-btn");
const clearRecordsButton = document.querySelector("#clear-records-btn");
const modal = document.querySelector("#score-modal");
const modalBackdrop = document.querySelector("#score-modal-backdrop");
const statusMessage = document.querySelector("#status-message");

const trendChart = document.querySelector("#trend-chart");
const trendChartEmpty = document.querySelector("#trend-chart-empty");
const radarChart = document.querySelector("#radar-chart");
const radarChartEmpty = document.querySelector("#radar-chart-empty");
const metricButtons = Array.from(document.querySelectorAll(".metric-btn"));

const statNodes = {
  recordCount: document.querySelector("#record-count"),
  averageGrade: document.querySelector("#average-grade"),
  highestGrade: document.querySelector("#highest-grade"),
  bestImprovementSubject: document.querySelector("#best-improvement-subject"),
  bestImprovementDetail: document.querySelector("#best-improvement-detail"),
  goalGapValue: document.querySelector("#goal-gap-value"),
  goalGapDetail: document.querySelector("#goal-gap-detail"),
};

const latestNodes = {
  title: document.querySelector("#latest-exam-title"),
  meta: document.querySelector("#latest-exam-meta"),
  reference: document.querySelector("#latest-reference-text"),
  cards: document.querySelector("#latest-insight-grid"),
  tags: document.querySelector("#latest-tag-list"),
};

const goalProgressList = document.querySelector("#goal-progress-list");
const reviewTagSummary = document.querySelector("#review-tag-summary");

let activeMetric = "totalScore";
let records = loadRecords();
let goals = loadGoals();

initialize();

function initialize() {
  openScoreModalButton.addEventListener("click", openScoreModal);
  closeScoreModalButton.addEventListener("click", closeScoreModal);
  modalBackdrop.addEventListener("click", closeScoreModal);
  document.addEventListener("keydown", handleGlobalKeydown);

  scoreForm.addEventListener("submit", handleAddRecord);
  resetFormButton.addEventListener("click", () => scoreForm.reset());
  clearRecordsButton.addEventListener("click", handleClearRecords);

  if (goalForm) {
    goalForm.addEventListener("submit", handleSaveGoals);
  }

  if (resetGoalButton) {
    resetGoalButton.addEventListener("click", handleResetGoals);
  }

  metricButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeMetric = button.dataset.metric;
      updateMetricButtons();
      renderTrendChart();
    });
  });

  syncGoalForm();
  updateMetricButtons();
  renderAll();
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && !modal.hidden) {
    closeScoreModal();
  }
}

function handleAddRecord(event) {
  event.preventDefault();

  const formData = new FormData(scoreForm);
  const nextRecord = {
    id: crypto.randomUUID(),
    examName: String(formData.get("examName")).trim(),
    examDate: String(formData.get("examDate")),
    totalScore: toOptionalNumber(formData.get("totalScore")),
    totalGrade: toOptionalInteger(formData.get("totalGrade")),
    chineseScore: toOptionalNumber(formData.get("chineseScore")),
    chineseGrade: toOptionalInteger(formData.get("chineseGrade")),
    englishScore: toOptionalNumber(formData.get("englishScore")),
    englishGrade: toOptionalInteger(formData.get("englishGrade")),
    mathScore: toOptionalNumber(formData.get("mathScore")),
    mathGrade: toOptionalInteger(formData.get("mathGrade")),
    socialScore: toOptionalNumber(formData.get("socialScore")),
    socialGrade: toOptionalInteger(formData.get("socialGrade")),
    scienceScore: toOptionalNumber(formData.get("scienceScore")),
    scienceGrade: toOptionalInteger(formData.get("scienceGrade")),
    reviewTags: parseTags(String(formData.get("reviewTags"))),
    notes: String(formData.get("notes")).trim(),
  };

  if (nextRecord.totalGrade === null) {
    nextRecord.totalGrade = sumGrades(nextRecord);
  }

  if (!isValidRecord(nextRecord)) {
    window.alert("請至少填寫考試名稱、日期、總分，並確認數值格式正確。");
    return;
  }

  const nextRecords = sortRecords(records.concat(nextRecord));
  if (!saveRecords(nextRecords)) {
    return;
  }

  renderAll();
  scoreForm.reset();
  closeScoreModal();
  showStatus("已新增模擬考紀錄。", "success");
}

function handleSaveGoals(event) {
  event.preventDefault();

  const formData = new FormData(goalForm);
  const nextGoals = {
    goalName: String(formData.get("goalName")).trim(),
    targetTotalScore: toOptionalNumber(formData.get("targetTotalScore")),
    targetTotalGrade: toOptionalInteger(formData.get("targetTotalGrade")),
    targetChineseGrade: toOptionalInteger(formData.get("targetChineseGrade")),
    targetEnglishGrade: toOptionalInteger(formData.get("targetEnglishGrade")),
    targetMathGrade: toOptionalInteger(formData.get("targetMathGrade")),
    targetSocialGrade: toOptionalInteger(formData.get("targetSocialGrade")),
    targetScienceGrade: toOptionalInteger(formData.get("targetScienceGrade")),
  };

  if (!saveGoals(nextGoals)) {
    return;
  }

  renderAll();
  showStatus("已更新目標設定。", "success");
}

function handleResetGoals() {
  if (!saveGoals({ ...DEFAULT_GOALS })) {
    return;
  }

  syncGoalForm();
  renderAll();
  showStatus("已清空目標設定。", "success");
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

  const confirmed = window.confirm("確定要刪除所有模擬考紀錄嗎？這會連同內建的一模資料一起清除。");
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
  renderStats();
  renderLatestInsight();
  renderTrendChart();
  renderRadarChart();
  renderGoalProgress();
  renderReviewTagSummary();
  renderRecords();
}

function renderStats() {
  const totalGrades = getFiniteValues(records.map((record) => record.totalGrade));
  const latest = getLatestRecord();
  const previous = getPreviousRecord();
  const bestImprovement = getBestImprovementSubject(latest, previous);
  const goalGap = getGoalGap(latest);

  statNodes.recordCount.textContent = String(records.length);
  statNodes.averageGrade.textContent = totalGrades.length ? formatDisplayScore(average(totalGrades)) : "0";
  statNodes.highestGrade.textContent = totalGrades.length ? formatDisplayScore(Math.max(...totalGrades)) : "0";
  statNodes.bestImprovementSubject.textContent = bestImprovement.value;
  statNodes.bestImprovementSubject.className = `metric-value ${bestImprovement.status}`;
  statNodes.bestImprovementDetail.textContent = bestImprovement.detail;
  statNodes.goalGapValue.textContent = goalGap.value;
  statNodes.goalGapDetail.textContent = goalGap.detail;
}

function renderLatestInsight() {
  const latest = getLatestRecord();
  const previous = getPreviousRecord();
  latestNodes.cards.innerHTML = "";
  latestNodes.tags.innerHTML = "";

  if (!latest) {
    latestNodes.title.textContent = "尚無成績資料";
    latestNodes.meta.textContent = "新增第一筆成績後，這裡會自動更新。";
    latestNodes.reference.textContent = "目前沒有可比較的考試資料。";
    latestNodes.cards.innerHTML = '<div class="empty-state">新增成績後，這裡會自動顯示最新表現與比較分析。</div>';
    return;
  }

  latestNodes.title.textContent = latest.examName;
  latestNodes.meta.textContent = `${formatDisplayDate(latest.examDate)} · 總分 ${formatMaybeNumber(latest.totalScore)} / 總級分 ${formatMaybeNumber(latest.totalGrade)}`;
  latestNodes.reference.textContent = previous
    ? `以下箭頭以「上一場 ${previous.examName}」為比較基準。`
    : "目前只有 1 筆紀錄，以下以整體平均作為比較基準。";

  latest.reviewTags.forEach((tag) => {
    latestNodes.tags.appendChild(createTag(tag));
  });

  const fragment = document.createDocumentFragment();

  fragment.appendChild(createInsightCard({
    title: "總分",
    value: formatMaybeNumber(latest.totalScore),
    detail: `總級分 ${formatMaybeNumber(latest.totalGrade)}`,
    comparison: buildComparison(latest.totalScore, previous ? previous.totalScore : average(getFiniteValues(records.map((record) => record.totalScore))), previous ? "比上次" : "比平均", "分"),
  }));

  fragment.appendChild(createInsightCard({
    title: "總級分",
    value: formatMaybeNumber(latest.totalGrade),
    detail: `目標 ${formatMaybeNumber(goals.targetTotalGrade)}`,
    comparison: buildComparison(latest.totalGrade, previous ? previous.totalGrade : average(getFiniteValues(records.map((record) => record.totalGrade))), previous ? "比上次" : "比平均", "級"),
  }));

  SUBJECTS.forEach((subject) => {
    const latestScore = latest[subject.scoreKey];
    const latestGrade = latest[subject.gradeKey];
    const baseline = previous
      ? previous[subject.scoreKey]
      : average(getFiniteValues(records.map((record) => record[subject.scoreKey])));

    fragment.appendChild(createInsightCard({
      title: subject.label,
      value: formatMaybeNumber(latestScore),
      detail: `級分 ${formatMaybeNumber(latestGrade)}`,
      comparison: buildComparison(latestScore, baseline, previous ? "比上次" : "比平均", "分"),
    }));
  });

  latestNodes.cards.appendChild(fragment);
}

function renderTrendChart() {
  trendChart.innerHTML = "";

  const metricLabel = activeMetric === "totalGrade" ? "總級分" : "總分";
  const chartRecords = records
    .map((record) => ({ record, value: activeMetric === "totalGrade" ? record.totalGrade : record.totalScore }))
    .filter((item) => Number.isFinite(item.value));

  if (!chartRecords.length) {
    trendChartEmpty.hidden = false;
    trendChartEmpty.textContent = `至少新增 1 筆含 ${metricLabel} 的資料後才會顯示圖表。`;
    return;
  }

  trendChartEmpty.hidden = true;

  const width = 800;
  const height = 320;
  const padding = { top: 24, right: 28, bottom: 48, left: 58 };
  const values = chartRecords.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, activeMetric === "totalGrade" ? 4 : 10);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = chartRecords.map((item, index) => {
    const x = padding.left + (chartRecords.length === 1 ? innerWidth / 2 : (innerWidth * index) / (chartRecords.length - 1));
    const y = padding.top + innerHeight - ((item.value - minValue) / range) * innerHeight;
    return { x, y, item };
  });

  appendSvgNode(trendChart, "line", {
    x1: padding.left,
    y1: padding.top,
    x2: padding.left,
    y2: height - padding.bottom,
    stroke: "#c4d5f8",
    "stroke-width": "1.5",
  });

  appendSvgNode(trendChart, "line", {
    x1: padding.left,
    y1: height - padding.bottom,
    x2: width - padding.right,
    y2: height - padding.bottom,
    stroke: "#c4d5f8",
    "stroke-width": "1.5",
  });

  for (let step = 0; step <= 4; step += 1) {
    const y = padding.top + innerHeight - (innerHeight * step) / 4;
    const value = minValue + (range * step) / 4;

    appendSvgNode(trendChart, "line", {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: "#e5edfd",
      "stroke-width": "1",
      "stroke-dasharray": "4 6",
    });

    appendSvgNode(trendChart, "text", {
      x: padding.left - 10,
      y: y + 5,
      fill: "#5d6880",
      "font-size": "12",
      "text-anchor": "end",
    }, formatDisplayScore(value));
  }

  appendSvgNode(trendChart, "polyline", {
    fill: "none",
    stroke: activeMetric === "totalGrade" ? "#20a16b" : "#3563e9",
    "stroke-width": "4",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    points: points.map((point) => `${point.x},${point.y}`).join(" "),
  });

  points.forEach((point) => {
    appendSvgNode(trendChart, "circle", {
      cx: point.x,
      cy: point.y,
      r: "5.5",
      fill: "#ffffff",
      stroke: activeMetric === "totalGrade" ? "#20a16b" : "#3563e9",
      "stroke-width": "3",
    });

    appendSvgNode(trendChart, "text", {
      x: point.x,
      y: point.y - 12,
      fill: "#2648ac",
      "font-size": "12",
      "font-weight": "700",
      "text-anchor": "middle",
    }, formatDisplayScore(point.item.value));

    appendSvgNode(trendChart, "text", {
      x: point.x,
      y: height - padding.bottom + 22,
      fill: "#5d6880",
      "font-size": "12",
      "text-anchor": "middle",
    }, formatCompactDate(point.item.record.examDate));
  });
}

function renderRadarChart() {
  radarChart.innerHTML = "";

  const latest = getLatestRecord();
  if (!latest) {
    radarChartEmpty.hidden = false;
    return;
  }

  const averageValues = SUBJECTS.map((subject) => average(getFiniteValues(records.map((record) => record[subject.scoreKey]))));
  const latestValues = SUBJECTS.map((subject) => latest[subject.scoreKey]);
  const validAverage = averageValues.some((value) => Number.isFinite(value));
  const validLatest = latestValues.some((value) => Number.isFinite(value));

  if (!validAverage && !validLatest) {
    radarChartEmpty.hidden = false;
    return;
  }

  radarChartEmpty.hidden = true;

  const width = 400;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2 + 10;
  const radius = 108;
  const levels = [20, 40, 60, 80, 100];

  levels.forEach((level) => {
    const polygonPoints = SUBJECTS.map((_, index) => {
      const angle = getRadarAngle(index);
      const pointRadius = (level / 100) * radius;
      return `${centerX + Math.cos(angle) * pointRadius},${centerY + Math.sin(angle) * pointRadius}`;
    }).join(" ");

    appendSvgNode(radarChart, "polygon", {
      points: polygonPoints,
      fill: "none",
      stroke: "#dbe6fb",
      "stroke-width": "1",
    });
  });

  SUBJECTS.forEach((subject, index) => {
    const angle = getRadarAngle(index);
    const axisX = centerX + Math.cos(angle) * radius;
    const axisY = centerY + Math.sin(angle) * radius;
    const labelX = centerX + Math.cos(angle) * (radius + 22);
    const labelY = centerY + Math.sin(angle) * (radius + 22);

    appendSvgNode(radarChart, "line", {
      x1: centerX,
      y1: centerY,
      x2: axisX,
      y2: axisY,
      stroke: "#dbe6fb",
      "stroke-width": "1",
    });

    appendSvgNode(radarChart, "text", {
      x: labelX,
      y: labelY,
      fill: "#4d5972",
      "font-size": "13",
      "font-weight": "700",
      "text-anchor": "middle",
    }, subject.shortLabel);
  });

  appendSvgNode(radarChart, "polygon", {
    points: buildRadarPolygon(averageValues, centerX, centerY, radius),
    fill: "rgba(53, 99, 233, 0.16)",
    stroke: "#3563e9",
    "stroke-width": "2.5",
  });

  appendSvgNode(radarChart, "polygon", {
    points: buildRadarPolygon(latestValues, centerX, centerY, radius),
    fill: "rgba(32, 161, 107, 0.18)",
    stroke: "#20a16b",
    "stroke-width": "2.5",
  });
}

function renderGoalProgress() {
  goalProgressList.innerHTML = "";
  const latest = getLatestRecord();
  const items = [];

  if (goals.goalName) {
    items.push({ label: "目標校系", value: goals.goalName, status: "neutral" });
  }

  const latestTotalGap = buildGoalProgressItem("總級分", latest ? latest.totalGrade : null, goals.targetTotalGrade, "級");
  if (latestTotalGap) {
    items.push(latestTotalGap);
  }

  const latestScoreGap = buildGoalProgressItem("總分", latest ? latest.totalScore : null, goals.targetTotalScore, "分");
  if (latestScoreGap) {
    items.push(latestScoreGap);
  }

  SUBJECTS.forEach((subject) => {
    const item = buildGoalProgressItem(subject.label, latest ? latest[subject.gradeKey] : null, goals[`target${capitalize(subject.key)}Grade`], "級");
    if (item) {
      items.push(item);
    }
  });

  if (!items.length) {
    goalProgressList.innerHTML = '<div class="empty-state compact-empty">尚未設定任何目標。</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const node = document.createElement("article");
    node.className = `goal-progress-item ${item.status || "neutral"}`;
    node.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong><small>${item.detail || ""}</small>`;
    fragment.appendChild(node);
  });
  goalProgressList.appendChild(fragment);
}

function renderReviewTagSummary() {
  reviewTagSummary.innerHTML = "";
  const tagCounts = new Map();

  records.forEach((record) => {
    record.reviewTags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  if (!tagCounts.size) {
    reviewTagSummary.innerHTML = '<span class="empty-inline">目前尚未使用任何檢討標籤。</span>';
    return;
  }

  [...tagCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .forEach(([tag, count]) => {
      const tagNode = createTag(`${tag} ×${count}`);
      tagNode.classList.add("muted-tag");
      reviewTagSummary.appendChild(tagNode);
    });
}

function renderRecords() {
  recordsBody.innerHTML = "";

  if (!records.length) {
    recordsBody.innerHTML = '<tr class="empty-row"><td colspan="12">目前還沒有任何模擬考紀錄。</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();

  records.forEach((record) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-field="date"]').textContent = formatDisplayDate(record.examDate);
    row.querySelector('[data-field="name"]').textContent = record.examName;
    row.querySelector('[data-field="totalScore"]').textContent = formatMaybeNumber(record.totalScore);
    row.querySelector('[data-field="totalGrade"]').textContent = formatMaybeNumber(record.totalGrade);
    row.querySelector('[data-field="chinese"]').textContent = formatSubjectCell(record, "chinese");
    row.querySelector('[data-field="english"]').textContent = formatSubjectCell(record, "english");
    row.querySelector('[data-field="math"]').textContent = formatSubjectCell(record, "math");
    row.querySelector('[data-field="social"]').textContent = formatSubjectCell(record, "social");
    row.querySelector('[data-field="science"]').textContent = formatSubjectCell(record, "science");
    row.querySelector('[data-field="notes"]').textContent = record.notes || "—";

    const tagsCell = row.querySelector('[data-field="tags"]');
    if (record.reviewTags.length) {
      record.reviewTags.forEach((tag) => tagsCell.appendChild(createTag(tag)));
    } else {
      tagsCell.textContent = "—";
    }

    row.querySelector(".table-delete-btn").addEventListener("click", () => handleDeleteRecord(record.id));
    fragment.appendChild(row);
  });

  recordsBody.appendChild(fragment);
}

function openScoreModal() {
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeScoreModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function updateMetricButtons() {
  metricButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.metric === activeMetric);
  });
}

function syncGoalForm() {
  if (!goalForm) {
    return;
  }

  setGoalFieldValue("goalName", goals.goalName || "");
  setGoalFieldValue("targetTotalScore", valueToInput(goals.targetTotalScore));
  setGoalFieldValue("targetTotalGrade", valueToInput(goals.targetTotalGrade));
  setGoalFieldValue("targetChineseGrade", valueToInput(goals.targetChineseGrade));
  setGoalFieldValue("targetEnglishGrade", valueToInput(goals.targetEnglishGrade));
  setGoalFieldValue("targetMathGrade", valueToInput(goals.targetMathGrade));
  setGoalFieldValue("targetSocialGrade", valueToInput(goals.targetSocialGrade));
  setGoalFieldValue("targetScienceGrade", valueToInput(goals.targetScienceGrade));
}

function setGoalFieldValue(fieldName, value) {
  if (fieldName === "goalName") {
    if (goalForm.goalName) {
      goalForm.goalName.value = value;
    }
    return;
  }

  const field = goalForm.elements.namedItem(fieldName);
  if (field) {
    field.value = value;
  }
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEYS.records);
  const fallbackRecords = DEFAULT_RECORDS.map(cloneRecord);

  if (!raw) {
    tryPersist(STORAGE_KEYS.records, fallbackRecords, "成績資料無法初始化到瀏覽器。");
    return sortRecords(fallbackRecords);
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = Array.isArray(parsed) ? parsed.map(normalizeRecord).filter(Boolean) : [];
    const merged = mergeDefaultRecords(normalized);
    tryPersist(STORAGE_KEYS.records, merged, "成績資料無法更新到新版格式。");
    return sortRecords(merged);
  } catch (error) {
    reportStorageError("已儲存的成績資料格式錯誤，已回退到內建資料。", error);
    return sortRecords(fallbackRecords);
  }
}

function loadGoals() {
  const fixedGoals = { ...DEFAULT_GOALS };
  tryPersist(STORAGE_KEYS.goals, fixedGoals, "固定目標設定無法同步到瀏覽器。");
  return fixedGoals;
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

function saveGoals(nextGoals) {
  try {
    localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(nextGoals));
    goals = { ...DEFAULT_GOALS, ...nextGoals };
    syncGoalForm();
    return true;
  } catch (error) {
    reportStorageError("目標設定無法儲存到瀏覽器。", error);
    return false;
  }
}

function tryPersist(key, value, errorMessage) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    reportStorageError(errorMessage, error);
  }
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const examName = typeof record.examName === "string" ? record.examName.trim() : "";
  const examDate = typeof record.examDate === "string" ? record.examDate : "";
  const normalized = {
    id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
    examName,
    examDate,
    totalScore: toOptionalNumber(record.totalScore),
    totalGrade: toOptionalInteger(record.totalGrade),
    chineseScore: toOptionalNumber(firstDefined(record.chineseScore, record.chinese)),
    chineseGrade: toOptionalInteger(record.chineseGrade),
    englishScore: toOptionalNumber(firstDefined(record.englishScore, record.english)),
    englishGrade: toOptionalInteger(record.englishGrade),
    mathScore: toOptionalNumber(firstDefined(record.mathScore, record.math)),
    mathGrade: toOptionalInteger(record.mathGrade),
    socialScore: toOptionalNumber(firstDefined(record.socialScore, record.social)),
    socialGrade: toOptionalInteger(record.socialGrade),
    scienceScore: toOptionalNumber(firstDefined(record.scienceScore, record.science)),
    scienceGrade: toOptionalInteger(record.scienceGrade),
    reviewTags: Array.isArray(record.reviewTags) ? record.reviewTags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    notes: typeof record.notes === "string" ? record.notes.trim() : "",
  };

  if (!normalized.examName || !normalized.examDate || !Number.isFinite(normalized.totalScore)) {
    return null;
  }

  if (normalized.totalGrade === null) {
    normalized.totalGrade = sumGrades(normalized);
  }

  return normalized;
}

function mergeDefaultRecords(sourceRecords) {
  const merged = [...sourceRecords];

  DEFAULT_RECORDS.forEach((defaultRecord) => {
    const normalizedDefault = normalizeRecord(defaultRecord);
    const existingIndex = merged.findIndex((record) => (
      record.id === normalizedDefault.id
      || (record.examName === normalizedDefault.examName && record.examDate === normalizedDefault.examDate)
    ));

    if (existingIndex >= 0) {
      merged[existingIndex] = mergeRecord(normalizedDefault, merged[existingIndex]);
    } else {
      merged.push(cloneRecord(normalizedDefault));
    }
  });

  return sortRecords(merged);
}

function mergeRecord(defaultRecord, storedRecord) {
  const merged = { ...defaultRecord, ...storedRecord };

  SUBJECTS.forEach((subject) => {
    merged[subject.scoreKey] = coalesceNumber(storedRecord[subject.scoreKey], defaultRecord[subject.scoreKey]);
    merged[subject.gradeKey] = coalesceNumber(storedRecord[subject.gradeKey], defaultRecord[subject.gradeKey]);
  });

  merged.totalScore = coalesceNumber(storedRecord.totalScore, defaultRecord.totalScore);
  merged.totalGrade = coalesceNumber(storedRecord.totalGrade, defaultRecord.totalGrade);
  merged.reviewTags = storedRecord.reviewTags.length ? storedRecord.reviewTags : defaultRecord.reviewTags;
  merged.notes = storedRecord.notes || defaultRecord.notes;
  return merged;
}

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record));
}

function sortRecords(sourceRecords) {
  return [...sourceRecords].sort((left, right) => new Date(left.examDate) - new Date(right.examDate));
}

function getLatestRecord() {
  return records.at(-1) || null;
}

function getPreviousRecord() {
  return records.length > 1 ? records.at(-2) : null;
}

function getGoalGap(latest) {
  if (!latest) {
    return { value: "未設定", detail: "先新增成績與目標" };
  }

  if (Number.isFinite(goals.targetTotalGrade)) {
    const diff = goals.targetTotalGrade - safeNumber(latest.totalGrade);
    return diff <= 0
      ? { value: `超前 ${Math.abs(diff)} 級`, detail: goals.goalName || "總級分已達成目標" }
      : { value: `還差 ${diff} 級`, detail: goals.goalName || "以總級分為主要目標" };
  }

  if (Number.isFinite(goals.targetTotalScore)) {
    const diff = goals.targetTotalScore - safeNumber(latest.totalScore);
    return diff <= 0
      ? { value: `超前 ${formatDisplayScore(Math.abs(diff))} 分`, detail: goals.goalName || "總分已超過目標" }
      : { value: `還差 ${formatDisplayScore(diff)} 分`, detail: goals.goalName || "以總分為主要目標" };
  }

  return { value: "未設定", detail: "先設定總分或總級分目標" };
}

function buildGoalProgressItem(label, currentValue, targetValue, unit) {
  if (!Number.isFinite(targetValue)) {
    return null;
  }

  if (!Number.isFinite(currentValue)) {
    return { label, value: `目標 ${targetValue}${unit}`, detail: "目前尚無資料", status: "neutral" };
  }

  const diff = targetValue - currentValue;
  if (diff <= 0) {
    return { label, value: `達標 +${Math.abs(diff)}${unit}`, detail: `目前 ${currentValue}${unit} / 目標 ${targetValue}${unit}`, status: "positive" };
  }

  return { label, value: `還差 ${diff}${unit}`, detail: `目前 ${currentValue}${unit} / 目標 ${targetValue}${unit}`, status: "negative" };
}

function getBestImprovementSubject(latest, previous) {
  if (!latest || !previous) {
    return { value: "暫無資料", detail: "至少需要 2 筆成績才可比較", status: "" };
  }

  const comparisons = SUBJECTS
    .map((subject) => {
      const latestScore = latest[subject.scoreKey];
      const previousScore = previous[subject.scoreKey];
      if (!Number.isFinite(latestScore) || !Number.isFinite(previousScore)) {
        return null;
      }

      return {
        label: subject.label,
        delta: latestScore - previousScore,
      };
    })
    .filter(Boolean);

  if (!comparisons.length) {
    return { value: "暫無資料", detail: "缺少可比較的各科分數", status: "" };
  }

  const best = comparisons.reduce((currentBest, item) => (item.delta > currentBest.delta ? item : currentBest));

  if (best.delta > 0) {
    return {
      value: best.label,
      detail: `比上一場進步 ${formatDisplayScore(best.delta)} 分`,
      status: "positive",
    };
  }

  if (best.delta === 0) {
    return {
      value: best.label,
      detail: "與上一場持平，暫無科目進步",
      status: "",
    };
  }

  return {
    value: "暫無進步",
    detail: `${best.label} 變化最小，${formatDisplayScore(best.delta)} 分`,
    status: "negative",
  };
}

function createInsightCard({ title, value, detail, comparison }) {
  const node = latestCardTemplate.content.firstElementChild.cloneNode(true);
  const badge = node.querySelector(".delta-badge");

  node.querySelector(".insight-card-title").textContent = title;
  node.querySelector(".insight-card-value").textContent = value;
  node.querySelector(".insight-card-detail").textContent = detail;
  node.querySelector(".insight-card-caption").textContent = comparison.label;
  badge.textContent = comparison.icon;
  badge.className = `delta-badge ${comparison.tone}`;
  return node;
}

function buildComparison(currentValue, baselineValue, prefix, unit) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue)) {
    return { icon: "•", tone: "neutral", label: "資料不足，暫時無法比較" };
  }

  const diff = currentValue - baselineValue;
  if (diff > 0) {
    return { icon: "▲", tone: "positive", label: `${prefix} +${formatDisplayScore(diff)} ${unit}` };
  }

  if (diff < 0) {
    return { icon: "▼", tone: "negative", label: `${prefix} ${formatDisplayScore(diff)} ${unit}` };
  }

  return { icon: "•", tone: "neutral", label: `${prefix} 持平` };
}

function formatSubjectCell(record, subjectKey) {
  const subject = SUBJECTS.find((item) => item.key === subjectKey);
  const score = formatMaybeNumber(record[subject.scoreKey]);
  const grade = formatMaybeNumber(record[subject.gradeKey]);
  return `${score} / ${grade}`;
}

function formatMaybeNumber(value) {
  return Number.isFinite(value) ? formatDisplayScore(value) : "—";
}

function formatSignedNumber(value, unit) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (value > 0) {
    return `+${formatDisplayScore(value)} ${unit}`;
  }
  return `${formatDisplayScore(value)} ${unit}`;
}

function getFiniteValues(values) {
  return values.filter((value) => Number.isFinite(value));
}

function sumGrades(record) {
  const gradeValues = SUBJECTS.map((subject) => record[subject.gradeKey]).filter((value) => Number.isFinite(value));
  return gradeValues.length ? gradeValues.reduce((sum, value) => sum + value, 0) : null;
}

function createTag(label) {
  const tag = document.createElement("span");
  tag.className = "tag-chip";
  tag.textContent = label;
  return tag;
}

function buildRadarPolygon(values, centerX, centerY, radius) {
  return SUBJECTS.map((_, index) => {
    const angle = getRadarAngle(index);
    const safeValue = Number.isFinite(values[index]) ? values[index] : 0;
    const pointRadius = Math.max(0, Math.min(100, safeValue)) / 100 * radius;
    return `${centerX + Math.cos(angle) * pointRadius},${centerY + Math.sin(angle) * pointRadius}`;
  }).join(" ");
}

function getRadarAngle(index) {
  return (-Math.PI / 2) + (Math.PI * 2 * index) / SUBJECTS.length;
}

function appendSvgNode(target, tagName, attributes, textContent = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  if (textContent) {
    node.textContent = textContent;
  }
  target.appendChild(node);
}

function isValidRecord(record) {
  return Boolean(
    record.examName &&
    record.examDate &&
    Number.isFinite(record.totalScore)
  );
}

function parseTags(rawTags) {
  return rawTags
    .split(/[\s,，]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .filter((tag, index, array) => array.indexOf(tag) === index);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function coalesceNumber(primaryValue, fallbackValue) {
  return Number.isFinite(primaryValue) ? primaryValue : fallbackValue;
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function valueToInput(value) {
  return value === null || value === undefined ? "" : String(value);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
