"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { authFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/context/AuthContext";
import { InsightCard, Tag } from "@/components/InsightCard";
import { MultiTrendChart } from "@/components/TrendChart";
import {
  average,
  formatScore,
  predictNextValue,
  ENGLISH_CATEGORIES,
  ENGLISH_PRACTICE_TYPES,
  ENGLISH_PRACTICE_NAME_HINTS,
  ENGLISH_TOTAL_MAX_SCORE,
  ENGLISH_UNAVAILABLE_CATEGORY_MAP,
  getEnglishCategoryMaxScore,
} from "@/lib/data";
import type { EnglishPracticeType } from "@/lib/data";
import type { EnglishRecordDTO } from "@/lib/types";

function getFiniteValues(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => Number.isFinite(v));
}

function formatMaybeNumber(value: number | null | undefined): string {
  return Number.isFinite(value) ? formatScore(value as number) : "—";
}

function isUnavailableCategory(practiceType: string, categoryKey: string): boolean {
  return (ENGLISH_UNAVAILABLE_CATEGORY_MAP[practiceType] || []).includes(categoryKey);
}

function getPracticeTypeLabel(typeKey: string): string {
  return ENGLISH_PRACTICE_TYPES.find((t) => t.key === typeKey)?.label || typeKey;
}

function EnglishPageContent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<EnglishRecordDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [practiceTypeInput, setPracticeTypeInput] = useState<string>("miaomiao");
  const [trendType, setTrendType] = useState<"all" | EnglishPracticeType>("all");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
<<<<<<< HEAD
  const [editingPracticeType, setEditingPracticeType] = useState<string>("miaomiao");
