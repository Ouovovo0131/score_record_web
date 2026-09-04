const {
  STORAGE_KEYS,
  ENGLISH_PRACTICE_TYPES,
  ENGLISH_UNAVAILABLE_CATEGORY_MAP,
  ENGLISH_CATEGORIES,
  average,
  compactDate: formatCompactDate,
  formatDate: formatDisplayDate,
  formatScore: formatDisplayScore,
} = window.ScoreRecordApp;

const englishForm = document.querySelector("#english-form");
const englishModal = document.querySelector("#english-modal");
const englishModalBackdrop = document.querySelector("#english-modal-backdrop");
const openEnglishModalButton = document.querySelector("#open-english-modal-btn");
const closeEnglishModalButton = document.querySelector("#close-english-modal-btn");
const resetEnglishFormButton = document.querySelector("#reset-english-form-btn");
const clearEnglishRecordsButton = document.querySelector("#clear-english-records-btn");
const englishStatusMessage = document.querySelector("#english-status-message");
const englishRecordsBody = document.querySelector("#english-records-body");
const englishRowTemplate = document.querySelector("#english-record-row-template");
const englishInsightTemplate = document.querySelector("#english-insight-card-template");
const englishTypeSummary = document.querySelector("#english-type-summary");
const englishPracticeFindings = document.querySelector("#english-practice-findings");

const englishTrendChart = document.querySelector("#english-trend-chart");
const englishTrendEmpty = document.querySelector("#english-trend-empty");
const englishCategoryChart = document.querySelector("#english-category-chart");
const englishCategoryEmpty = document.querySelector("#english-category-empty");

const englishStatNodes = {
  recordCount: document.querySelector("#english-record-count"),
  averageScore: document.querySelector("#english-average-score"),
  highestScore: document.querySelector("#english-highest-score"),
  miaomiaoAverage: document.querySelector("#miaomiao-average-score"),
  clozeAverage: document.querySelector("#cloze-average-score"),
};

const englishLatestNodes = {
  title: document.querySelector("#english-latest-title"),
  meta: document.querySelector("#english-latest-meta"),
  reference: document.querySelector("#english-latest-reference"),
  cards: document.querySelector("#english-insight-grid"),
  typeBadge: document.querySelector("#english-type-badge"),
};

let englishRecords = loadEnglishRecords();

initializeEnglishPage();

function initializeEnglishPage() {
  openEnglishModalButton.addEventListener("click", openEnglishModal);
  closeEnglishModalButton.addEventListener("click", closeEnglishModal);
  englishModalBackdrop.addEventListener("click", closeEnglishModal);
  resetEnglishFormButton.addEventListener("click", () => englishForm.reset());
  clearEnglishRecordsButton.addEventListener("click", handleClearEnglishRecords);
  englishForm.addEventListener("submit", handleAddEnglishRecord);
  englishForm.practiceType.addEventListener("change", syncEnglishCategoryInputs);
  document.addEventListener("keydown", handleEnglishKeydown);
  syncEnglishCategoryInputs();
  renderEnglishPage();
}

function handleEnglishKeydown(event) {
  if (event.key === "Escape" && !englishModal.hidden) {
    closeEnglishModal();
  }
}

function handleAddEnglishRecord(event) {
  event.preventDefault();

  const formData = new FormData(englishForm);
  const record = {
    id: crypto.randomUUID(),
    practiceType: String(formData.get("practiceType")),
    practiceDate: String(formData.get("practiceDate")),
    practiceName: String(formData.get("practiceName")).trim(),
    vocabularyScore: toOptionalNumber(formData.get("vocabularyScore")),
    clozeScore: toOptionalNumber(formData.get("clozeScore")),
    contextScore: toOptionalNumber(formData.get("contextScore")),
    structureScore: toOptionalNumber(formData.get("structureScore")),
    readingScore: toOptionalNumber(formData.get("readingScore")),
    mixedScore: toOptionalNumber(formData.get("mixedScore")),
    totalScore: toOptionalNumber(formData.get("totalScore")),
    notes: String(formData.get("notes")).trim(),
  };

  applyUnavailableEnglishCategories(record);

  if (record.totalScore === null) {
    record.totalScore = sumEnglishScores(record);
  }

  if (!isValidEnglishRecord(record)) {
    window.alert("請至少填寫練習類型、日期，並至少輸入一項英文成績。");
    return;
  }

  const nextRecords = sortEnglishRecords(englishRecords.concat(record));
  if (!saveEnglishRecords(nextRecords)) {
    return;
  }

  renderEnglishPage();
  englishForm.reset();
  closeEnglishModal();
  showEnglishStatus("已新增英文練習紀錄。", "success");
}

