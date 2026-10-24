"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { authFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/context/AuthContext";
import { Tag } from "@/components/InsightCard";
import { TrendChart } from "@/components/TrendChart";
import { BENCHMARKS, RANK_FIELDS, SCIENCE_DETAIL_MAX_SCORE, SCIENCE_DETAIL_SCORES, SUBJECTS, subjectsForTrack, calculateSubjectScore, calculateTotalGrade, formatScore } from "@/lib/data";
import type { ExamRecordDTO, GoalDTO } from "@/lib/types";

function formatMaybeNumber(value: number | null | undefined): string {
  return Number.isFinite(value) ? formatScore(value as number) : "—";
}

function getBenchmarkBand(record: ExamRecordDTO, subjectKey: string, grade: number | null): string {
  if (!Number.isFinite(grade)) return "級分未填";
  const thresholds = BENCHMARKS.map((benchmark) => {
    const key = `${subjectKey}${benchmark.key[0].toUpperCase()}${benchmark.key.slice(1)}Grade` as keyof ExamRecordDTO;
    return record[key] as number | null;
  });
  if (!thresholds.some(Number.isFinite)) return "五標未設定";
  for (const benchmark of BENCHMARKS) {
    const key = `${subjectKey}${benchmark.key[0].toUpperCase()}${benchmark.key.slice(1)}Grade` as keyof ExamRecordDTO;
    const threshold = record[key] as number | null;
    if (Number.isFinite(threshold) && (grade as number) >= (threshold as number)) return benchmark.label;
  }
  return "低於底標";
}

