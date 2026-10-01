"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { InsightCard, Tag, buildComparison } from "@/components/InsightCard";
import { TrendChart } from "@/components/TrendChart";
import { RadarChart } from "@/components/RadarChart";
import { BENCHMARKS, RANK_FIELDS, SUBJECTS, average, calculateSubjectScore, calculateTotalGrade, formatScore } from "@/lib/data";
import type { ExamRecordDTO, GoalDTO } from "@/lib/types";

function getFiniteValues(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => Number.isFinite(v));
}

function formatMaybeNumber(value: number | null | undefined): string {
  return Number.isFinite(value) ? formatScore(value as number) : "—";
}

type MetricKey = "totalGrade";

type GoalGradeKey = "targetChineseGrade" | "targetEnglishGrade" | "targetMathGrade" | "targetSocialGrade" | "targetScienceGrade";

const GOAL_KEY_BY_SUBJECT: Record<string, GoalGradeKey> = {
  chinese: "targetChineseGrade",
  english: "targetEnglishGrade",
  math: "targetMathGrade",
  social: "targetSocialGrade",
  science: "targetScienceGrade",
};

function ScorePageContent() {
  const [records, setRecords] = useState<ExamRecordDTO[]>([]);
  const [goal, setGoal] = useState<GoalDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeMetric] = useState<MetricKey>("totalGrade");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/exam-records").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
    ])
      .then(([recordsData, goalData]) => {
        setRecords(recordsData);
        setGoal(goalData);
      })
      .catch(() => setStatus({ text: "讀取資料失敗，請稍後再試。", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const latest = records.at(-1) || null;
  const previous = records.length > 1 ? records.at(-2) : null;

  const totalGrades = getFiniteValues(records.map((r) => r.totalGrade));
  const averageGrade = totalGrades.length ? average(totalGrades) : null;
  const highestGrade = totalGrades.length ? Math.max(...totalGrades) : null;

  const bestImprovement = useMemo(() => {
    if (!latest || !previous) {
      return { value: "暫無資料", detail: "至少需要 2 筆成績才可比較", status: "" as const };
    }
    const comparisons = SUBJECTS.map((subject) => {
      const latestScore = latest[subject.scoreKey as keyof ExamRecordDTO] as number | null;
      const previousScore = previous[subject.scoreKey as keyof ExamRecordDTO] as number | null;
      if (!Number.isFinite(latestScore) || !Number.isFinite(previousScore)) return null;
      return { label: subject.label, delta: (latestScore as number) - (previousScore as number) };
    }).filter((v): v is { label: string; delta: number } => v !== null);

    if (!comparisons.length) {
      return { value: "暫無資料", detail: "缺少可比較的各科分數", status: "" as const };
    }
    const best = comparisons.reduce((a, b) => (b.delta > a.delta ? b : a));
    if (best.delta > 0) {
      return { value: best.label, detail: `比上一場進步 ${formatScore(best.delta)} 分`, status: "positive" as const };
    }
    if (best.delta === 0) {
      return { value: best.label, detail: "與上一場持平，暫無科目進步", status: "" as const };
    }
    return { value: "暫無進步", detail: `${best.label} 變化最小，${formatScore(best.delta)} 分`, status: "negative" as const };
  }, [latest, previous]);

  const goalGap = useMemo(() => {
    if (!latest || !goal) return { value: "未設定", detail: "先新增成績與目標" };
    if (Number.isFinite(goal.targetTotalGrade)) {
      const diff = (goal.targetTotalGrade as number) - (latest.totalGrade ?? 0);
      return diff <= 0
        ? { value: `超前 ${Math.abs(diff)} 級`, detail: goal.goalName || "總級分已達成目標" }
        : { value: `還差 ${diff} 級`, detail: goal.goalName || "以總級分為主要目標" };
    }
    return { value: "未設定", detail: "先設定總級分目標" };
  }, [latest, goal]);

  const goalProgressItems = useMemo(() => {
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

    SUBJECTS.forEach((subject) => {
      const targetKey = GOAL_KEY_BY_SUBJECT[subject.key];
      const item = buildItem(subject.label, latest ? (latest[subject.gradeKey as keyof ExamRecordDTO] as number | null) : null, goal[targetKey], "級");
      if (item) items.push(item);
    });

    return items;
  }, [goal, latest]);

  const reviewTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      (record.reviewTags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [records]);

  const trendPoints = records
    .map((record) => ({ date: record.examDate, value: record.totalGrade }))
    .filter((p): p is { date: string; value: number } => Number.isFinite(p.value));

  const averageValues = SUBJECTS.map((subject) => {
    const values = getFiniteValues(records.map((record) => record[subject.scoreKey as keyof ExamRecordDTO] as number | null));
    return values.length ? average(values) : 0;
  });
  const latestValues = SUBJECTS.map((subject) => (latest ? (latest[subject.scoreKey as keyof ExamRecordDTO] as number | null) : null));

  async function refresh() {
    const [recordsData, goalData] = await Promise.all([
      fetch("/api/exam-records").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
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
      scienceGrade: toNum("scienceGrade"),
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
    nextRecord.totalGrade = calculateTotalGrade(nextRecord as Record<string, number | null | undefined>);

    if (!nextRecord.examName || !nextRecord.examDate) {
      window.alert("請至少填寫考試名稱與日期。");
      return;
    }

    const res = await fetch("/api/exam-records", {
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
      nextRecord[subject.scoreKey] = current[subject.scoreKey as keyof ExamRecordDTO];
      nextRecord[subject.gradeKey] = toNum(subject.gradeKey);
      for (const { key } of subject.components) nextRecord[key] = toNum(key);
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
    nextRecord.totalGrade = calculateTotalGrade(nextRecord as Record<string, number | null | undefined>);
    const response = await fetch(`/api/exam-records/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextRecord),
    });
    if (!response.ok) {
      setStatus({ text: "修改成績失敗，請稍後再試。", type: "error" });
      return;
    }
    await refresh();
    setEditingRecordId(null);
    setStatus({ text: "已儲存成績紀錄。", type: "success" });
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
      targetScienceGrade: toNum("targetScienceGrade"),
      targetSocialGrade: goal?.targetSocialGrade ?? null,
    };

    const res = await fetch("/api/goals", {
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
          <p className="mt-2 max-w-2xl text-muted">用最省空間的儀表板方式追蹤分數、級分、目標差距與考後檢討重點。</p>
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

      <div className="mobile-stat-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="目前筆數" value={String(records.length)} caption="已建立的模擬考紀錄" />
        <StatCard label="平均總級分" value={averageGrade !== null ? formatScore(averageGrade) : "0"} caption="歷次總級分平均" />
        <StatCard label="最高總級分" value={highestGrade !== null ? formatScore(highestGrade) : "0"} caption="目前最佳總級分" />
        <StatCard label="進步分數最高的科目" value={bestImprovement.value} caption={bestImprovement.detail} />
        <StatCard label="距離目標" value={goalGap.value} caption={goalGap.detail} highlight />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="mobile-panel border border-line bg-white p-5 lg:col-span-7">
          <h2 className="text-xl font-bold">最新考試聚焦</h2>
          <p className="mt-1 text-muted">自動抓取最近一次考試，與上一次或平均表現比較。</p>

          {!latest ? (
            <div className="mt-4 border border-dashed border-line-strong bg-[#f8fbff] p-6 text-center text-muted">
              新增成績後，這裡會自動顯示最新表現與比較分析。
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">{latest.examName}</h3>
                  <p className="mt-1 text-muted">
                    {latest.examDate} · 總級分 {formatMaybeNumber(latest.totalGrade)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {RANK_FIELDS.map(({ key, totalKey, label }) => `${label} ${formatMaybeNumber(latest[key])}/${formatMaybeNumber(latest[totalKey])}`).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(latest.reviewTags || []).map((tag) => (
                    <Tag key={tag} label={tag} />
                  ))}
                </div>
              </div>
              <div className="mobile-two-col mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <InsightCard
                  title="總級分"
                  value={formatMaybeNumber(latest.totalGrade)}
                  detail={`目標 ${formatMaybeNumber(goal?.targetTotalGrade)}`}
                  comparison={buildComparison(
                    latest.totalGrade,
                    previous ? previous.totalGrade : average(getFiniteValues(records.map((r) => r.totalGrade))),
                    previous ? "比上次" : "比平均",
                    "級"
                  )}
                />
                {SUBJECTS.map((subject) => {
                  const latestScore = latest[subject.scoreKey as keyof ExamRecordDTO] as number | null;
                  const latestGrade = latest[subject.gradeKey as keyof ExamRecordDTO] as number | null;
                  const benchmarkSummary = BENCHMARKS.map(({ key, label }) => {
                    const benchmarkKey = `${subject.key}${key[0].toUpperCase()}${key.slice(1)}Grade` as keyof ExamRecordDTO;
                    const currentValue = latest[benchmarkKey] as number | null;
                    const previousValue = previous ? previous[benchmarkKey] as number | null : null;
                    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return `${label}—`;
                    const delta = (currentValue as number) - (previousValue as number);
                    return `${label}${delta > 0 ? "▲" : delta < 0 ? "▼" : "•"}${delta === 0 ? "" : formatScore(Math.abs(delta))}`;
                  }).join(" ");
                  const baseline = previous
                    ? (previous[subject.scoreKey as keyof ExamRecordDTO] as number | null)
                    : (() => {
                        const values = getFiniteValues(records.map((r) => r[subject.scoreKey as keyof ExamRecordDTO] as number | null));
                        return values.length ? average(values) : null;
                      })();
                  return (
                    <InsightCard
                      key={subject.key}
                      title={subject.label}
                      value={formatMaybeNumber(latestScore)}
                      detail={`級分 ${formatMaybeNumber(latestGrade)} · 五標 ${benchmarkSummary}`}
                      comparison={buildComparison(latestScore, baseline, previous ? "比上次" : "比平均", "分")}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside className="mobile-panel border border-line bg-white p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">目標差距</h2>
            <button
              type="button"
              onClick={() => setShowGoalForm((v) => !v)}
              className="border border-line bg-white px-3 py-1.5 text-sm font-bold text-primary"
            >
              {showGoalForm ? "取消" : "編輯目標"}
            </button>
          </div>

          {showGoalForm && goal && (
            <form
              className="mt-4 grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveGoal(e.currentTarget);
              }}
            >
              <label className="col-span-2 flex flex-col gap-1 text-sm text-muted">
                目標校系
                <input name="goalName" defaultValue={goal.goalName} className="border border-line px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                總級分
                <input name="targetTotalGrade" type="number" defaultValue={goal.targetTotalGrade ?? ""} className="border border-line px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                國文級分
                <input name="targetChineseGrade" type="number" defaultValue={goal.targetChineseGrade ?? ""} className="border border-line px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                英文級分
                <input name="targetEnglishGrade" type="number" defaultValue={goal.targetEnglishGrade ?? ""} className="border border-line px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                數學級分
                <input name="targetMathGrade" type="number" defaultValue={goal.targetMathGrade ?? ""} className="border border-line px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                自然級分
                <input name="targetScienceGrade" type="number" defaultValue={goal.targetScienceGrade ?? ""} className="border border-line px-3 py-2" />
              </label>
              <button type="submit" className="col-span-2 mt-2 border border-ink bg-ink px-4 py-2 font-bold text-white">
                儲存目標
              </button>
            </form>
          )}

          <div className="mobile-two-col mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {goalProgressItems.length === 0 ? (
              <div className="col-span-2 border border-dashed border-line-strong bg-[#f8fbff] p-5 text-center text-muted">
                尚未設定任何目標。
              </div>
            ) : (
              goalProgressItems.map((item, index) => (
                <article key={index} className="border border-line bg-white p-3.5">
                  <span className="block text-muted">{item.label}</span>
                  <strong
                    className={`num-display my-2 block text-lg ${
                      item.status === "positive" ? "text-success" : item.status === "negative" ? "text-danger" : ""
                    }`}
                  >
                    {item.value}
                  </strong>
                  <small className="block text-muted">{item.detail}</small>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="mobile-panel border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">長期成長趨勢</h2>
              <p className="mt-1 text-muted">在總分與總級分之間切換，觀察哪個指標更穩定地成長。</p>
            </div>
            <span className="border border-primary bg-primary px-4 py-2 font-bold text-white">總級分曲線</span>
          </div>
          <div className="mt-4">
            <TrendChart points={trendPoints} color="#20a16b" />
          </div>
        </section>

        <section className="mobile-panel border border-line bg-white p-5">
          <h2 className="text-xl font-bold">各科戰力分佈</h2>
          <p className="mt-1 text-muted">以平均表現與最近一次表現疊圖，比較哪一科最需要補強。</p>
          <div className="mt-4">
            <RadarChart averageValues={averageValues} latestValues={latestValues} />
          </div>
          <div className="mt-3.5 flex flex-wrap gap-4 text-muted">
            <span>
              <i className="mr-2 inline-block h-3 w-3 rounded-full bg-[#3563e9]" />
              平均表現
            </span>
            <span>
              <i className="mr-2 inline-block h-3 w-3 rounded-full bg-[#20a16b]" />
              最近一次
            </span>
          </div>
        </section>
      </div>

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
                {["日期", "考試", "總級分", ...SUBJECTS.map((subject) => subject.label), ...RANK_FIELDS.map((field) => field.label), "標籤", "備註", "操作"].map((h) => (
                  <th key={h} className="border-b border-line bg-[#f9fafb] px-3 py-3.5 text-left font-bold text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4 + SUBJECTS.length + RANK_FIELDS.length} className="px-3 py-6 text-center text-muted">
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
                      {SUBJECTS.map((subject) => (
                        <td key={subject.key} className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                          {editing ? (
                            <div className="min-w-56 space-y-1.5">
                              {subject.components.map(({ key, label, maxScore }) => (
                                <label key={key} className="flex items-center justify-between gap-2 text-xs text-muted">
                                  {label}
                                  <input form={formId} name={key} type="number" min={0} max={maxScore} step={0.1} defaultValue={record[key as keyof ExamRecordDTO] as number | null ?? ""} className="w-20 border border-line px-1.5 py-1" />
                                </label>
                              ))}
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
                {SUBJECTS.map((subject) => (
                  <article key={subject.key} className="border border-line bg-[#f8fbff] p-3.5">
                    <h3 className="mb-2 font-bold">{subject.label}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {subject.components.map(({ key, label, maxScore }) => (
                        <label key={key} className="flex flex-col gap-1.5 text-sm text-muted">
                          {label}{maxScore ? `（滿分 ${maxScore}）` : ""}
                          <input name={key} type="number" min={0} max={maxScore} step={0.1} className="border border-line px-2.5 py-2" />
                        </label>
                      ))}
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

function StatCard({
  label,
  value,
  caption,
  highlight = false,
}: {
  label: string;
  value: string;
  caption: string;
  highlight?: boolean;
}) {
  return (
    <article className={`mobile-stat-card border p-4.5 ${highlight ? "border-line-strong bg-white" : "border-line bg-white"}`}>
      <p className="m-0 text-muted">{label}</p>
      <strong className="num-display mt-2 block text-3xl sm:text-[2.5rem]">{value}</strong>
      <span className="mt-1 block text-muted">{caption}</span>
    </article>
  );
}

export default function ScorePage() {
  return (
    <RequireAuth>
      <ScorePageContent />
    </RequireAuth>
  );
}