function handleDeleteEnglishRecord(recordId) {
  const nextRecords = englishRecords.filter((record) => record.id !== recordId);
  if (!saveEnglishRecords(nextRecords)) {
    return;
  }

  renderEnglishPage();
  showEnglishStatus("已刪除該筆英文紀錄。", "success");
}

function handleClearEnglishRecords() {
  if (!englishRecords.length) {
    window.alert("目前沒有可清空的英文紀錄。");
    return;
  }

  const confirmed = window.confirm("確定要清空所有英文練習紀錄嗎？");
  if (!confirmed) {
    return;
  }

  if (!saveEnglishRecords([])) {
    return;
  }

  renderEnglishPage();
  showEnglishStatus("已清空所有英文紀錄。", "success");
}

function renderEnglishPage() {
  renderEnglishStats();
  renderEnglishLatestInsight();
  renderEnglishTypeSummary();
  renderEnglishFindings();
  renderEnglishTrendChart();
  renderEnglishCategoryChart();
  renderEnglishTable();
}

function renderEnglishStats() {
  const totals = getFiniteValues(englishRecords.map((record) => record.totalScore));
  englishStatNodes.recordCount.textContent = String(englishRecords.length);
  englishStatNodes.averageScore.textContent = totals.length ? formatDisplayScore(average(totals)) : "0";
  englishStatNodes.highestScore.textContent = totals.length ? formatDisplayScore(Math.max(...totals)) : "0";
  englishStatNodes.miaomiaoAverage.textContent = formatTypeAverage("miaomiao");
  englishStatNodes.clozeAverage.textContent = formatTypeAverage("cloze");
}

function renderEnglishLatestInsight() {
  const latest = getLatestEnglishRecord();
  englishLatestNodes.cards.innerHTML = "";
  englishLatestNodes.typeBadge.innerHTML = "";

  if (!latest) {
    englishLatestNodes.title.textContent = "尚無英文練習紀錄";
    englishLatestNodes.meta.textContent = "新增第一筆英文紀錄後，這裡會自動分析。";
    englishLatestNodes.reference.textContent = "目前沒有可比較的英文練習資料。";
    englishLatestNodes.cards.innerHTML = '<div class="empty-state">新增英文成績後，這裡會顯示總分與各題型的比較分析。</div>';
    return;
  }

  const typeLabel = getPracticeTypeLabel(latest.practiceType);
  const baseline = getPreviousSameTypeRecord(latest) || getPreviousEnglishRecord(latest);

  englishLatestNodes.title.textContent = latest.practiceName || `${typeLabel} 練習`;
  englishLatestNodes.meta.textContent = `${formatDisplayDate(latest.practiceDate)} · ${typeLabel} · 總分 ${formatMaybeNumber(latest.totalScore)}`;
  englishLatestNodes.reference.textContent = baseline
    ? `以下箭頭優先與前一次 ${getPracticeTypeLabel(baseline.practiceType)} 練習比較。`
    : "目前只有 1 筆紀錄，以下以整體平均作為比較基準。";
  englishLatestNodes.typeBadge.appendChild(createTag(typeLabel));

  const fragment = document.createDocumentFragment();
  fragment.appendChild(createEnglishInsightCard({
    title: "總分",
    value: formatMaybeNumber(latest.totalScore),
    detail: `類型：${typeLabel}`,
    comparison: buildEnglishComparison(latest.totalScore, baseline ? baseline.totalScore : average(getFiniteValues(englishRecords.map((record) => record.totalScore)))),
  }));

  ENGLISH_CATEGORIES.forEach((category) => {
    const baselineValue = getLatestInsightBaseline(latest, baseline, category);
    const miaomiaoOnly = isMiaomiaoOnlyCategory(category.key);

    fragment.appendChild(createEnglishInsightCard({
      title: category.label,
      value: formatEnglishCategoryValue(latest, category.key),
      detail: isUnavailableCategory(latest.practiceType, category.key)
        ? `${typeLabel} 不含此題型`
        : miaomiaoOnly
          ? "僅統計妙妙卷"
          : `${typeLabel} 最近一次`,
      comparison: isUnavailableCategory(latest.practiceType, category.key)
        ? { icon: "-", tone: "neutral", label: "此練習類型不適用" }
        : buildEnglishComparison(latest[category.key], baselineValue),
    }));
  });

  englishLatestNodes.cards.appendChild(fragment);
}

