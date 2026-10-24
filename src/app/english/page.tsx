"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { authFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/context/AuthContext";
import { TrendChart } from "@/components/TrendChart";
import {
  formatScore,
  ENGLISH_CATEGORIES,
  ENGLISH_PRACTICE_TYPES,
  ENGLISH_PRACTICE_NAME_HINTS,
  ENGLISH_UNAVAILABLE_CATEGORY_MAP,
  getEnglishCategoryMaxScore,
} from "@/lib/data";
import type { EnglishPracticeType } from "@/lib/data";
import type { EnglishRecordDTO } from "@/lib/types";

function formatMaybeNumber(value: number | null | undefined): string {
  return Number.isFinite(value) ? formatScore(value as number) : "—";
}

function isUnavailableCategory(practiceType: string, categoryKey: string): boolean {
  return (ENGLISH_UNAVAILABLE_CATEGORY_MAP[practiceType] || []).includes(categoryKey);
}

function getPracticeTypeLabel(typeKey: string): string {
  return ENGLISH_PRACTICE_TYPES.find((t) => t.key === typeKey)?.label || typeKey;
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

function EnglishPageContent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<EnglishRecordDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [practiceTypeInput, setPracticeTypeInput] = useState<string>("miaomiao");
  const [trendWindow, setTrendWindow] = useState<"all" | "30d" | "7d">("all");
  const [trendType, setTrendType] = useState<"all" | EnglishPracticeType>("all");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingPracticeTypes, setEditingPracticeTypes] = useState<Record<string, string>>({});

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

  const todayKey = new Date().toLocaleDateString("sv-SE");
  const shiftDate = (dateKey: string, days: number) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day + days).toLocaleDateString("sv-SE");
  };
  const validTotalRecords = records.filter((record) =>
    ENGLISH_PRACTICE_TYPES.some((type) => type.key === record.practiceType) && Number.isFinite(record.totalScore)
  );
  const maximumScore = (record: EnglishRecordDTO) =>
    ENGLISH_PRACTICE_TYPES.find((type) => type.key === record.practiceType)?.maxScore ?? 0;
  const scoreRate = (items: EnglishRecordDTO[]) => {
    const possible = items.reduce((sum, record) => sum + maximumScore(record), 0);
    return possible > 0
      ? (items.reduce((sum, record) => sum + (record.totalScore as number), 0) / possible) * 100
      : null;
  };
  const overallRate = scoreRate(validTotalRecords);
  const recentStart = shiftDate(todayKey, -29);
  const previousStart = shiftDate(todayKey, -59);
  const recentRecords = validTotalRecords.filter((record) => record.practiceDate >= recentStart && record.practiceDate <= todayKey);
  const previousRecords = validTotalRecords.filter((record) => record.practiceDate >= previousStart && record.practiceDate < recentStart);
  const recentRate = scoreRate(recentRecords);
  const previousRate = scoreRate(previousRecords);
  const recentRateChange = recentRate !== null && previousRate !== null ? recentRate - previousRate : null;

  const categoryStats = ENGLISH_CATEGORIES.map((category) => {
    const entries = records.filter((record) =>
      !isUnavailableCategory(record.practiceType, category.key) &&
      Number.isFinite(record[category.key as keyof EnglishRecordDTO] as number | null)
    );
    const possible = entries.reduce(
      (sum, record) => sum + getEnglishCategoryMaxScore(category.key, record.practiceType),
      0
    );
    const earned = entries.reduce(
      (sum, record) => sum + (record[category.key as keyof EnglishRecordDTO] as number),
      0
    );
    return { key: category.key, label: category.label, count: entries.length, rate: possible ? (earned / possible) * 100 : null };
  });
  const focusCategory = categoryStats
    .filter((category) => category.count >= 3 && category.rate !== null)
    .sort((a, b) => (a.rate as number) - (b.rate as number))[0] ?? null;

  const cutoffDate = trendWindow === "7d" ? shiftDate(todayKey, -6) : trendWindow === "30d" ? recentStart : null;
  const filteredRecords = validTotalRecords.filter(
    (record) =>
      (!cutoffDate || record.practiceDate >= cutoffDate) &&
      (trendType === "all" || record.practiceType === trendType)
  );
  const dailyTrend = [...new Set(filteredRecords.map((record) => record.practiceDate))]
    .sort()
    .map((date) => {
      const dayRecords = filteredRecords.filter((record) => record.practiceDate === date);
      const rate = scoreRate(dayRecords) ?? 0;
      return { date, value: rate, name: `${dayRecords.length} 次練習` };
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
    setEditingPracticeTypes({});
    setStatus({ text: "已儲存英文紀錄。", type: "success" });
  }

  if (loading) {
    return <div className="p-8 text-muted">載入中...</div>;
  }

  return (
    <div className="mobile-page">
      <div className="mobile-page-header mb-6 flex flex-wrap items-start justify-between gap-4 border-b-4 border-ink bg-white py-5">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">英文練習分析</h1>
          <p className="mt-2 max-w-2xl text-muted">整理練習表現與題型得分，找出下一步可加強的方向。</p>
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

      <section className="english-summary" aria-label="英文練習摘要">
        <SummaryMetric label="練習次數" value={String(records.length)} detail="已儲存的練習紀錄，不代表作答題數" />
        <SummaryMetric label="累積得分率" value={overallRate === null ? "—" : `${formatScore(overallRate)}%`} detail={`依 ${validTotalRecords.length} 筆有總分紀錄計算`} />
        <SummaryMetric
          label="近 30 天"
          value={String(recentRecords.length)}
          detail={
            recentRate === null
              ? "此期間尚無有效總分紀錄"
              : `得分率 ${formatScore(recentRate)}%${recentRateChange === null ? "" : ` · 較前 30 天 ${recentRateChange > 0 ? "+" : ""}${formatScore(recentRateChange)} 個百分點`}`
          }
          tone={recentRateChange === null || recentRateChange === 0 ? "neutral" : recentRateChange > 0 ? "positive" : "negative"}
        />
      </section>

      <section className="english-trend" aria-labelledby="english-trend-heading">
        <div className="english-trend-heading">
          <div>
            <h2 id="english-trend-heading">得分率變化</h2>
            <p>每日得分總和 ÷ 該日各練習類型滿分總和；按日期彙整，不代表逐題正確率。</p>
          </div>
          <div className="english-trend-controls">
            <label>
              練習類型
              <select value={trendType} onChange={(event) => setTrendType(event.target.value as "all" | EnglishPracticeType)}>
                <option value="all">全部類型</option>
                {ENGLISH_PRACTICE_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
              </select>
            </label>
            <div className="english-period-tabs" role="group" aria-label="趨勢時間範圍">
              {([
                { value: "all", label: "全部紀錄" },
                { value: "30d", label: "近 30 天" },
                { value: "7d", label: "近 7 天" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={trendWindow === option.value}
                  onClick={() => setTrendWindow(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="english-trend-meta">
          {dailyTrend.length} 個練習日期 · {filteredRecords.length} 筆練習紀錄
          {trendType !== "all" && ` · ${getPracticeTypeLabel(trendType)}`}
        </p>
        {dailyTrend.length >= 2 ? (
          <TrendChart
            points={dailyTrend}
            size="large"
            yAxisMin={0}
            yAxisMax={100}
            valueSuffix="%"
            emptyMessage="此區間沒有足夠紀錄形成趨勢。"
          />
        ) : (
          <div className="english-trend-empty" role="status">
            {dailyTrend.length === 1
              ? `目前只有 ${dailyTrend[0].date} 一個練習日期（${dailyTrend[0].name}），尚不足以呈現趨勢；得分率 ${formatScore(dailyTrend[0].value)}%。`
              : "目前區間沒有可用紀錄；新增不同日期的練習後即可查看趨勢。"}
          </div>
        )}
      </section>

      <section className="english-category-section">
        <div className="english-section-heading">
          <div>
            <h2>題型得分分析</h2>
            <p>依現有題型分數加權計算得分率；樣本少於 3 筆時不判定需加強。</p>
          </div>
        </div>
        {focusCategory && (
          <p className="english-focus-note">
            目前可供參考的加強方向：<strong>{focusCategory.label}</strong>（{formatScore(focusCategory.rate as number)}%，{focusCategory.count} 筆）
          </p>
        )}
        <ul className="english-category-list">
          {categoryStats.map((category) => (
            <li key={category.key}>
              <div className="english-category-label">
                <strong>{category.label}</strong>
                <span>
                  {category.rate === null
                    ? "尚無紀錄"
                    : category.count < 3
                      ? `${formatScore(category.rate)}% · 樣本不足（${category.count} 筆）`
                      : `${formatScore(category.rate)}% · ${category.count} 筆`}
                </span>
              </div>
              <div className="english-category-track" aria-hidden="true">
                <span style={{ width: `${category.rate === null ? 0 : Math.max(0, Math.min(100, category.rate))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="english-review-note">
        <h2>錯題複習</h2>
        <p>
          目前資料只保存每次練習的總分、題型分數與備註，沒有逐題題目、作答答案或複習狀態，因此無法從既有資料產生錯題清單。
          可在下方歷史紀錄編輯備註，記下需要回頭複習的內容。
        </p>
        {focusCategory && <p>建議優先回看「{focusCategory.label}」相關練習；此提示依至少 3 筆紀錄的得分率排序，不代表逐題診斷。</p>}
      </section>

      <section className="english-history">
        <h2 className="text-xl font-bold">歷次紀錄與管理</h2>
        <div className="mobile-table-wrap mt-4">
          <table className="mobile-table w-full border-collapse">
            <thead>
              <tr>
                {["日期", "練習類型", "練習名稱", "總分", "得分率", ...ENGLISH_CATEGORIES.map((category) => category.label), "備註", "操作"].map((h) => (
                  <th key={h} className="border-b border-line bg-[#f9fafb] px-3 py-3.5 text-left font-bold text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={ENGLISH_CATEGORIES.length + 7} className="px-3 py-6 text-center text-muted">
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
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <select form={formId} name="practiceType" value={editingType} onChange={(event) => setEditingPracticeTypes((current) => ({ ...current, [record.id]: event.target.value }))} className="border border-line px-2 py-1">{ENGLISH_PRACTICE_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select> : getPracticeTypeLabel(record.practiceType)}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{editing ? <input form={formId} name="practiceName" defaultValue={record.practiceName} placeholder={ENGLISH_PRACTICE_NAME_HINTS[editingType as EnglishPracticeType]} className="w-32 border border-line px-2 py-1" /> : record.practiceName}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">{formatMaybeNumber(record.totalScore)}</td>
                      <td className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                        {Number.isFinite(record.totalScore) && maximumScore(record) > 0
                          ? `${formatScore(((record.totalScore as number) / maximumScore(record)) * 100)}%`
                          : "—"}
                      </td>
                      {ENGLISH_CATEGORIES.map((category) => (
                        <td key={category.key} className="border-b border-[#edf2fa] px-3 py-3.5 align-top">
                          {isUnavailableCategory(editing ? editingType : record.practiceType, category.key)
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
                            <button type="button" onClick={() => { setEditingRecordId(null); setEditingPracticeTypes({}); }} className="mt-2 border border-line px-3 py-2 font-bold">取消</button>
                          </form>
                        ) : (
                          <button type="button" onClick={() => { setEditingRecordId(record.id); setEditingPracticeTypes((current) => ({ ...current, [record.id]: record.practiceType })); }} className="border border-line px-3 py-2 font-bold text-primary">修改</button>
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
                  <input name="practiceName" type="text" placeholder={ENGLISH_PRACTICE_NAME_HINTS[practiceTypeInput as EnglishPracticeType]} className="border border-line px-3 py-2.5" />
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

export default function EnglishPage() {
  return (
    <RequireAuth>
      <EnglishPageContent />
    </RequireAuth>
  );
}
