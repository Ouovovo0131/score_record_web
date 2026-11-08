"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { QUESTION_ERROR_CATEGORIES, QUESTION_REVIEW_STATUSES } from "@/lib/learning-validation";
import type { EnglishQuestionDTO, EnglishRecordDTO, QuestionReviewStatus } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  vocabulary: "詞彙不熟",
  grammar: "文法錯誤",
  context: "文意理解",
  careless: "粗心失誤",
  time_management: "時間管理",
  other: "其他",
};
const STATUS_LABELS: Record<QuestionReviewStatus, string> = {
  not_reviewed: "未複習",
  reviewing: "複習中",
  reviewed: "已複習",
};

export default function EnglishQuestionTracker({
  records,
  onSaved,
}: {
  records: EnglishRecordDTO[];
  onSaved: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<EnglishQuestionDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await authFetch(user, "/api/english-questions");
    if (!response.ok) throw new Error("Unable to load English questions");
    setQuestions(await response.json());
    setLoadedUserId(user?.uid ?? null);
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(load).catch(() => setError("錯題載入失敗，請稍後重試。"));
  }, [load]);

  const visibleQuestions = (loadedUserId === user?.uid && user ? questions : []).filter((question) =>
    (!statusFilter || question.reviewStatus === statusFilter) &&
    (!categoryFilter || question.errorCategory === categoryFilter)
  );

  async function submitQuestion(form: HTMLFormElement) {
    if (saving) return;
    setSaving(true);
    setError("");
    const data = new FormData(form);
    const response = await authFetch(user, "/api/english-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        englishRecordId: String(data.get("englishRecordId") || "") || null,
        questionIdentifier: String(data.get("questionIdentifier") || ""),
        questionContent: String(data.get("questionContent") || ""),
        userAnswer: String(data.get("userAnswer") || ""),
        correctAnswer: String(data.get("correctAnswer") || ""),
        errorCategory: String(data.get("errorCategory") || "other"),
        correctionNotes: String(data.get("correctionNotes") || ""),
        reviewStatus: "not_reviewed",
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("錯題新增失敗，請確認至少輸入題號或題目內容。");
      setSaving(false);
      return;
    }
    form.reset();
    try {
      await load();
      await onSaved();
    } catch {
      setError("錯題已儲存，但重新載入資料失敗。");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(question: EnglishQuestionDTO, nextStatus: QuestionReviewStatus) {
    setError("");
    const response = await authFetch(user, "/api/english-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: question.id, reviewStatus: nextStatus }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("複習狀態更新失敗。");
      return;
    }
    await load().catch(() => setError("狀態已更新，但重新載入失敗。"));
  }

  async function recordReview(question: EnglishQuestionDTO) {
    setError("");
    const response = await authFetch(user, "/api/english-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: question.id, reviewNote: reviewNotes[question.id] ?? "" }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("複習紀錄儲存失敗。");
      return;
    }
    setReviewNotes((current) => ({ ...current, [question.id]: "" }));
    await load().catch(() => setError("複習已記錄，但重新載入失敗。"));
  }

  async function remove(question: EnglishQuestionDTO) {
    const response = await authFetch(user, `/api/english-questions?id=${encodeURIComponent(question.id)}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setError("錯題刪除失敗。");
      return;
    }
    setQuestions((current) => current.filter((entry) => entry.id !== question.id));
  }

  return (
    <section className="english-question-section" aria-labelledby="english-question-title">
      <div className="english-section-heading">
        <div>
          <h2 id="english-question-title">錯題與複習紀錄</h2>
          <p>只追蹤你手動記錄的錯題；不會由練習總分推測題目或答案。</p>
        </div>
        <div className="english-question-filters">
          <label>複習狀態
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部</option>
              {QUESTION_REVIEW_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
          </label>
          <label>錯誤分類
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">全部</option>
              {QUESTION_ERROR_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
            </select>
          </label>
        </div>
      </div>
      {error && <p className="dashboard-inline-error" role="status">{error}</p>}
      <form className="english-question-form" onSubmit={(event) => { event.preventDefault(); void submitQuestion(event.currentTarget); }}>
        <label>相關練習（選填）
          <select name="englishRecordId" defaultValue="">
            <option value="">不連結</option>
            {records.map((record) => <option key={record.id} value={record.id}>{record.practiceDate} · {record.practiceName}</option>)}
          </select>
        </label>
        <label>題號 / 識別
          <input name="questionIdentifier" maxLength={100} placeholder="例如：第 4 回第 12 題" />
        </label>
        <label>題目內容
          <textarea name="questionContent" maxLength={2000} rows={2} placeholder="可簡述題幹或關鍵資訊" />
        </label>
        <label>錯誤分類
          <select name="errorCategory" defaultValue="other">
            {QUESTION_ERROR_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
          </select>
        </label>
        <label>我的答案<input name="userAnswer" maxLength={500} /></label>
        <label>正確答案<input name="correctAnswer" maxLength={500} /></label>
        <label className="english-question-form-wide">訂正 / 解題筆記
          <textarea name="correctionNotes" maxLength={2000} rows={2} />
        </label>
        <button type="submit" disabled={saving}>{saving ? "儲存中…" : "新增錯題"}</button>
      </form>

      <div className="english-question-list">
        {visibleQuestions.length === 0 ? <p className="score-empty-state">目前沒有符合條件的錯題紀錄。</p> : visibleQuestions.map((question) => (
          <article key={question.id} className="english-question-card">
            <div className="english-question-card-heading">
              <div>
                <strong>{question.questionIdentifier || "錯題"}</strong>
                <span>{CATEGORY_LABELS[question.errorCategory] ?? question.errorCategory}</span>
              </div>
              <select value={question.reviewStatus} onChange={(event) => void updateStatus(question, event.target.value as QuestionReviewStatus)} aria-label="複習狀態">
                {QUESTION_REVIEW_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
            </div>
            {question.questionContent && <p>{question.questionContent}</p>}
            <p>我的答案：{question.userAnswer || "未記錄"} · 正確答案：{question.correctAnswer || "未記錄"}</p>
            {question.correctionNotes && <p>訂正：{question.correctionNotes}</p>}
            <form className="english-review-form" onSubmit={(event) => { event.preventDefault(); void recordReview(question); }}>
              <input value={reviewNotes[question.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={2000} placeholder="本次複習心得（選填）" aria-label="本次複習心得" />
              <button type="submit">記錄複習</button>
              <button type="button" className="weakness-delete-button" onClick={() => void remove(question)}>刪除</button>
            </form>
            {question.reviewHistory?.length > 0 && (
              <details className="english-review-history">
                <summary>複習歷程（{question.reviewHistory.length}）</summary>
                <ul>{question.reviewHistory.map((review) => <li key={review.id}>{new Date(review.reviewedAt).toLocaleDateString("zh-TW")} · {review.note || "已複習"}</li>)}</ul>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