function renderEnglishTypeSummary() {
  englishTypeSummary.innerHTML = "";

  if (!englishRecords.length) {
    englishTypeSummary.innerHTML = '<div class="empty-state compact-empty">目前沒有英文練習資料。</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  ENGLISH_PRACTICE_TYPES.forEach((type) => {
    const typeRecords = englishRecords.filter((record) => record.practiceType === type.key);
    const totals = getFiniteValues(typeRecords.map((record) => record.totalScore));
    const node = document.createElement("article");
    node.className = "goal-progress-item neutral";
    node.innerHTML = `
      <span>${type.label}</span>
      <strong>${totals.length ? formatDisplayScore(average(totals)) : "0"}</strong>
      <small>${typeRecords.length} 筆資料</small>
    `;
    fragment.appendChild(node);
  });

  englishTypeSummary.appendChild(fragment);
}

function renderEnglishFindings() {
  englishPracticeFindings.innerHTML = "";

  if (!englishRecords.length) {
    englishPracticeFindings.innerHTML = '<p class="empty-inline">目前沒有資料可分析。</p>';
    return;
  }

  const averages = ENGLISH_CATEGORIES.map((category) => ({
    label: category.label,
    value: getCategoryAverageRate(category.key),
  })).filter((item) => Number.isFinite(item.value));

  if (!averages.length) {
    englishPracticeFindings.innerHTML = '<p class="empty-inline">目前沒有足夠的細分題型資料。</p>';
    return;
  }

  averages.sort((left, right) => right.value - left.value);
  const strongest = averages[0];
  const weakest = averages.at(-1);

  englishPracticeFindings.innerHTML = `
    <p><strong>最穩定題型：</strong>${strongest.label}（平均得分率 ${formatDisplayScore(strongest.value)}%）</p>
    <p><strong>最需要補強：</strong>${weakest.label}（平均得分率 ${formatDisplayScore(weakest.value)}%）</p>
  `;
}