=======
  const [editingPracticeTypes, setEditingPracticeTypes] = useState<Record<string, string>>({});
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a

  useEffect(() => {
    authFetch(user, "/api/english-records")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then(setRecords)
      .catch(() => setStatus({ text: "讀取英文資料失敗，請稍後再試。", type: "error" }))
      .finally(() => setLoading(false));
  }, [user]);

  async function refresh() {
    const data = await authFetch(user, "/api/english-records").then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))));
    setRecords(data);
  }

  const totals = getFiniteValues(records.map((r) => r.totalScore));
  const latest = records.at(-1) || null;

  function getCategoryValues(categoryKey: string, practiceType?: string): number[] {
    return getFiniteValues(
      records
        .filter((r) => !practiceType || r.practiceType === practiceType)
        .filter((r) => !isUnavailableCategory(r.practiceType, categoryKey))
        .map((r) => r[categoryKey as keyof EnglishRecordDTO] as number | null)
    );
  }

  function formatTypeAverage(typeKey: string): string {
    const values = getFiniteValues(records.filter((r) => r.practiceType === typeKey).map((r) => r.totalScore));
    return values.length ? formatScore(average(values)) : "0";
  }

  function getCategoryAverageRate(categoryKey: string, practiceType?: string): number | null {
    const rates = records
      .filter((record) => !practiceType || record.practiceType === practiceType)
      .filter((record) => !isUnavailableCategory(record.practiceType, categoryKey))
      .map((record) => {
        const score = record[categoryKey as keyof EnglishRecordDTO] as number | null;
        const maxScore = getEnglishCategoryMaxScore(categoryKey, record.practiceType);
        return Number.isFinite(score) && maxScore > 0 ? ((score as number) / maxScore) * 100 : null;
      })
      .filter((value): value is number => value !== null);
    return rates.length ? average(rates) : null;
  }

  const categoryTrendSummaries = useMemo(() => {
    return ENGLISH_CATEGORIES.map((category) => {
      if (!latest) {
        return { key: category.key, label: category.label, value: "—", detail: "尚無資料", icon: "•", tone: "neutral" as const, tail: "還沒有可比較的題型資料" };
      }
      if (isUnavailableCategory(latest.practiceType, category.key)) {
        return { key: category.key, label: category.label, value: "-", detail: "不適用此題型", icon: "-", tone: "neutral" as const, tail: "此練習類型不適用" };
      }
      const values = getCategoryValues(category.key);
      if (!values.length) {
        return { key: category.key, label: category.label, value: "—", detail: "尚無長期趨勢", icon: "•", tone: "neutral" as const, tail: "目前沒有足夠資料" };
      }
      const latestValue = latest[category.key as keyof EnglishRecordDTO] as number | null;
      if (!Number.isFinite(latestValue)) {
        return { key: category.key, label: category.label, value: "-", detail: "尚無最新分數", icon: "•", tone: "neutral" as const, tail: "最新一次沒有此題型資料" };
      }
      const firstValue = values[0];
      const averageValue = average(values);
      const direction = (latestValue as number) > firstValue ? "上升" : (latestValue as number) < firstValue ? "下降" : "持平";
      const diffFromAverage = (latestValue as number) - averageValue;
      return {
        key: category.key,
        label: category.label,
        value: formatMaybeNumber(latestValue),
        detail: `長期趨勢：${direction}`,
        icon: diffFromAverage > 0 ? "▲" : diffFromAverage < 0 ? "▼" : "•",
        tone: diffFromAverage > 0 ? ("positive" as const) : diffFromAverage < 0 ? ("negative" as const) : ("neutral" as const),
        tail:
          diffFromAverage > 0
            ? `最新較長期平均高 ${formatScore(diffFromAverage)} 分`
            : diffFromAverage < 0
              ? `最新較長期平均低 ${formatScore(Math.abs(diffFromAverage))} 分`
              : "最新與長期平均持平",
      };
    });
    // getCategoryValues is intentionally omitted: it's a plain closure over
    // `records` recreated each render, and including it would defeat memoization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, latest]);

  const findings = useMemo(() => {
    const averages = ENGLISH_CATEGORIES.map((category) => ({
      label: category.label,
      value: getCategoryAverageRate(category.key),
    })).filter((item) => Number.isFinite(item.value)) as { label: string; value: number }[];

    if (!averages.length) return null;
    averages.sort((a, b) => b.value - a.value);
    return { strongest: averages[0], weakest: averages.at(-1)! };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  const trendSeries = ENGLISH_PRACTICE_TYPES.map((type) => ({
    key: type.key,
<<<<<<< HEAD
    color: type.key === "miaomiao" ? "#3563e9" : type.key === "pastPaper" ? "#9a4fc4" : "#20a16b",
=======
    color: type.color,
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
    points: records
      .filter((r) => r.practiceType === type.key && Number.isFinite(r.totalScore))
      .map((r) => ({ date: r.practiceDate, value: r.totalScore as number })),
  }));
  const visibleTrendSeries =
    trendType === "all" ? trendSeries : trendSeries.filter((series) => series.key === trendType);
  const visibleTrendCount = visibleTrendSeries.reduce((count, series) => count + series.points.length, 0);

  // Each practice type grows at its own pace, so the next-score prediction is
  // computed independently per type (linear regression over that type's own
  // history) instead of regressing on a single mixed/combined series. The
  // "all" view's predicted total is simply the sum of all per-type
  // predictions.
  const typePredictions = new Map(
    trendSeries.map((series) => [series.key, predictNextValue(series.points.map((p) => p.value))])
  );
  const selectedType = ENGLISH_PRACTICE_TYPES.find((type) => type.key === trendType);
  const trendYAxisMin = 0;
  const trendYAxisMax = selectedType ? selectedType.maxScore : ENGLISH_TOTAL_MAX_SCORE;
  const trendReferenceLines =
    trendType === "all"
      ? trendSeries.flatMap((series) => {
          const values = series.points.map((point) => point.value);
          if (!values.length) return [];
          const type = ENGLISH_PRACTICE_TYPES.find((item) => item.key === series.key)!;
          return [{
            value: Math.max(...values),
            label: `${type.label}最高 ${formatScore(Math.max(...values))}`,
            color: series.color,
          }];
        })
      : [];
  const trendPredictions = (trendType === "all" ? ENGLISH_PRACTICE_TYPES : ENGLISH_PRACTICE_TYPES.filter((type) => type.key === trendType))
    .flatMap((type) => {
      const prediction = typePredictions.get(type.key);
      if (!prediction) return [];
      return [{
        value: prediction.value,
        label: `${type.label} ${formatScore(prediction.value)}${prediction.isApproximate ? "（近似）" : ""}`,
<<<<<<< HEAD
        color: trendSeries.find((series) => series.key === type.key)!.color,
=======
        color: type.color,
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
      }];
    });

  async function handleAddRecord(formEl: HTMLFormElement) {
    const formData = new FormData(formEl);
    const toNum = (key: string) => {
      const v = formData.get(key);
      if (v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const practiceType = String(formData.get("practiceType") || "");
    const record: Partial<EnglishRecordDTO> = {
      practiceType,
      practiceDate: String(formData.get("practiceDate") || ""),
      practiceName: String(formData.get("practiceName") || "").trim(),
      vocabularyScore: toNum("vocabularyScore"),
      clozeScore: toNum("clozeScore"),
      contextScore: toNum("contextScore"),
      structureScore: toNum("structureScore"),
      readingScore: toNum("readingScore"),
      mixedScore: toNum("mixedScore"),
      translationScore: toNum("translationScore"),
      totalScore: toNum("totalScore"),
      notes: String(formData.get("notes") || "").trim(),
    };

    (ENGLISH_UNAVAILABLE_CATEGORY_MAP[practiceType] || []).forEach((key) => {
      (record as Record<string, unknown>)[key] = null;
    });

    if (record.totalScore === null) {
      const values = ENGLISH_CATEGORIES.map((c) => record[c.key as keyof EnglishRecordDTO] as number | null).filter((v) =>
        Number.isFinite(v)
      ) as number[];
      record.totalScore = values.length ? values.reduce((s, v) => s + v, 0) : null;
    }

    const hasCategoryScore = ENGLISH_CATEGORIES.some((c) => Number.isFinite(record[c.key as keyof EnglishRecordDTO] as number | null));
    if (!record.practiceType || !record.practiceDate || (!Number.isFinite(record.totalScore) && !hasCategoryScore)) {
      window.alert("請至少填寫練習類型、日期，並至少輸入一項英文成績。");
      return;
    }

    const res = await authFetch(user, "/api/english-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      setStatus({ text: "新增英文練習紀錄失敗，請稍後再試。", type: "error" });
      return;
    }

    await refresh();
    formEl.reset();
    setShowModal(false);
    setStatus({ text: "已新增英文練習紀錄。", type: "success" });
  }

  async function handleSaveRecord(formEl: HTMLFormElement, id: string) {
    const formData = new FormData(formEl);
    const toNum = (key: string) => {
      const value = formData.get(key);
      if (value === null || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };
    const practiceType = String(formData.get("practiceType") || "");
    const record: Partial<EnglishRecordDTO> = {
      practiceType,
      practiceDate: String(formData.get("practiceDate") || ""),
      practiceName: String(formData.get("practiceName") || "").trim(),
      vocabularyScore: toNum("vocabularyScore"),
      clozeScore: toNum("clozeScore"),
      contextScore: toNum("contextScore"),
      structureScore: toNum("structureScore"),
      readingScore: toNum("readingScore"),
      mixedScore: toNum("mixedScore"),
      translationScore: toNum("translationScore"),
      notes: String(formData.get("notes") || "").trim(),
    };
    (ENGLISH_UNAVAILABLE_CATEGORY_MAP[practiceType] || []).forEach((key) => {
      (record as Record<string, unknown>)[key] = null;
    });
    const scores = ENGLISH_CATEGORIES.map(({ key }) => record[key as keyof EnglishRecordDTO] as number | null)
      .filter(Number.isFinite) as number[];
    record.totalScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) : null;
    const response = await authFetch(user, `/api/english-records/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      setStatus({ text: "修改英文紀錄失敗，請稍後再試。", type: "error" });
      return;
    }
    await refresh();
    setEditingRecordId(null);
<<<<<<< HEAD
    setEditingPracticeType("miaomiao");
=======
    setEditingPracticeTypes({});
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
    setStatus({ text: "已儲存英文紀錄。", type: "success" });
  }

  if (loading) {
    return <div className="p-8 text-muted">載入中...</div>;
  }

  return (
    <div className="mobile-page">
      <div className="mobile-page-header mb-6 flex flex-wrap items-start justify-between gap-4 border-b-4 border-ink bg-white py-5">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">English Practice Dashboard</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">英文練習統計</h1>
          <p className="mt-2 max-w-2xl text-muted">
<<<<<<< HEAD
            分開追蹤妙妙卷、歷屆試題與克漏字練習，並把詞彙題、綜合測驗、文意選填、篇章結構、閱讀題、混合題拆開分析。
=======
            分開追蹤妙妙卷、克漏字與好好學練習，並把各題型分數拆開分析。
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="border border-ink bg-ink px-5 py-2.5 font-bold text-white"
        >
          ＋ 新增英文成績
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

      <div className="mobile-stat-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="總筆數" value={String(records.length)} caption="所有英文練習紀錄" />
        <StatCard label="平均總分" value={totals.length ? formatScore(average(totals)) : "0"} caption="全體練習平均" />
        <StatCard label="最佳總分" value={totals.length ? formatScore(Math.max(...totals)) : "0"} caption="目前最佳表現" />
        {ENGLISH_PRACTICE_TYPES.map((type) => (
          <StatCard key={type.key} label={`${type.label}平均`} value={formatTypeAverage(type.key)} caption={`${type.label}練習平均`} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="mobile-panel border border-line bg-white p-5 lg:col-span-7">
          <h2 className="text-xl font-bold">各題型成長趨勢</h2>
          {!latest ? (
            <div className="mt-4 border border-dashed border-line-strong bg-[#f8fbff] p-6 text-center text-muted">
              新增第一筆英文紀錄後，這裡會自動分析。
            </div>
          ) : (
            <>
              <p className="mt-1 text-muted">
                {latest.practiceDate} · {getPracticeTypeLabel(latest.practiceType)} · 依各題型長期趨勢分析
              </p>
              <div className="mt-3">
                <Tag label={getPracticeTypeLabel(latest.practiceType)} />
              </div>
              <div className="mobile-two-col mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {categoryTrendSummaries.map((summary) => (
                  <InsightCard
                    key={summary.key}
                    title={summary.label}
                    value={summary.value}
                    detail={summary.detail}
                    comparison={{ icon: summary.icon, tone: summary.tone, label: summary.tail }}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="mobile-panel border border-line bg-white p-5 lg:col-span-5">
          <h2 className="text-xl font-bold">練習類型平均</h2>
          <div className="mobile-two-col mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {records.length === 0 ? (
              <div className="col-span-2 border border-dashed border-line-strong bg-[#f8fbff] p-5 text-center text-muted">
                目前沒有英文練習資料。
              </div>
            ) : (
              ENGLISH_PRACTICE_TYPES.map((type) => {
                const typeRecords = records.filter((r) => r.practiceType === type.key);
                const typeTotals = getFiniteValues(typeRecords.map((r) => r.totalScore));
                return (
                  <article key={type.key} className="border border-line bg-white p-3.5">
                    <span className="block text-muted">{type.label}</span>
                    <strong className="num-display my-2 block text-lg">
                      {typeTotals.length ? formatScore(average(typeTotals)) : "0"}
                    </strong>
                    <small className="block text-muted">{typeRecords.length} 筆資料</small>
                  </article>
                );
              })
            )}
          </div>

          <div className="mt-5">
            <h3 className="font-bold">重點發現</h3>
            {!findings ? (
              <p className="mt-2 text-muted">目前沒有足夠的細分題型資料。</p>
            ) : (
              <div className="mt-2 space-y-2 text-muted">
                <p>
                  <strong className="text-ink">最穩定題型：</strong>
                  {findings.strongest.label}（平均得分率 {formatScore(findings.strongest.value)}%）
                </p>
                <p>
                  <strong className="text-ink">最需要補強：</strong>
                  {findings.weakest.label}（平均得分率 {formatScore(findings.weakest.value)}%）
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <section className="mobile-panel mt-5 border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">總分成長曲線</h2>
          <label className="flex items-center gap-2 text-sm font-semibold text-muted">
            顯示題型
            <select
              value={trendType}
              onChange={(event) => setTrendType(event.target.value as "all" | EnglishPracticeType)}
              aria-label="選擇總分成長曲線題型"
              className="border border-line bg-white px-3 py-2 text-ink"
            >
              <option value="all">全部</option>
              {ENGLISH_PRACTICE_TYPES.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1 text-muted">
          {trendType === "all"
<<<<<<< HEAD
            ? `妙妙卷、歷屆試題與克漏字分開繪製，Y 軸固定為 0–${ENGLISH_TOTAL_MAX_SCORE} 分，並分別顯示目前最高分與下次預測。`
=======
            ? `${ENGLISH_PRACTICE_TYPES.map((type) => type.label).join("、")}分開繪製，Y 軸固定為 0–${ENGLISH_TOTAL_MAX_SCORE} 分，並分別顯示目前最高分與下次預測。`
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
            : `僅顯示${getPracticeTypeLabel(trendType)}成績，Y 軸固定為 0–${trendYAxisMax} 分。`}
          {visibleTrendCount === 1 ? " 資料筆數不足以回歸，預測將以最近一次成績作為近似值。" : ""}
        </p>
        <div className="mt-4">
          <MultiTrendChart
            series={visibleTrendSeries}
            emptyMessage="目前選擇的練習類型沒有有效總分資料。"
            yAxisMin={trendYAxisMin}
            yAxisMax={trendYAxisMax}
            referenceLines={trendReferenceLines}
            predictions={trendPredictions}
            showExtrema={trendType !== "all"}
          />
        </div>
      </section>

      <section className="mobile-panel mt-5 border border-line bg-white p-5">
        <h2 className="text-xl font-bold">題型得分率比較</h2>
        <p className="mt-1 text-muted">依練習類型比較各題型平均得分率；克漏字不含詞彙、閱讀、混合及翻譯，好好學不含詞彙。</p>
        <div className="mobile-two-col mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENGLISH_CATEGORIES.map((category) => {
            return (
              <article key={category.key} className="border border-line bg-white p-3.5">
                <p className="font-bold">{category.label}</p>
                {ENGLISH_PRACTICE_TYPES.map((type) => {
<<<<<<< HEAD
                  const rate = isUnavailableCategory(type.key, category.key)
                    ? null
                    : getCategoryAverageRate(category.key, type.key);
=======
                  const rate = isUnavailableCategory(type.key, category.key) ? null : getCategoryAverageRate(category.key, type.key);
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
                  return (
                    <p key={type.key} className="mt-1 text-sm text-muted">
                      {type.label}：<span className="num-display text-ink">{rate !== null ? `${formatScore(rate)}%` : "-"}</span>
                    </p>
                  );
                })}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mobile-panel mt-5 border border-line bg-white p-5">
        <h2 className="text-xl font-bold">歷次紀錄與管理</h2>
        <div className="mobile-table-wrap mt-4">
          <table className="mobile-table w-full min-w-[1180px] border-collapse">
            <thead>
              <tr>
                {["日期", "練習類型", "練習名稱", "總分", ...ENGLISH_CATEGORIES.map((category) => category.label), "備註", "操作"].map((h) => (
                  <th key={h} className="border-b border-line bg-[#f9fafb] px-3 py-3.5 text-left font-bold text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={ENGLISH_CATEGORIES.length + 6} className="px-3 py-6 text-center text-muted">
                    目前還沒有任何英文練習紀錄。
                  </td>
                </tr>
              ) : (
                records
                  .slice()
                  .reverse()
                  .map((record) => {
                    const editing = editingRecordId === record.id;
                    const formId = `edit-english-${record.id}`;
                    const editingType = editingPracticeTypes[record.id] || record.practiceType;
                    return (
                    <tr key={record.id} className="hover:bg-[#f9fafb]">
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <input form={formId} name="practiceDate" type="date" defaultValue={record.practiceDate} className="w-32 border border-line px-2 py-1" /> : record.practiceDate}</td>
<<<<<<< HEAD
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <select form={formId} name="practiceType" value={editingPracticeType} onChange={(event) => setEditingPracticeType(event.target.value)} className="border border-line px-2 py-1">{ENGLISH_PRACTICE_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select> : getPracticeTypeLabel(record.practiceType)}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <input form={formId} name="practiceName" defaultValue={record.practiceName} placeholder={editingPracticeType === "pastPaper" ? "幾年份的..." : ""} className="w-32 border border-line px-2 py-1" /> : record.practiceName}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{formatMaybeNumber(record.totalScore)}</td>
                      {ENGLISH_CATEGORIES.map((category) => (
                        <td key={category.key} className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                          {isUnavailableCategory(editing ? editingPracticeType : record.practiceType, category.key)
=======
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <select form={formId} name="practiceType" value={editingType} onChange={(event) => setEditingPracticeTypes((current) => ({ ...current, [record.id]: event.target.value }))} className="border border-line px-2 py-1">{ENGLISH_PRACTICE_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select> : getPracticeTypeLabel(record.practiceType)}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <input form={formId} name="practiceName" defaultValue={record.practiceName} placeholder={ENGLISH_PRACTICE_NAME_HINTS[editingType as EnglishPracticeType]} className="w-32 border border-line px-2 py-1" /> : record.practiceName}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{formatMaybeNumber(record.totalScore)}</td>
                      {ENGLISH_CATEGORIES.map((category) => (
                        <td key={category.key} className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                          {isUnavailableCategory(editing ? editingType : record.practiceType, category.key)
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
                            ? "-"
                            : editing
                              ? <input form={formId} name={category.key} type="number" min={0} max={getEnglishCategoryMaxScore(category.key, editingType)} step={0.1} defaultValue={record[category.key as keyof EnglishRecordDTO] as number | null ?? ""} className="w-20 border border-line px-2 py-1" aria-label={category.label} />
                              : formatMaybeNumber(record[category.key as keyof EnglishRecordDTO] as number | null)}
                        </td>
                      ))}
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <textarea form={formId} name="notes" defaultValue={record.notes} className="w-40 border border-line px-2 py-1" /> : record.notes || "—"}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                        {editing ? (
                          <form id={formId} onSubmit={(event) => { event.preventDefault(); handleSaveRecord(event.currentTarget, record.id); }}>
                            <button type="submit" className="border border-ink bg-ink px-3 py-2 font-bold text-white">儲存</button>
<<<<<<< HEAD
                            <button type="button" onClick={() => { setEditingRecordId(null); setEditingPracticeType("miaomiao"); }} className="mt-2 border border-line px-3 py-2 font-bold">取消</button>
=======
                            <button type="button" onClick={() => { setEditingRecordId(null); setEditingPracticeTypes({}); }} className="mt-2 border border-line px-3 py-2 font-bold">取消</button>
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
                          </form>
                        ) : (
                          <button type="button" onClick={() => { setEditingRecordId(record.id); setEditingPracticeType(record.practiceType); }} className="border border-line px-3 py-2 font-bold text-primary">修改</button>
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
              <h2 className="text-2xl font-bold">新增英文練習紀錄</h2>
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
              <div className="mobile-modal-grid grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2 text-muted">
                  練習類型
                  <select
                    name="practiceType"
                    value={practiceTypeInput}
                    onChange={(e) => setPracticeTypeInput(e.target.value)}
                    className="border border-line px-3 py-2.5"
                  >
                    {ENGLISH_PRACTICE_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-muted">
                  練習日期
                  <input name="practiceDate" type="date" required className="border border-line px-3 py-2.5" />
                </label>
                <label className="flex flex-col gap-2 text-muted">
                  練習名稱
<<<<<<< HEAD
                  <input
                    name="practiceName"
                    type="text"
                    placeholder={practiceTypeInput === "pastPaper" ? "幾年份的..." : "例：妙七"}
                    className="border border-line px-3 py-2.5"
                  />
=======
                  <input name="practiceName" type="text" placeholder={ENGLISH_PRACTICE_NAME_HINTS[practiceTypeInput as EnglishPracticeType]} className="border border-line px-3 py-2.5" />
>>>>>>> 00909cc5d3ecd392f940179074ef078eb5f9690a
                </label>
              </div>

              <div className="mobile-modal-grid mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {ENGLISH_CATEGORIES.map((category) => {
                  const unavailable = isUnavailableCategory(practiceTypeInput, category.key);
                  return (
                    <label key={category.key} className="flex flex-col gap-1.5 text-sm text-muted">
                      {category.label}（滿分 {getEnglishCategoryMaxScore(category.key, practiceTypeInput)}）
                      <input
                        name={category.key}
                        type="number"
                        min={0}
                        max={getEnglishCategoryMaxScore(category.key, practiceTypeInput)}
                        step={0.1}
                        disabled={unavailable}
                        placeholder={unavailable ? "不適用" : ""}
                        className="border border-line px-2.5 py-2 disabled:bg-[#f3f4f6]"
                      />
                    </label>
                  );
                })}
              </div>

              <label className="mt-4 flex flex-col gap-2 text-muted">
                總分（最高 {ENGLISH_PRACTICE_TYPES.find((type) => type.key === practiceTypeInput)?.maxScore} 分，可不填，系統會自動加總）
                <input name="totalScore" type="number" min={0} max={ENGLISH_PRACTICE_TYPES.find((type) => type.key === practiceTypeInput)?.maxScore} step={0.1} className="border border-line px-3 py-2.5" />
              </label>

              <label className="mt-4 flex flex-col gap-2 text-muted">
                備註
                <textarea name="notes" rows={4} className="min-h-24 border border-line px-3 py-2.5" />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                <button type="submit" className="border border-ink bg-ink px-4 py-2.5 font-bold text-white">
                  儲存紀錄
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

export default function EnglishPage() {
  return (
    <RequireAuth>
      <EnglishPageContent />
    </RequireAuth>
  );
}
