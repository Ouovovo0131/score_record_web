"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { SUBJECTS } from "@/lib/data";
import type { StudySessionDTO } from "@/lib/types";

const SUBJECT_OPTIONS = [...SUBJECTS.map(({ key, label }) => ({ key, label })), { key: "other", label: "其他" }];

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function StudySessionTracker() {
  const { user, track } = useAuth();
  const [sessions, setSessions] = useState<StudySessionDTO[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const today = getTodayKey();
  const weekStart = useMemo(() => {
    const date = new Date(`${today}T00:00:00`);
    date.setDate(date.getDate() - 6);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }, [today]);

  const load = useCallback(async () => {
    const response = await authFetch(user, "/api/study-sessions");
    if (!response.ok) throw new Error("Unable to load sessions");
    setSessions(await response.json());
    setLoadedUserId(user?.uid ?? null);
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(load).catch(() => setError("讀書時段載入失敗。"));
  }, [load]);

  const visibleSessions = loadedUserId === user?.uid && user ? sessions : [];
  const weeklySessions = visibleSessions.filter((session) => session.studyDate >= weekStart && session.studyDate <= today);
  const totalMinutes = weeklySessions.reduce((sum, session) => sum + session.minutes, 0);
  const bySubject = weeklySessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.subject] = (acc[session.subject] ?? 0) + session.minutes;
    return acc;
  }, {});
  const maxSubjectMinutes = Math.max(1, ...Object.values(bySubject));
  const weeklyHistory = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(`${today}T00:00:00`);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (7 * (7 - index)));
    const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    const minutes = visibleSessions
      .filter((session) => session.studyDate >= startKey && session.studyDate <= endKey)
      .reduce((sum, session) => sum + session.minutes, 0);
    return { startKey, minutes };
  });
  const maxWeeklyMinutes = Math.max(1, ...weeklyHistory.map((week) => week.minutes));

  async function addSession(form: HTMLFormElement) {
    if (saving) return;
    setSaving(true);
    setError("");
    const data = new FormData(form);
    const response = await authFetch(user, "/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studyDate: String(data.get("studyDate") || ""),
        minutes: Number(data.get("minutes")),
        subject: String(data.get("subject") || "other"),
        note: String(data.get("note") || ""),
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("新增讀書時段失敗，請檢查日期與分鐘數。");
      setSaving(false);
      return;
    }
    form.reset();
    try {
      await load();
    } catch {
      setError("時段已儲存，但重新載入資料失敗。");
    } finally {
      setSaving(false);
    }
  }

  async function removeSession(session: StudySessionDTO) {
    const response = await authFetch(user, `/api/study-sessions?id=${encodeURIComponent(session.id)}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setError("刪除讀書時段失敗。");
      return;
    }
    setSessions((current) => current.filter((entry) => entry.id !== session.id));
  }

  return (
    <section className="study-session-section" aria-labelledby="study-session-title">
      <div className="english-section-heading">
        <div>
          <h2 id="study-session-title">讀書時數與科目分布</h2>
          <p>只統計實際新增的時段；舊的每日讀書標記不會被換算成時數。</p>
        </div>
        <strong className="num-display study-week-total">{Math.floor(totalMinutes / 60)} 小時 {totalMinutes % 60} 分 · 近七日</strong>
      </div>
      {error && <p className="dashboard-inline-error" role="status">{error}</p>}
      <form className="study-session-form" onSubmit={(event) => { event.preventDefault(); void addSession(event.currentTarget); }}>
        <label>日期<input name="studyDate" type="date" defaultValue={today} required /></label>
        <label>分鐘<input name="minutes" type="number" min={1} max={1440} step={1} required /></label>
        <label>科目
          <select name="subject" defaultValue="math">
            {SUBJECT_OPTIONS.filter((subject) => track === "all" || !(track === "social" ? ["science"] : ["social", "mathB"]).includes(subject.key)).map((subject) => (
              <option key={subject.key} value={subject.key}>{subject.label}</option>
            ))}
          </select>
        </label>
        <label className="study-session-note">備註<input name="note" maxLength={300} placeholder="複習範圍（選填）" /></label>
        <button type="submit" disabled={saving}>{saving ? "儲存中…" : "新增時段"}</button>
      </form>

      <div className="study-subject-breakdown">
        {Object.keys(bySubject).length ? Object.entries(bySubject).map(([key, minutes]) => {
          const label = SUBJECT_OPTIONS.find((subject) => subject.key === key)?.label ?? key;
          return (
            <div key={key}>
              <span>{label}</span><b>{minutes} 分</b>
              <div aria-hidden="true"><span style={{ width: `${(minutes / maxSubjectMinutes) * 100}%` }} /></div>
            </div>
          );
        }) : <p className="score-empty-state">近七日尚無讀書時段。</p>}
      </div>

      <div className="study-weekly-history" role="img" aria-label="最近八個日曆週的讀書分鐘數">
        {weeklyHistory.map((week) => (
          <div key={week.startKey} title={`${week.startKey} 起 · ${week.minutes} 分鐘`}>
            <span style={{ height: week.minutes ? `${Math.max(4, (week.minutes / maxWeeklyMinutes) * 100)}%` : "0%" }} />
            <small>{week.startKey.slice(5)}</small>
          </div>
        ))}
      </div>

      <ul className="study-session-list">
        {visibleSessions.slice().reverse().map((session) => (
          <li key={session.id}>
            <span>{session.studyDate} · {SUBJECT_OPTIONS.find((subject) => subject.key === session.subject)?.label ?? session.subject}</span>
            <strong>{session.minutes} 分</strong>
            <small>{session.note || "—"}</small>
            <button type="button" className="weakness-delete-button" onClick={() => void removeSession(session)}>刪除</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