function renderEnglishTrendChart() {
  englishTrendChart.innerHTML = "";

  if (!englishRecords.length) {
    englishTrendEmpty.hidden = false;
    return;
  }

  englishTrendEmpty.hidden = true;

  const width = 800;
  const height = 320;
  const padding = { top: 24, right: 28, bottom: 48, left: 58 };
  const allValues = getFiniteValues(englishRecords.map((record) => record.totalScore));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = Math.max(maxValue - minValue, 10);
  const typeColors = { miaomiao: "#3563e9", cloze: "#20a16b" };

  appendSvgNode(englishTrendChart, "line", {
    x1: padding.left,
    y1: padding.top,
    x2: padding.left,
    y2: height - padding.bottom,
    stroke: "#c4d5f8",
    "stroke-width": "1.5",
  });

  appendSvgNode(englishTrendChart, "line", {
    x1: padding.left,
    y1: height - padding.bottom,
    x2: width - padding.right,
    y2: height - padding.bottom,
    stroke: "#c4d5f8",
    "stroke-width": "1.5",
  });

  for (let step = 0; step <= 4; step += 1) {
    const y = padding.top + (height - padding.top - padding.bottom) - ((height - padding.top - padding.bottom) * step) / 4;
    const value = minValue + (range * step) / 4;

    appendSvgNode(englishTrendChart, "line", {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: "#e5edfd",
      "stroke-width": "1",
      "stroke-dasharray": "4 6",
    });

    appendSvgNode(englishTrendChart, "text", {
      x: padding.left - 10,
      y: y + 5,
      fill: "#5d6880",
      "font-size": "12",
      "text-anchor": "end",
    }, formatDisplayScore(value));
  }

  ENGLISH_PRACTICE_TYPES.forEach((type) => {
    const typeRecords = englishRecords
      .filter((record) => record.practiceType === type.key && Number.isFinite(record.totalScore))
      .map((record, index, array) => {
        const x = padding.left + (array.length === 1 ? (width - padding.left - padding.right) / 2 : ((width - padding.left - padding.right) * index) / (array.length - 1));
        const y = padding.top + (height - padding.top - padding.bottom) - ((record.totalScore - minValue) / range) * (height - padding.top - padding.bottom);
        return { record, x, y };
      });

    if (!typeRecords.length) {
      return;
    }

    appendSvgNode(englishTrendChart, "polyline", {
      fill: "none",
      stroke: typeColors[type.key],
      "stroke-width": "4",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      points: typeRecords.map((point) => `${point.x},${point.y}`).join(" "),
    });

    typeRecords.forEach((point) => {
      appendSvgNode(englishTrendChart, "circle", {
        cx: point.x,
        cy: point.y,
        r: "5.5",
        fill: "#ffffff",
        stroke: typeColors[type.key],
        "stroke-width": "3",
      });

      appendSvgNode(englishTrendChart, "text", {
        x: point.x,
        y: height - padding.bottom + 22,
        fill: "#5d6880",
        "font-size": "12",
        "text-anchor": "middle",
      }, formatCompactDate(point.record.practiceDate));
    });
  });
}

function renderEnglishCategoryChart() {
  englishCategoryChart.innerHTML = "";

  if (!englishRecords.length) {
    englishCategoryEmpty.hidden = false;
    return;
  }

  const hasAnyCategory = ENGLISH_CATEGORIES.some((category) => {
    return ENGLISH_PRACTICE_TYPES.some((type) => Number.isFinite(getCategoryRateByType(category.key, type.key)));
  });
  if (!hasAnyCategory) {
    englishCategoryEmpty.hidden = false;
    return;
  }

  englishCategoryEmpty.hidden = true;

  const width = 520;
  const height = 320;
  const padding = { top: 24, right: 20, bottom: 80, left: 40 };
  const colors = { miaomiao: "#3563e9", cloze: "#20a16b" };
  const barGroupWidth = (width - padding.left - padding.right) / ENGLISH_CATEGORIES.length;

  appendSvgNode(englishCategoryChart, "line", {
    x1: padding.left,
    y1: height - padding.bottom,
    x2: width - padding.right,
    y2: height - padding.bottom,
    stroke: "#c4d5f8",
    "stroke-width": "1.5",
  });

  for (let step = 0; step <= 5; step += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) * step) / 5;
    const value = 100 - step * 20;

    appendSvgNode(englishCategoryChart, "line", {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: "#e5edfd",
      "stroke-width": "1",
      "stroke-dasharray": "4 6",
    });

    appendSvgNode(englishCategoryChart, "text", {
      x: padding.left - 8,
      y: y + 4,
      fill: "#5d6880",
      "font-size": "11",
      "text-anchor": "end",
    }, String(value));
  }

  ENGLISH_CATEGORIES.forEach((category, categoryIndex) => {
    const groupX = padding.left + categoryIndex * barGroupWidth;
    const barWidth = Math.min(24, (barGroupWidth - 18) / 2);

    ENGLISH_PRACTICE_TYPES.forEach((type, typeIndex) => {
      const typeAverageRate = getCategoryRateByType(category.key, type.key);
      const unavailable = isUnavailableCategory(type.key, category.key);
      const safeAverage = Number.isFinite(typeAverageRate) ? Math.max(0, Math.min(100, typeAverageRate)) : 0;
      const barHeight = ((height - padding.top - padding.bottom) * safeAverage) / 100;
      const x = groupX + 10 + typeIndex * (barWidth + 8);
      const y = height - padding.bottom - barHeight;

      appendSvgNode(englishCategoryChart, "rect", {
        x,
        y,
        width: barWidth,
        height: barHeight,
        rx: "8",
        fill: colors[type.key],
        opacity: Number.isFinite(typeAverageRate) ? "1" : unavailable ? "0.15" : "0.2",
      });

      appendSvgNode(englishCategoryChart, "text", {
        x: x + barWidth / 2,
        y: Number.isFinite(typeAverageRate) ? Math.max(padding.top + 12, y - 8) : y - 8,
        fill: unavailable ? "#7e879a" : "#4d5972",
        "font-size": "10",
        "text-anchor": "middle",
      }, unavailable ? "-" : Number.isFinite(typeAverageRate) ? `${formatDisplayScore(typeAverageRate)}%` : "—");
    });

    appendSvgNode(englishCategoryChart, "text", {
      x: groupX + barGroupWidth / 2,
      y: height - padding.bottom + 22,
      fill: "#4d5972",
      "font-size": "11",
      "text-anchor": "middle",
    }, category.label);
  });
}

