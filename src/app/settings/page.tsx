"use client";

import { useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth-fetch";

const EXPORT_DATASETS = [
  { key: "exam-records", label: "模擬考成績" },
  { key: "english-records", label: "英文練習成績" },
  { key: "study-logs", label: "每日讀書標記" },
  { key: "study-sessions", label: "讀書時段" },
  { key: "english-questions", label: "英文錯題與複習歷程" },
  { key: "weaknesses", label: "弱點與複習歷程" },
] as const;

function SettingsContent() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function download(format: "json" | "csv", dataset?: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const params = new URLSearchParams({ format });
    if (dataset) params.set("dataset", dataset);
    const response = await authFetch(user, `/api/export?${params}`).catch(() => null);
    if (!response?.ok) {
      setMessage(response ? `匯出失敗（HTTP ${response.status}），請稍後再試。` : "無法連線匯出資料。");
      setBusy(false);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = format === "json" ? "study-backup.json" : `${dataset}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("匯出檔案已下載。");
    setBusy(false);
  }

  return (
    <div className="mobile-page">
      <header className="mobile-page-header">
        <p>Settings & Data</p>
        <h1>設定與資料管理</h1>
        <p className="text-muted">檢視帳戶與學習目標，並下載個人資料備份。</p>
      </header>
      <section className="settings-section">
        <h2>學習目標</h2>
        <p>總級分、科目級分、英文題目正確率與目標日期目前集中於成績統計頁管理。</p>
        <Link href="/score#goal-settings" className="score-primary-button">前往目標設定</Link>
      </section>
      <section className="settings-section">
        <h2>資料匯出與備份</h2>
        <p>JSON 備份包含目前登入帳戶的成績、練習、讀書紀錄、錯題、弱點、目標與複習歷程。CSV 可逐類下載。</p>
        <button type="button" className="score-primary-button" disabled={busy} onClick={() => void download("json")}>
          {busy ? "準備中…" : "下載完整 JSON 備份"}
        </button>
        <div className="settings-export-list">
          {EXPORT_DATASETS.map((dataset) => (
            <div key={dataset.key}>
              <span>{dataset.label}</span>
              <button type="button" disabled={busy} onClick={() => void download("csv", dataset.key)}>下載 CSV</button>
            </div>
          ))}
        </div>
        {message && <p className="dashboard-inline-error" role="status">{message}</p>}
      </section>
      <section className="settings-section">
        <h2>帳戶與隱私</h2>
        <p>匯出僅限目前登入者自己的資料；請妥善保管下載檔案。</p>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return <RequireAuth><SettingsContent /></RequireAuth>;
}