function ScoreRatioBars({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number | null | undefined; max: number }[];
}) {
  const hasData = items.some((item) => Number.isFinite(item.value));

  return (
    <div className="border border-line bg-white p-3">
      <h4 className="font-bold">{title}題型得分比率（得分 / 滿分）</h4>
      {!hasData ? (
        <p className="mt-2 text-sm text-muted">尚無可繪製的題型分數。</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {items.map((item) => {
            const known = Number.isFinite(item.value);
            const pct = known ? Math.max(0, Math.min(100, ((item.value as number) / item.max) * 100)) : 0;
            return (
              <li key={item.label}>
                <div className="flex justify-between gap-2">
                  <span>{item.label}</span>
                  <span className="tabular-nums">
                    {known ? `${formatScore(item.value as number)} / ${item.max}（${formatScore(pct)}%）` : `— / ${item.max}`}
                  </span>
                </div>
                <div className="mt-1 h-2.5 bg-[#eef0f5]">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
type GoalGradeKey = "targetChineseGrade" | "targetEnglishGrade" | "targetMathGrade" | "targetMathBGrade" | "targetSocialGrade" | "targetScienceGrade";

const GOAL_KEY_BY_SUBJECT: Record<string, GoalGradeKey> = {
  chinese: "targetChineseGrade",
  english: "targetEnglishGrade",
  math: "targetMathGrade",
  mathB: "targetMathBGrade",
  social: "targetSocialGrade",
  science: "targetScienceGrade",
};

function ScorePageContent() {
  const { user, track } = useAuth();
  const subjects = useMemo(() => subjectsForTrack(track), [track]);
  const [records, setRecords] = useState<ExamRecordDTO[]>([]);
  const [goal, setGoal] = useState<GoalDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [trendMetric, setTrendMetric] = useState("total");

  useEffect(() => {
    Promise.all([
      authFetch(user, "/api/exam-records").then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed")))),
      authFetch(user, "/api/goals").then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed")))),
    ])
      .then(([recordsData, goalData]) => {
        setRecords(recordsData);
        setGoal(goalData);
      })
      .catch(() => setStatus({ text: "讀取資料失敗，請稍後再試。", type: "error" }))
      .finally(() => setLoading(false));
  }, [user]);

  const latest = records.at(-1) || null;
  const previous = records.length > 1 ? records.at(-2) : null;

  const totalGradeChange =
    latest && previous && Number.isFinite(latest.totalGrade) && Number.isFinite(previous.totalGrade)
      ? (latest.totalGrade as number) - (previous.totalGrade as number)
      : null;
  const totalGoalDifference =
    latest && Number.isFinite(latest.totalGrade) && Number.isFinite(goal?.targetTotalGrade)
      ? (latest.totalGrade as number) - (goal?.targetTotalGrade as number)
      : null;

  const goalProgressItems = (() => {
    if (!goal) return [];
    const items: { label: string; value: string; detail: string; status: "positive" | "negative" | "neutral" }[] = [];
    if (goal.goalName) {
      items.push({ label: "目標校系", value: goal.goalName, status: "neutral", detail: "" });
    }
    const buildItem = (label: string, currentValue: number | null | undefined, targetValue: number | null | undefined, unit: string) => {
      if (!Number.isFinite(targetValue)) return null;
      if (!Number.isFinite(currentValue)) {
        return { label, value: `目標 ${targetValue}${unit}`, detail: "目前尚無資料", status: "neutral" as const };
      }
      const diff = (targetValue as number) - (currentValue as number);
      if (diff <= 0) {
        return {
          label,
          value: `達標 +${Math.abs(diff)}${unit}`,
          detail: `目前 ${currentValue}${unit} / 目標 ${targetValue}${unit}`,
          status: "positive" as const,
        };
      }
      return {
        label,
        value: `還差 ${diff}${unit}`,
        detail: `目前 ${currentValue}${unit} / 目標 ${targetValue}${unit}`,
        status: "negative" as const,
      };
    };

    const totalItem = buildItem("總級分", latest?.totalGrade, goal.targetTotalGrade, "級");
    if (totalItem) items.push(totalItem);

    subjects.forEach((subject) => {
      const targetKey = GOAL_KEY_BY_SUBJECT[subject.key];
      const item = buildItem(subject.label, latest ? (latest[subject.gradeKey as keyof ExamRecordDTO] as number | null) : null, goal[targetKey], "級");
      if (item) items.push(item);
    });

    return items;
  })();

  const reviewTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      (record.reviewTags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [records]);

  const trendPoints = records
    .map((record) => ({ date: record.examDate, name: record.examName, value: record.totalGrade }))
    .filter((p): p is { date: string; name: string; value: number } => Number.isFinite(p.value));

  const selectedSubject = subjects.find((subject) => subject.key === trendMetric) ?? null;
  const selectedTrendPoints = selectedSubject
    ? records
        .map((record) => ({
          date: record.examDate,
          name: record.examName,
          value: record[selectedSubject.gradeKey as keyof ExamRecordDTO] as number | null,
        }))
        .filter((point): point is { date: string; name: string; value: number } => Number.isFinite(point.value))
    : trendPoints;
  const totalGradeMax = (subjects.length - (subjects.some((subject) => subject.key === "social") && !subjects.some((subject) => subject.key === "science") ? 1 : 0)) * 15;
  const selectedGoalKey = selectedSubject ? GOAL_KEY_BY_SUBJECT[selectedSubject.key] : null;
  const selectedTarget = selectedSubject && selectedGoalKey ? goal?.[selectedGoalKey] : goal?.targetTotalGrade;
  const trendTarget = typeof selectedTarget === "number" && Number.isFinite(selectedTarget) ? selectedTarget : null;
  const trendAxisMax = Math.max(selectedSubject ? 15 : totalGradeMax, trendTarget ?? 0);

  const overallRankMovement = (() => {
    if (!latest || !previous || !Number.isFinite(latest.overallRank) || !Number.isFinite(latest.overallTotal) ||
      !Number.isFinite(previous.overallRank) || !Number.isFinite(previous.overallTotal) ||
      (latest.overallTotal as number) <= 0 || (previous.overallTotal as number) <= 0) {
      return { label: "總排名比率：資料不足", tone: "neutral" as const };
    }
    const latestRatio = (latest.overallRank as number) / (latest.overallTotal as number);
    const previousRatio = (previous.overallRank as number) / (previous.overallTotal as number);
    if (latestRatio < previousRatio) {
      return {
        label: `總排名比率進步 ${formatScore((previousRatio - latestRatio) * 100)} 個百分點（${formatScore(previousRatio * 100)}% → ${formatScore(latestRatio * 100)}%）`,
        tone: "positive" as const,
      };
    }
    if (latestRatio > previousRatio) {
      return {
        label: `總排名比率退步 ${formatScore((latestRatio - previousRatio) * 100)} 個百分點（${formatScore(previousRatio * 100)}% → ${formatScore(latestRatio * 100)}%）`,
        tone: "negative" as const,
      };
    }
    return { label: `總排名比率持平（${formatScore(latestRatio * 100)}%）`, tone: "neutral" as const };
  })();

  async function refresh() {
    const [recordsData, goalData] = await Promise.all([
      authFetch(user, "/api/exam-records").then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed")))),
      authFetch(user, "/api/goals").then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed")))),
    ]);
    setRecords(recordsData);
    setGoal(goalData);
  }

  async function handleAddRecord(formEl: HTMLFormElement) {
    const formData = new FormData(formEl);
    const toNum = (key: string) => {
      const v = formData.get(key);
      if (v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const nextRecord: Partial<ExamRecordDTO> = {
      examName: String(formData.get("examName") || "").trim(),
      examDate: String(formData.get("examDate") || ""),
      chineseGrade: toNum("chineseGrade"),
      englishGrade: toNum("englishGrade"),
      mathGrade: toNum("mathGrade"),
      mathBGrade: toNum("mathBGrade"),
      scienceGrade: toNum("scienceGrade"),
      socialGrade: toNum("socialGrade"),
      ...Object.fromEntries(SUBJECTS.flatMap((subject) => [
        ...subject.components.map(({ key }) => [key, toNum(key)]),
        ...BENCHMARKS.map(({ key }) => [`${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade`, toNum(`${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade`)]),
      ])),
      ...Object.fromEntries(RANK_FIELDS.flatMap(({ key, totalKey }) => [
        [key, toNum(key)],
        [totalKey, toNum(totalKey)],
      ])),
      reviewTags: String(formData.get("reviewTags") || "")
        .split(/[\s,，]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`))
        .filter((t, i, arr) => arr.indexOf(t) === i),
      notes: String(formData.get("notes") || "").trim(),
    };

    for (const subject of SUBJECTS) {
      (nextRecord as Record<string, number | null | undefined>)[subject.scoreKey] =
        calculateSubjectScore(nextRecord as Record<string, number | null | undefined>, subject);
    }
    nextRecord.totalGrade = calculateTotalGrade(nextRecord as Record<string, number | null | undefined>, subjects);

    if (!nextRecord.examName || !nextRecord.examDate) {
      window.alert("請至少填寫考試名稱與日期。");
      return;
    }

    const res = await authFetch(user, "/api/exam-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextRecord),
    });

    if (!res.ok) {
      setStatus({ text: "新增成績失敗，請稍後再試。", type: "error" });
      return;
    }

    await refresh();
    formEl.reset();
    setShowModal(false);
    setStatus({ text: "已新增模擬考紀錄。", type: "success" });
  }

  async function handleSaveRecord(formEl: HTMLFormElement, id: string, current: ExamRecordDTO) {
    const formData = new FormData(formEl);
    const toNum = (key: string) => {
      const value = formData.get(key);
      if (value === null || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };
    const nextRecord: Record<string, unknown> = {
      examName: String(formData.get("examName") || "").trim(),
      examDate: String(formData.get("examDate") || ""),
      reviewTags: String(formData.get("reviewTags") || "").split(/[\s,，]+/).map((tag) => tag.trim()).filter(Boolean),
      notes: String(formData.get("notes") || "").trim(),
    };
    for (const subject of SUBJECTS) {
      if (!subjects.includes(subject)) {
        // Hidden-track subject: keep the stored values untouched.
        const keep = [subject.scoreKey, subject.gradeKey, ...subject.components.map(({ key }) => key), ...BENCHMARKS.map(({ key }) => `${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade`)];
        if (subject.key === "science") SCIENCE_DETAIL_SCORES.forEach(({ key }) => keep.push(key));
        keep.forEach((key) => { nextRecord[key] = current[key as keyof ExamRecordDTO] ?? null; });
        continue;
      }
      nextRecord[subject.scoreKey] = current[subject.scoreKey as keyof ExamRecordDTO];
      nextRecord[subject.gradeKey] = toNum(subject.gradeKey);
      for (const { key } of subject.components) nextRecord[key] = toNum(key);
      if (subject.key === "science") {
        SCIENCE_DETAIL_SCORES.forEach(({ key }) => { nextRecord[key] = toNum(key); });
      }
      for (const { key } of BENCHMARKS) {
        const benchmarkKey = `${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade`;
        nextRecord[benchmarkKey] = toNum(benchmarkKey);
      }
    }
    for (const { key, totalKey } of RANK_FIELDS) {
      nextRecord[key] = toNum(key);
      nextRecord[totalKey] = toNum(totalKey);
    }
    for (const subject of SUBJECTS) {
      nextRecord[subject.scoreKey] = calculateSubjectScore(nextRecord as Record<string, number | null | undefined>, subject);
    }
    nextRecord.totalGrade = calculateTotalGrade(nextRecord as Record<string, number | null | undefined>, subjects);
    try {
      const response = await authFetch(user, `/api/exam-records/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextRecord),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setStatus({
          text: typeof result?.error === "string"
            ? `修改成績失敗：${result.error}`
            : `修改成績失敗（HTTP ${response.status}），請稍後再試。`,
          type: "error",
        });
        return;
      }

      const savedRecord = (await response.json()) as ExamRecordDTO;
      setRecords((currentRecords) => currentRecords.map((record) => record.id === id ? savedRecord : record));
      setEditingRecordId(null);
      setStatus({ text: "已儲存成績紀錄。", type: "success" });

      try {
        const recordsResponse = await authFetch(user, "/api/exam-records");
        if (!recordsResponse.ok) throw new Error("Failed to refresh records");
        setRecords(await recordsResponse.json());
      } catch {
        setStatus({ text: "成績已儲存，但重新讀取紀錄失敗；重新整理頁面即可更新顯示。", type: "error" });
      }
    } catch {
      setStatus({ text: "無法連線儲存成績，請檢查網路後重試。", type: "error" });
    }
  }

  async function handleSaveGoal(formEl: HTMLFormElement) {
    const formData = new FormData(formEl);
    const toNum = (key: string) => {
      const v = formData.get(key);
      if (v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const nextGoal: GoalDTO = {
      goalName: String(formData.get("goalName") || "").trim(),
      targetTotalGrade: toNum("targetTotalGrade"),
      targetChineseGrade: toNum("targetChineseGrade"),
      targetEnglishGrade: toNum("targetEnglishGrade"),
      targetMathGrade: toNum("targetMathGrade"),
      targetMathBGrade: subjects.some((s) => s.key === "mathB") ? toNum("targetMathBGrade") : goal?.targetMathBGrade ?? null,
      targetScienceGrade: subjects.some((s) => s.key === "science") ? toNum("targetScienceGrade") : goal?.targetScienceGrade ?? null,
      targetSocialGrade: subjects.some((s) => s.key === "social") ? toNum("targetSocialGrade") : goal?.targetSocialGrade ?? null,
    };

    const res = await authFetch(user, "/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextGoal),
    });

    if (!res.ok) {
      setStatus({ text: "更新目標失敗，請稍後再試。", type: "error" });
      return;
    }

    await refresh();
    setShowGoalForm(false);
    setStatus({ text: "已更新目標設定。", type: "success" });
  }

  if (loading) {
    return <div className="p-8 text-muted">載入中...</div>;
  }

  return (
    <div className="mobile-page">
      <div className="mobile-page-header mb-6 flex flex-wrap items-start justify-between gap-4 border-b-4 border-ink bg-white py-5">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Score Record Dashboard</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">模擬考成績統計</h1>
          <p className="mt-2 max-w-2xl text-muted">檢視總級分走勢、各科變化與目標差距，掌握下一步的準備方向。</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="border border-ink bg-ink px-5 py-2.5 font-bold text-white"
        >
          ＋ 新增成績
        </button>
      </div>

      {status && (
        <div
          className={`mb-5 border p-3.5 font-semibold ${
            status.type === "error" ? "border-[#f3c2c2] bg-[#fff2f2] text-[#8a2020]" : "border-[#c3ead5] bg-[#edf9f3] text-[#165c3f]"
          }`}
        >
          {status.text}
        </div>
      )}

      <section className="score-summary" aria-label="成績摘要">
        <SummaryMetric label="最新總級分" value={formatMaybeNumber(latest?.totalGrade)} detail={latest ? `${latest.examName} · ${latest.examDate}` : "新增成績後顯示"} />
        <SummaryMetric
          label="較前次變化"
          value={totalGradeChange === null ? "—" : `${totalGradeChange > 0 ? "+" : ""}${formatScore(totalGradeChange)} 級`}
          detail={totalGradeChange === null ? "至少需要兩筆有效總級分" : totalGradeChange > 0 ? "較上一場進步" : totalGradeChange < 0 ? "較上一場退步" : "與上一場持平"}
          tone={totalGradeChange === null || totalGradeChange === 0 ? "neutral" : totalGradeChange > 0 ? "positive" : "negative"}
        />
        <SummaryMetric
          label="目標總級分"
          value={Number.isFinite(goal?.targetTotalGrade) ? formatScore(goal?.targetTotalGrade as number) : "未設定"}
          detail={
            totalGoalDifference === null
              ? goal?.goalName || "設定目標後顯示差距"
              : totalGoalDifference > 0
                ? `已達標 · 超前 ${formatScore(totalGoalDifference)} 級`
                : totalGoalDifference === 0
                  ? "已達標"
                  : `還差 ${formatScore(Math.abs(totalGoalDifference))} 級`
          }
          tone={totalGoalDifference !== null && totalGoalDifference > 0 ? "positive" : "neutral"}
        />
      </section>

      <section className="score-trend" aria-labelledby="score-trend-heading">
        <div className="score-trend-header">
          <div>
            <p className="score-section-kicker">成績分析</p>
            <h2 id="score-trend-heading">歷次成績變化</h2>
            <p className="score-trend-caption">
              {selectedSubject ? `${selectedSubject.label}級分（滿分 15）` : `總級分（滿分 ${totalGradeMax}）`}
              {" · "}{selectedTrendPoints.length} 筆有效紀錄
              {selectedTrendPoints.length < 3 && " · 資料尚少，僅呈現實際紀錄"}
            </p>
          </div>
          <div className="score-metric-tabs" role="group" aria-label="選擇趨勢項目">
            <button type="button" aria-pressed={trendMetric === "total"} onClick={() => setTrendMetric("total")}>總級分</button>
            {subjects.map((subject) => (
              <button
                key={subject.key}
                type="button"
                aria-pressed={trendMetric === subject.key}
                onClick={() => setTrendMetric(subject.key)}
              >
                {subject.label}
              </button>
            ))}
          </div>
        </div>
        <TrendChart
          points={selectedTrendPoints}
          size="large"
          yAxisMin={0}
          yAxisMax={trendAxisMax}
          referenceLine={trendTarget !== null ? { value: trendTarget, label: `目標 ${formatScore(trendTarget)}` } : undefined}
          emptyMessage={`目前沒有${selectedSubject ? `${selectedSubject.label}級分` : "總級分"}可供分析；新增成績後會在此顯示。`}
        />
        <div className="score-chart-legend">
          <span><i className="score-legend-line" />實際紀錄</span>
          {trendTarget !== null && <span><i className="score-legend-target" />目標 {formatScore(trendTarget)} 級</span>}
          <span className="score-chart-help">將游標移至資料點或以鍵盤聚焦，可查看考試名稱、日期與分數</span>
        </div>
      </section>

      <section className="score-detail-section">
        <div className="score-section-heading">
          <div>
            <h2>最新考試詳細分析</h2>
            {latest && <p>{latest.examName} · {latest.examDate} · 總級分 {formatMaybeNumber(latest.totalGrade)}</p>}
          </div>
          {latest && <p className={`score-rank-movement ${overallRankMovement.tone}`}>{overallRankMovement.label}</p>}
        </div>
        {!latest ? (
          <p className="score-empty-state">新增第一筆模擬考紀錄後，這裡會顯示各科表現與考後備註。</p>
        ) : (
          <>
            <div className="mobile-table-wrap">
              <table className="score-detail-table">
                <thead>
                  <tr><th>科目</th><th>原始分數</th><th>級分</th><th>較前次</th><th>五標位置</th></tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => {
                    const grade = latest[subject.gradeKey as keyof ExamRecordDTO] as number | null;
                    const priorGrade = previous ? previous[subject.gradeKey as keyof ExamRecordDTO] as number | null : null;
                    const change = Number.isFinite(grade) && Number.isFinite(priorGrade) ? (grade as number) - (priorGrade as number) : null;
                    return (
                      <tr key={subject.key}>
                        <th scope="row">{subject.label}</th>
                        <td>{formatMaybeNumber(latest[subject.scoreKey as keyof ExamRecordDTO] as number | null)} 分</td>
                        <td>{formatMaybeNumber(grade)} / 15</td>
                        <td className={change !== null && change < 0 ? "score-negative" : change !== null && change > 0 ? "score-positive" : ""}>
                          {change === null ? "—" : `${change > 0 ? "+" : ""}${formatScore(change)} 級`}
                        </td>
                        <td>{getBenchmarkBand(latest, subject.key, grade)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <details className="score-breakdown">
              <summary>查看最新各科題型得分比例</summary>
              <div className="score-breakdown-grid">
                {subjects.map((subject) => (
                  <ScoreRatioBars
                    key={subject.key}
                    title={subject.label}
                    items={[
                      ...subject.components.map(({ key, label, maxScore }) => ({
                        label,
                        value: latest[key as keyof ExamRecordDTO] as number | null,
                        max: maxScore ?? 100,
                      })),
                      ...(subject.key === "science"
                        ? SCIENCE_DETAIL_SCORES.map(({ key, label }) => ({
                            label: `${label}（整科）`,
                            value: latest[key as keyof ExamRecordDTO] as number | null,
                            max: SCIENCE_DETAIL_MAX_SCORE,
                          }))
                        : []),
                    ]}
                  />
                ))}
              </div>
            </details>
            {((latest.reviewTags || []).length > 0 || latest.notes) && (
              <div className="score-review-notes">
                {(latest.reviewTags || []).length > 0 && <div className="flex flex-wrap gap-2">{(latest.reviewTags || []).map((tag) => <Tag key={tag} label={tag} />)}</div>}
                {latest.notes && <p>{latest.notes}</p>}
              </div>
            )}
          </>
        )}
      </section>

      <section className="score-goal-section">
        <div className="score-section-heading">
          <div>
            <h2>目標與差距</h2>
            {goal?.goalName && <p>目標校系：{goal.goalName}</p>}
          </div>
          <button type="button" onClick={() => setShowGoalForm((value) => !value)} className="score-secondary-button">
            {showGoalForm ? "取消編輯" : "編輯目標"}
          </button>
        </div>

        {showGoalForm && goal && (
          <form
            className="score-goal-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveGoal(event.currentTarget);
            }}
          >
            <label>目標校系<input name="goalName" defaultValue={goal.goalName} /></label>
            <label>總級分<input name="targetTotalGrade" type="number" min={0} defaultValue={goal.targetTotalGrade ?? ""} /></label>
            <label>國文級分<input name="targetChineseGrade" type="number" min={0} max={15} defaultValue={goal.targetChineseGrade ?? ""} /></label>
            <label>英文級分<input name="targetEnglishGrade" type="number" min={0} max={15} defaultValue={goal.targetEnglishGrade ?? ""} /></label>
            <label>數A級分<input name="targetMathGrade" type="number" min={0} max={15} defaultValue={goal.targetMathGrade ?? ""} /></label>
            {subjects.some((subject) => subject.key === "mathB") && <label>數B級分<input name="targetMathBGrade" type="number" min={0} max={15} defaultValue={goal.targetMathBGrade ?? ""} /></label>}
            {subjects.some((subject) => subject.key === "social") && <label>社會級分<input name="targetSocialGrade" type="number" min={0} max={15} defaultValue={goal.targetSocialGrade ?? ""} /></label>}
            {subjects.some((subject) => subject.key === "science") && <label>自然級分<input name="targetScienceGrade" type="number" min={0} max={15} defaultValue={goal.targetScienceGrade ?? ""} /></label>}
            <button type="submit" className="score-primary-button">儲存目標</button>
          </form>
        )}

        {goalProgressItems.length === 0 ? (
          <p className="score-empty-state">尚未設定目標。</p>
        ) : (
          <ul className="score-goal-list">
            {goalProgressItems.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong className={item.status === "positive" ? "score-positive" : ""}>{item.value}</strong>
                <small>{item.detail}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mobile-panel mt-5 border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">歷次紀錄與管理</h2>
            <p className="mt-1 text-muted">保留完整查詢表格，包含分數、級分、檢討標籤與備註。</p>
          </div>
        </div>

        <div className="mt-4 border border-line bg-[#f9fafb] p-4">
          <h3 className="font-bold">考後檢討標籤</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {reviewTagCounts.length === 0 ? (
              <span className="text-muted">目前尚未使用任何檢討標籤。</span>
            ) : (
              reviewTagCounts.map(([tag, count]) => <Tag key={tag} label={`${tag} ×${count}`} muted />)
            )}
          </div>
        </div>

        <div className="mobile-table-wrap mt-4">
          <table className="mobile-table w-full min-w-[1500px] border-collapse">
            <thead>
              <tr>
                {["日期", "考試", "總級分", ...subjects.map((subject) => subject.label), ...RANK_FIELDS.map((field) => field.label), "標籤", "備註", "操作"].map((h) => (
                  <th key={h} className="border-b border-line bg-[#f9fafb] px-3 py-3.5 text-left font-bold text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6 + subjects.length + RANK_FIELDS.length} className="px-3 py-6 text-center text-muted">
                    目前還沒有任何模擬考紀錄。
                  </td>
                </tr>
              ) : (
                records
                  .slice()
                  .reverse()
                  .map((record) => {
                    const editing = editingRecordId === record.id;
                    const formId = `edit-exam-${record.id}`;
                    return (
                    <tr key={record.id} className="hover:bg-[#f9fafb]">
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <input form={formId} name="examDate" type="date" defaultValue={record.examDate} required className="w-32 border border-line px-2 py-1" /> : record.examDate}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <input form={formId} name="examName" defaultValue={record.examName} required className="w-36 border border-line px-2 py-1" /> : record.examName}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{formatMaybeNumber(record.totalGrade)}</td>
                      {subjects.map((subject) => (
                        <td key={subject.key} className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                          {editing ? (
                            <div className="min-w-56 space-y-1.5">
                              {subject.components.map(({ key, label, maxScore }) => (
                                <label key={key} className="flex items-center justify-between gap-2 text-xs text-muted">
                                  {label}
                                  <input form={formId} name={key} type="number" min={0} max={maxScore} step={0.1} defaultValue={record[key as keyof ExamRecordDTO] as number | null ?? ""} className="w-20 border border-line px-1.5 py-1" />
                                </label>
                              ))}
                              {subject.key === "science" && SCIENCE_DETAIL_SCORES.map(({ key, label }) => (
                                <label key={key} className="flex items-center justify-between gap-2 text-xs text-muted">
                                  {label}整份考卷
                                  <input form={formId} name={key} type="number" min={0} step={0.1} defaultValue={record[key as keyof ExamRecordDTO] as number | null ?? ""} className="w-20 border border-line px-1.5 py-1" />
                                </label>
                              ))}
                              {subject.key === "science" && (
                                <p className="text-xs text-muted">
                                  四科得分合計需等於選擇題與混合題分數總和。
                                </p>
                              )}
                              <label className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
                                級分
                                <input form={formId} name={subject.gradeKey} type="number" min={0} max={15} step={1} defaultValue={record[subject.gradeKey as keyof ExamRecordDTO] as number | null ?? ""} className="w-20 border border-line px-1.5 py-1" />
                              </label>
                              <div className="border-t pt-1">
                                {BENCHMARKS.map(({ key, label }) => {
                                  const benchmarkKey = `${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade`;
                                  return (
                                    <label key={key} className="mr-1 inline-flex items-center gap-1 text-xs text-muted">
                                      {label}
                                      <input form={formId} name={benchmarkKey} type="number" min={0} max={15} step={1} defaultValue={record[benchmarkKey as keyof ExamRecordDTO] as number | null ?? ""} className="w-12 border border-line px-1 py-1" />
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div>{formatMaybeNumber(record[subject.scoreKey as keyof ExamRecordDTO] as number | null)} 分 / {formatMaybeNumber(record[subject.gradeKey as keyof ExamRecordDTO] as number | null)} 級</div>
                              {subject.key === "science" && (
                                <small className="block text-muted">
                                  {SCIENCE_DETAIL_SCORES.map(({ key, label }) => `${label} ${formatMaybeNumber(record[key as keyof ExamRecordDTO] as number | null)}`).join(" · ")}
                                </small>
                              )}
                              <small className="text-muted">{BENCHMARKS.map(({ key, label }) => `${label} ${formatMaybeNumber(record[`${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade` as keyof ExamRecordDTO] as number | null)}`).join(" · ")}</small>
                            </div>
                          )}
                        </td>
                      ))}
                      {RANK_FIELDS.map(({ key, totalKey }) => (
                        <td key={key} className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                          {editing ? (
                            <div className="flex items-center gap-1">
                              <input form={formId} name={key} type="number" min={1} defaultValue={record[key] ?? ""} className="w-16 border border-line px-1 py-1" aria-label={key} />
                              /
                              <input form={formId} name={totalKey} type="number" min={1} defaultValue={record[totalKey] ?? ""} className="w-16 border border-line px-1 py-1" aria-label={totalKey} />
                            </div>
                          ) : `${formatMaybeNumber(record[key])}/${formatMaybeNumber(record[totalKey])}`}
                        </td>
                      ))}
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                        {editing ? (
                          <input form={formId} name="reviewTags" defaultValue={record.reviewTags.join(" ")} className="w-36 border border-line px-2 py-1" />
                        ) : (record.reviewTags || []).length ? (
                          <div className="flex flex-wrap gap-1">
                            {record.reviewTags.map((tag) => (
                              <Tag key={tag} label={tag} />
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <textarea form={formId} name="notes" defaultValue={record.notes} className="w-40 border border-line px-2 py-1" /> : record.notes || "—"}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                        {editing ? (
                          <form id={formId} onSubmit={(event) => { event.preventDefault(); handleSaveRecord(event.currentTarget, record.id, record); }}>
                            <button type="submit" className="border border-ink bg-ink px-3 py-2 font-bold text-white">儲存</button>
                            <button type="button" onClick={() => setEditingRecordId(null)} className="mt-2 border border-line px-3 py-2 font-bold">取消</button>
                          </form>
                        ) : (
                          <button type="button" onClick={() => setEditingRecordId(record.id)} className="border border-line px-3 py-2 font-bold text-primary">修改</button>
                        )}
                      </td>
                    </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-[rgba(14,23,42,0.5)]" onClick={() => setShowModal(false)} />
          <div className="mobile-modal relative max-h-[calc(100vh-36px)] w-[min(1040px,calc(100%-24px))] overflow-auto border border-line bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold">新增模擬考紀錄</h2>
              <button type="button" onClick={() => setShowModal(false)} aria-label="關閉" className="text-2xl">
                ×
              </button>
            </div>

            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddRecord(e.currentTarget);
              }}
            >
              <div className="mobile-modal-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-muted">
                  考試名稱
                  <input name="examName" type="text" placeholder="例：第三次模擬考" required className="border border-line px-3 py-2.5" />
                </label>
                <label className="flex flex-col gap-2 text-muted">
                  考試日期
                  <input name="examDate" type="date" required className="border border-line px-3 py-2.5" />
                </label>
              </div>

              <div className="mobile-modal-grid mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {subjects.map((subject) => (
                  <article key={subject.key} className="border border-line bg-[#f8fbff] p-3.5">
                    <h3 className="mb-2 font-bold">{subject.label}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {subject.components.map(({ key, label, maxScore }) => (
                        <label key={key} className="flex flex-col gap-1.5 text-sm text-muted">
                          {label}{maxScore ? `（滿分 ${maxScore}）` : ""}
                          <input name={key} type="number" min={0} max={maxScore} step={0.1} className="border border-line px-2.5 py-2" />
                        </label>
                      ))}
                      {subject.key === "science" && SCIENCE_DETAIL_SCORES.map(({ key, label }) => (
                        <label key={key} className="flex flex-col gap-1.5 text-sm text-muted">
                          {label}整份考卷得分
                          <input name={key} type="number" min={0} step={0.1} className="border border-line px-2.5 py-2" />
                        </label>
                      ))}
                      {subject.key === "science" && (
                        <p className="col-span-full text-sm text-muted">
                          物理、化學、生物、地球科學為整份考卷分類；四科得分合計需等於選擇題與混合題分數總和。
                        </p>
                      )}
                      <label className="flex flex-col gap-1.5 text-sm text-muted">
                        級分
                        <input name={subject.gradeKey} type="number" min={0} max={15} step={1} className="border border-line px-2.5 py-2" />
                      </label>
                    </div>
                    <div className="mt-3 border-t pt-2">
                      <h4 className="mb-1 text-sm font-bold">五標（級分）</h4>
                      <div className="grid grid-cols-5 gap-1">
                        {BENCHMARKS.map(({ key, label }) => {
                          const benchmarkKey = `${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade`;
                          return (
                            <label key={key} className="flex flex-col gap-1 text-xs text-muted">
                              {label}
                              <input name={benchmarkKey} type="number" min={0} max={15} step={1} className="w-full border border-line px-1.5 py-2" />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-4 border border-line bg-[#f8fbff] p-3.5">
                <h3 className="mb-2 font-bold">排名（名次／總人數）</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {RANK_FIELDS.map(({ key, totalKey, label }) => (
                    <label key={key} className="flex flex-col gap-1.5 text-sm text-muted">
                      {label}
                      <span className="flex items-center gap-2">
                        <input name={key} type="number" min={1} className="w-full border border-line px-2.5 py-2" aria-label={`${label}名次`} />
                        ／
                        <input name={totalKey} type="number" min={1} className="w-full border border-line px-2.5 py-2" aria-label={`${label}總人數`} />
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="mt-4 flex flex-col gap-2 text-muted">
                失分原因標籤
                <input name="reviewTags" type="text" placeholder="例：#粗心 #觀念不熟 #寫不完" className="border border-line px-3 py-2.5" />
              </label>

              <label className="mt-4 flex flex-col gap-2 text-muted">
                備註
                <textarea name="notes" rows={4} placeholder="可記錄這次失誤、策略、讀書狀況或臨場表現" className="min-h-24 border border-line px-3 py-2.5" />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                <button type="submit" className="border border-ink bg-ink px-4 py-2.5 font-bold text-white">
                  儲存成績
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="border border-line bg-white px-4 py-2.5 font-bold text-primary">
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="score-summary-item">
      <span>{label}</span>
      <strong className={`num-display score-${tone}`}>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default function ScorePage() {
  return (
    <RequireAuth>
      <ScorePageContent />
    </RequireAuth>
  );
}