function renderEnglishTable() {
  englishRecordsBody.innerHTML = "";

  if (!englishRecords.length) {
    englishRecordsBody.innerHTML = '<tr class="empty-row"><td colspan="12">目前還沒有英文練習紀錄。</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();
  englishRecords.forEach((record) => {
    const row = englishRowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-field="date"]').textContent = formatDisplayDate(record.practiceDate);
    row.querySelector('[data-field="type"]').textContent = getPracticeTypeLabel(record.practiceType);
    row.querySelector('[data-field="name"]').textContent = record.practiceName || "—";
    row.querySelector('[data-field="total"]').textContent = formatMaybeNumber(record.totalScore);
    row.querySelector('[data-field="vocabulary"]').textContent = formatEnglishCategoryValue(record, "vocabularyScore");
    row.querySelector('[data-field="cloze"]').textContent = formatMaybeNumber(record.clozeScore);
    row.querySelector('[data-field="context"]').textContent = formatMaybeNumber(record.contextScore);
    row.querySelector('[data-field="structure"]').textContent = formatMaybeNumber(record.structureScore);
    row.querySelector('[data-field="reading"]').textContent = formatEnglishCategoryValue(record, "readingScore");
    row.querySelector('[data-field="mixed"]').textContent = formatEnglishCategoryValue(record, "mixedScore");
    row.querySelector('[data-field="notes"]').textContent = record.notes || "—";
    row.querySelector(".table-delete-btn").addEventListener("click", () => handleDeleteEnglishRecord(record.id));
    fragment.appendChild(row);
  });

  englishRecordsBody.appendChild(fragment);
}

function loadEnglishRecords() {
  const raw = localStorage.getItem(STORAGE_KEYS.englishRecords);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortEnglishRecords(parsed.map(normalizeEnglishRecord).filter(Boolean)) : [];
  } catch (error) {
    reportEnglishStorageError("已儲存的英文練習資料格式錯誤，請重新建立紀錄。", error);
    return [];
  }
}

function saveEnglishRecords(nextRecords) {
  try {
    localStorage.setItem(STORAGE_KEYS.englishRecords, JSON.stringify(nextRecords));
    englishRecords = nextRecords;
    return true;
  } catch (error) {
    reportEnglishStorageError("英文練習資料無法儲存到瀏覽器。", error);
    return false;
  }
}

function normalizeEnglishRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const normalized = {
    id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
    practiceType: typeof record.practiceType === "string" ? record.practiceType : "miaomiao",
    practiceDate: typeof record.practiceDate === "string" ? record.practiceDate : "",
    practiceName: typeof record.practiceName === "string" ? record.practiceName.trim() : "",
    totalScore: toOptionalNumber(record.totalScore),
    vocabularyScore: toOptionalNumber(record.vocabularyScore),
    clozeScore: toOptionalNumber(record.clozeScore),
    contextScore: toOptionalNumber(record.contextScore),
    structureScore: toOptionalNumber(record.structureScore),
    readingScore: toOptionalNumber(record.readingScore),
    mixedScore: toOptionalNumber(record.mixedScore),
    notes: typeof record.notes === "string" ? record.notes.trim() : "",
  };

  applyUnavailableEnglishCategories(normalized);

  if (normalized.totalScore === null) {
    normalized.totalScore = sumEnglishScores(normalized);
  }

  return isValidEnglishRecord(normalized) ? normalized : null;
}

function sortEnglishRecords(recordsToSort) {
  return [...recordsToSort].sort((left, right) => new Date(left.practiceDate) - new Date(right.practiceDate));
}

function getLatestEnglishRecord() {
  return englishRecords.at(-1) || null;
}

function getPreviousEnglishRecord(latestRecord) {
  const index = englishRecords.findIndex((record) => record.id === latestRecord.id);
  return index > 0 ? englishRecords[index - 1] : null;
}

function getPreviousSameTypeRecord(latestRecord) {
  const sameTypeRecords = englishRecords.filter((record) => record.practiceType === latestRecord.practiceType);
  const index = sameTypeRecords.findIndex((record) => record.id === latestRecord.id);
  return index > 0 ? sameTypeRecords[index - 1] : null;
}

function getPracticeTypeLabel(typeKey) {
  return ENGLISH_PRACTICE_TYPES.find((type) => type.key === typeKey)?.label || typeKey;
}

function getUnavailableCategoryKeys(practiceType) {
  return ENGLISH_UNAVAILABLE_CATEGORY_MAP[practiceType] || [];
}

function isUnavailableCategory(practiceType, categoryKey) {
  return getUnavailableCategoryKeys(practiceType).includes(categoryKey);
}

function isMiaomiaoOnlyCategory(categoryKey) {
  return isUnavailableCategory("cloze", categoryKey);
}

function formatTypeAverage(typeKey) {
  const values = getFiniteValues(
    englishRecords
      .filter((record) => record.practiceType === typeKey)
      .map((record) => record.totalScore)
  );
  return values.length ? formatDisplayScore(average(values)) : "0";
}

function sumEnglishScores(record) {
  const values = ENGLISH_CATEGORIES.map((category) => record[category.key]).filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function applyUnavailableEnglishCategories(record) {
  getUnavailableCategoryKeys(record.practiceType).forEach((categoryKey) => {
    record[categoryKey] = null;
  });
}

function createEnglishInsightCard({ title, value, detail, comparison }) {
  const node = englishInsightTemplate.content.firstElementChild.cloneNode(true);
  const badge = node.querySelector(".delta-badge");
  node.querySelector(".insight-card-title").textContent = title;
  node.querySelector(".insight-card-value").textContent = value;
  node.querySelector(".insight-card-detail").textContent = detail;
  node.querySelector(".insight-card-caption").textContent = comparison.label;
  badge.textContent = comparison.icon;
  badge.className = `delta-badge ${comparison.tone}`;
  return node;
}

function buildEnglishComparison(currentValue, baselineValue) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue)) {
    return { icon: "•", tone: "neutral", label: "資料不足，暫時無法比較" };
  }

  const diff = currentValue - baselineValue;
  if (diff > 0) {
    return { icon: "▲", tone: "positive", label: `比基準 +${formatDisplayScore(diff)} 分` };
  }

  if (diff < 0) {
    return { icon: "▼", tone: "negative", label: `比基準 ${formatDisplayScore(diff)} 分` };
  }

  return { icon: "•", tone: "neutral", label: "與基準持平" };
}

