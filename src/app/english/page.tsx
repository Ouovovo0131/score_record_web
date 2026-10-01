"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { InsightCard, Tag } from "@/components/InsightCard";
import { MultiTrendChart } from "@/components/TrendChart";
import { average, formatScore, ENGLISH_CATEGORIES, ENGLISH_PRACTICE_TYPES, ENGLISH_UNAVAILABLE_CATEGORY_MAP } from "@/lib/data";
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
  const [records, setRecords] = useState<EnglishRecordDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [practiceTypeInput, setPracticeTypeInput] = useState<string>("miaomiao");
  const [trendType, setTrendType] = useState<"all" | EnglishPracticeType>("all");

  useEffect(() => {
    fetch("/api/english-records")
      .then((r) => r.json())
      .then(setRecords)
      .catch(() => setStatus({ text: "讀取英文資料失敗，請稍後再試。", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  async function refresh() {
    const data = await fetch("/api/english-records").then((r) => r.json());
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
    const category = ENGLISH_CATEGORIES.find((c) => c.key === categoryKey);
    if (!category || category.maxScore <= 0) return null;
    const rates = getCategoryValues(categoryKey, practiceType).map((v) => (v / category.maxScore) * 100);
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
    color: type.key === "miaomiao" ? "#3563e9" : "#20a16b",
    points: records
      .filter((r) => r.practiceType === type.key && Number.isFinite(r.totalScore))
      .map((r) => ({ date: r.practiceDate, value: r.totalScore as number })),
  }));
  const visibleTrendSeries =
    trendType === "all" ? trendSeries : trendSeries.filter((series) => series.key === trendType);
  const visibleTrendCount = visibleTrendSeries.reduce((count, series) => count + series.points.length, 0);

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

    const res = await fetch("/api/english-records", {
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

  async function handleDeleteRecord(id: string) {
    const res = await fetch(`/api/english-records/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus({ text: "刪除失敗，請稍後再試。", type: "error" });
      return;
    }
    await refresh();
    setStatus({ text: "已刪除該筆英文紀錄。", type: "success" });
  }

  if (loading) {
    return <div className="p-8 text-muted">載入中...</div>;
  }

  return (
    <div className="mx-auto w-[min(1240px,calc(100%-32px))] py-8 pb-14">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b-4 border-ink bg-white py-5">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">English Practice Dashboard</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">英文練習統計</h1>
          <p className="mt-2 max-w-2xl text-muted">
            分開追蹤妙妙卷與克漏字練習，並把詞彙題、綜合測驗、文意選填、篇章結構、閱讀題、混合題拆開分析。
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="總筆數" value={String(records.length)} caption="所有英文練習紀錄" />
        <StatCard label="平均總分" value={totals.length ? formatScore(average(totals)) : "0"} caption="全體練習平均" />
        <StatCard label="最佳總分" value={totals.length ? formatScore(Math.max(...totals)) : "0"} caption="目前最佳表現" />
        <StatCard label="妙妙卷平均" value={formatTypeAverage("miaomiao")} caption="妙妙卷練習平均" />
        <StatCard label="克漏字平均" value={formatTypeAverage("cloze")} caption="克漏字練習平均" highlight />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="border border-line bg-white p-5 lg:col-span-7">
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
              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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

        <aside className="border border-line bg-white p-5 lg:col-span-5">
          <h2 className="text-xl font-bold">練習類型平均</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      <section className="mt-5 border border-line bg-white p-5">
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
          {trendType === "all" ? "妙妙卷（藍）與克漏字（綠）分開繪製。" : `僅顯示${getPracticeTypeLabel(trendType)}成績。`}
          {visibleTrendCount === 1 ? " 至少需要 2 筆有效成績才會顯示預測。" : ""}
        </p>
        <div className="mt-4">
          <MultiTrendChart series={visibleTrendSeries} emptyMessage="目前選擇的練習類型沒有有效總分資料。" />
        </div>
      </section>

      <section className="mt-5 border border-line bg-white p-5">
        <h2 className="text-xl font-bold">題型得分率比較</h2>
        <p className="mt-1 text-muted">依練習類型比較各題型平均得分率（克漏字沒有詞彙/閱讀/混合題）。</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENGLISH_CATEGORIES.map((category) => {
            const miaomiaoRate = getCategoryAverageRate(category.key, "miaomiao");
            const clozeRate = isUnavailableCategory("cloze", category.key) ? null : getCategoryAverageRate(category.key, "cloze");
            return (
              <article key={category.key} className="border border-line bg-white p-3.5">
                <p className="font-bold">{category.label}</p>
                <p className="mt-2 text-sm text-muted">
                  妙妙卷：<span className="num-display text-ink">{miaomiaoRate !== null ? `${formatScore(miaomiaoRate)}%` : "-"}</span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  克漏字：<span className="num-display text-ink">{clozeRate !== null ? `${formatScore(clozeRate)}%` : "-"}</span>
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-5 border border-line bg-white p-5">
        <h2 className="text-xl font-bold">歷次紀錄與管理</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr>
                {["日期", "練習類型", "練習名稱", "總分", "詞彙", "綜合測驗", "文意選填", "篇章結構", "閱讀", "混合", "備註", "操作"].map((h) => (
                  <th key={h} className="border-b border-line bg-[#f9fafb] px-3 py-3.5 text-left font-bold text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-6 text-center text-muted">
                    目前還沒有任何英文練習紀錄。
                  </td>
                </tr>
              ) : (
                records
                  .slice()
                  .reverse()
                  .map((record) => (
                    <tr key={record.id} className="hover:bg-[#f9fafb]">
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{record.practiceDate}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{getPracticeTypeLabel(record.practiceType)}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{record.practiceName}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{formatMaybeNumber(record.totalScore)}</td>
                      {ENGLISH_CATEGORIES.map((category) => (
                        <td key={category.key} className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                          {isUnavailableCategory(record.practiceType, category.key)
                            ? "-"
                            : formatMaybeNumber(record[category.key as keyof EnglishRecordDTO] as number | null)}
                        </td>
                      ))}
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{record.notes || "—"}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="bg-danger px-3 py-2 font-bold text-white"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-[rgba(14,23,42,0.5)]" onClick={() => setShowModal(false)} />
          <div className="relative max-h-[calc(100vh-36px)] w-[min(1040px,calc(100%-24px))] overflow-auto border border-line bg-white p-6">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  <input name="practiceName" type="text" placeholder="例：妙七" className="border border-line px-3 py-2.5" />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {ENGLISH_CATEGORIES.map((category) => {
                  const unavailable = isUnavailableCategory(practiceTypeInput, category.key);
                  return (
                    <label key={category.key} className="flex flex-col gap-1.5 text-sm text-muted">
                      {category.label}（滿分 {category.maxScore}）
                      <input
                        name={category.key}
                        type="number"
                        min={0}
                        max={category.maxScore}
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
                總分（可不填，系統會自動加總）
                <input name="totalScore" type="number" min={0} step={0.1} className="border border-line px-3 py-2.5" />
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
    <article className={`border p-4.5 ${highlight ? "border-line-strong bg-white" : "border-line bg-white"}`}>
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
