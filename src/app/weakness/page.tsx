"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { SUBJECTS } from "@/lib/data";
import { WEAKNESS_STATUSES } from "@/lib/learning-validation";
import type { WeaknessDTO, WeaknessStatus } from "@/lib/types";

const STATUS_LABELS: Record<WeaknessStatus, string> = {
  not_reviewed: "未複習",
  reviewing: "複習中",
  improving: "改善中",
  resolved: "已解決",
};
const SUBJECT_OPTIONS = [...SUBJECTS.map(({ key, label }) => ({ key, label })), { key: "other", label: "其他" }];

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function WeaknessContent() {
  const { user, track } = useAuth();
  const [weaknesses, setWeaknesses] = useState<WeaknessDTO[]>([]);
  const [filter, setFilter] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await authFetch(user, "/api/weaknesses");
    if (!response.ok) throw new Error("Unable to load weaknesses");
    setWeaknesses(await response.json());
    setLoadedUserId(user?.uid ?? null);
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(load).catch(() => setError("弱點資料載入失敗。"));
  }, [load]);

  async function create(form: HTMLFormElement) {
    if (saving) return;
    setSaving(true);
    setError("");
    const data = new FormData(form);
    const response = await authFetch(user, "/api/weaknesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(data.get("title") || ""),
        subject: String(data.get("subject") || "other"),
        topic: String(data.get("topic") || ""),
        discoveredAt: String(data.get("discoveredAt") || ""),
        errorDescription: String(data.get("errorDescription") || ""),
        reviewNotes: "",
        status: "not_reviewed",
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("新增弱點失敗，請確認標題及發現日期。");
      setSaving(false);
      return;
    }
    form.reset();
    try {
      await load();
    } catch {
      setError("弱點已儲存，但重新載入資料失敗。");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(item: WeaknessDTO, status: WeaknessStatus) {
    const response = await authFetch(user, "/api/weaknesses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("弱點狀態更新失敗。");
      return;
    }
    await load().catch(() => setError("狀態已更新，但重新載入失敗。"));
  }

  async function review(item: WeaknessDTO) {
    const response = await authFetch(user, "/api/weaknesses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, reviewNote: reviewNotes[item.id] ?? "" }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("複習紀錄儲存失敗。");
      return;
    }
    setReviewNotes((current) => ({ ...current, [item.id]: "" }));
    await load().catch(() => setError("複習已記錄，但重新載入失敗。"));
  }

  async function remove(item: WeaknessDTO) {
    const response = await authFetch(user, `/api/weaknesses?id=${encodeURIComponent(item.id)}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setError("弱點刪除失敗。");
      return;
    }
    setWeaknesses((current) => current.filter((entry) => entry.id !== item.id));
  }

  const visible = (loadedUserId === user?.uid && user ? weaknesses : []).filter((item) => !filter || item.status === filter);

  return (
    <div className="mobile-page">
      <header className="mobile-page-header">
        <p>Weakness Tracking</p>
        <h1>弱點管理</h1>
        <p className="text-muted">記錄反覆遇到的困難、安排複習並追蹤狀態。改善成效以實際紀錄為準。</p>
      </header>
      {error && <p className="dashboard-inline-error" role="status">{error}</p>}
      <section className="weakness-form-section">
        <h2>新增弱點</h2>
        <form className="weakness-form" onSubmit={(event) => { event.preventDefault(); void create(event.currentTarget); }}>
          <label>標題<input name="title" maxLength={150} required placeholder="例如：三角函數恆等式" /></label>
          <label>科目
            <select name="subject" defaultValue="math">
              {SUBJECT_OPTIONS.filter((subject) => track === "all" || !(track === "social" ? ["science"] : ["social", "mathB"]).includes(subject.key)).map((subject) => (
                <option key={subject.key} value={subject.key}>{subject.label}</option>
              ))}
            </select>
          </label>
          <label>主題 / 單元<input name="topic" maxLength={150} /></label>
          <label>發現日期<input name="discoveredAt" type="date" defaultValue={todayKey()} required /></label>
          <label className="weakness-form-wide">錯誤描述<textarea name="errorDescription" maxLength={2000} rows={3} /></label>
          <button type="submit" disabled={saving}>{saving ? "儲存中…" : "新增弱點"}</button>
        </form>
      </section>

      <section className="weakness-list-section">
        <div className="weakness-list-heading">
          <h2>追蹤清單</h2>
          <label>狀態篩選
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">全部狀態</option>
              {WEAKNESS_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
          </label>
        </div>
        {visible.length === 0 ? <p className="score-empty-state">目前沒有符合條件的弱點紀錄。</p> : (
          <div className="weakness-list">
            {visible.map((item) => (
              <article key={item.id} className="weakness-card">
                <div className="weakness-card-heading">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{SUBJECT_OPTIONS.find((subject) => subject.key === item.subject)?.label ?? item.subject}{item.topic ? ` · ${item.topic}` : ""} · 發現於 {item.discoveredAt}</p>
                  </div>
                  <select value={item.status} onChange={(event) => void updateStatus(item, event.target.value as WeaknessStatus)} aria-label={`${item.title} 狀態`}>
                    {WEAKNESS_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                  </select>
                </div>
                {item.errorDescription && <p>{item.errorDescription}</p>}
                {item.reviewNotes && <p>最近檢討：{item.reviewNotes}</p>}
                <form className="english-review-form" onSubmit={(event) => { event.preventDefault(); void review(item); }}>
                  <input value={reviewNotes[item.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={2000} placeholder="本次複習紀錄（選填）" aria-label="本次複習紀錄" />
                  <button type="submit">記錄複習</button>
                  <button type="button" className="weakness-delete-button" onClick={() => void remove(item)}>刪除</button>
                </form>
                {item.reviewHistory?.length > 0 && (
                  <details className="english-review-history">
                    <summary>複習歷程（{item.reviewHistory.length}）</summary>
                    <ul>{item.reviewHistory.map((entry) => <li key={entry.id}>{new Date(entry.reviewedAt).toLocaleDateString("zh-TW")} · {entry.note || "已複習"}</li>)}</ul>
                  </details>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function WeaknessPage() {
  return <RequireAuth><WeaknessContent /></RequireAuth>;
}