function getLatestInsightBaseline(latest, baseline, category) {
  if (isMiaomiaoOnlyCategory(category.key)) {
    if (latest.practiceType === "miaomiao") {
      const previousMiaomiaoCategoryRecord = getPreviousCategoryRecord(latest, category.key, "miaomiao");
      if (previousMiaomiaoCategoryRecord) {
        return previousMiaomiaoCategoryRecord[category.key];
      }
    }
    return getCategoryAverageValue(category.key, "miaomiao");
  }

  if (baseline && Number.isFinite(baseline[category.key])) {
    return baseline[category.key];
  }

  const sameTypeBaseline = getPreviousCategoryRecord(latest, category.key, latest.practiceType);
  if (sameTypeBaseline) {
    return sameTypeBaseline[category.key];
  }

  return getCategoryAverageValue(category.key);
}

function getPreviousCategoryRecord(latestRecord, categoryKey, practiceType) {
  const recordsToSearch = englishRecords
    .filter((record) => record.id !== latestRecord.id && (!practiceType || record.practiceType === practiceType))
    .filter((record) => new Date(record.practiceDate) <= new Date(latestRecord.practiceDate))
    .filter((record) => Number.isFinite(record[categoryKey]));

  return recordsToSearch.at(-1) || null;
}

function getCategoryAverageValue(categoryKey, practiceType) {
  const values = getCategoryValues(categoryKey, practiceType);
  return values.length ? average(values) : null;
}

function getCategoryAverageRate(categoryKey, practiceType) {
  const category = ENGLISH_CATEGORIES.find((item) => item.key === categoryKey);
  if (!category || !Number.isFinite(category.maxScore) || category.maxScore <= 0) {
    return null;
  }

  const rates = getCategoryValues(categoryKey, practiceType).map((value) => (value / category.maxScore) * 100);
  return rates.length ? average(rates) : null;
}

function getCategoryValues(categoryKey, practiceType) {
  return getFiniteValues(
    englishRecords
      .filter((record) => !practiceType || record.practiceType === practiceType)
      .filter((record) => !isUnavailableCategory(record.practiceType, categoryKey))
      .map((record) => record[categoryKey])
  );
}

function getCategoryRateByType(categoryKey, practiceType) {
  if (isUnavailableCategory(practiceType, categoryKey)) {
    return null;
  }
  return getCategoryAverageRate(categoryKey, practiceType);
}

function createTag(text) {
  const tag = document.createElement("span");
  tag.className = "tag-chip";
  tag.textContent = text;
  return tag;
}

function appendSvgNode(target, tagName, attributes, textContent = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  if (textContent) {
    node.textContent = textContent;
  }
  target.appendChild(node);
}

function openEnglishModal() {
  englishModal.hidden = false;
  document.body.classList.add("modal-open");
  syncEnglishCategoryInputs();
}

function closeEnglishModal() {
  englishModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function isValidEnglishRecord(record) {
  const hasCategoryScore = ENGLISH_CATEGORIES.some((category) => Number.isFinite(record[category.key]));
  return Boolean(record.practiceType && record.practiceDate && (Number.isFinite(record.totalScore) || hasCategoryScore));
}

function formatMaybeNumber(value) {
  return Number.isFinite(value) ? formatDisplayScore(value) : "—";
}

function formatEnglishCategoryValue(record, categoryKey) {
  if (isUnavailableCategory(record.practiceType, categoryKey)) {
    return "-";
  }
  return formatMaybeNumber(record[categoryKey]);
}

function syncEnglishCategoryInputs() {
  ENGLISH_CATEGORIES.forEach((category) => {
    const input = englishForm.elements.namedItem(category.key);
    if (!input) {
      return;
    }

    const unavailable = isUnavailableCategory(englishForm.practiceType.value, category.key);
    input.disabled = unavailable;
    input.placeholder = unavailable ? "-" : "";
    if (unavailable) {
      input.value = "";
    }
  });
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFiniteValues(values) {
  return values.filter((value) => Number.isFinite(value));
}

function showEnglishStatus(message, type) {
  englishStatusMessage.textContent = message;
  englishStatusMessage.className = `status-message ${type}`;
  englishStatusMessage.hidden = false;
}

function reportEnglishStorageError(message, error) {
  console.error(message, error);
  showEnglishStatus(message, "error");
}
