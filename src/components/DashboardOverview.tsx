"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { formatScore } from "@/lib/data";
import type { ExamRecordDTO, GoalDTO, StudySessionDTO } from "@/lib/types";

interface WeeklyReport {
  period: { startDate: string; endDate: string };
  study: { totalMinutes: number; sessionCount: number; studyDays: number; minutesBySubject: Record<string, number> };
  english: { practiceCount: number; scoreRate: number | null; scoreRateChange: number | null };
  exams: { latest: { name: string; date: string; totalGrade: number | null } | null; change: number | null };
  topErrors: { label: string; count: number }[];
}

const SUBJECT_LABELS: Record<string, string> = {
  chinese: "國文",
  english: "英文",
  math: "數A",
  mathB: "數B",
  science: "自然",
  social: "社會",
  other: "其他",
};

export default function DashboardOverview() {
  const { user, track } = useAuth();
  const [records, setRecords] = useState<ExamRecordDTO[]>([]);
  const [goal, setGoal] = useState<GoalDTO | null>(null);
  const [sessions, setSessions] = useState<StudySessionDTO[]>([]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState("");
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      authFetch(user, "/api/exam-records"),
      authFetch(user, "/api/goals"),
      authFetch(user, "/api/study-sessions"),
      authFetch(user, "/api/weekly-report"),
    ])
      .then(async ([recordResponse, goalResponse, sessionResponse, reportResponse]) => {
        if ([recordResponse, goalResponse, sessionResponse, reportResponse].some((response) => !response.ok)) {
          throw new Error("Unable to load dashboard data");
        }
        const [recordData, goalData, sessionData, reportData] = await Promise.all([
          recordResponse.json(),
          goalResponse.json(),
          sessionResponse.json(),
          reportResponse.json(),
        ]);
        if (active) {
          setRecords(recordData);
          setGoal(goalData);
          setSessions(sessionData);
          setReport(reportData);
          setLoadedUserId(user.uid);
        }
      })
      .catch(() => {
        if (active) setError("總覽資料暫時無法載入，請稍後重試。");
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;
  const hasUserData = loadedUserId === user.uid;
  const latest = hasUserData ? records.at(-1) : undefined;
  const activeGoal = hasUserData ? goal : null;
  const activeReport = hasUserData ? report : null;
  const recentSessions = hasUserData ? sessions.slice(-3).reverse() : [];
  const mathGrades = [latest?.mathGrade, ...(track === "social" ? [latest?.mathBGrade] : [])]
    .filter((grade): grade is number => typeof grade === "number" && Number.isFinite(grade));
  const subjects = latest
    ? [
        ["國文", latest.chineseGrade],
        ["英文", latest.englishGrade],
        ["數學", mathGrades.length ? Math.max(...mathGrades) : null],
        [track === "social" ? "社會" : "自然", track === "social" ? latest.socialGrade : latest.scienceGrade],
      ].filter((item): item is [string, number] => typeof item[1] === "number" && Number.isFinite(item[1]))
    : [];
  const totalGap = latest && typeof activeGoal?.targetTotalGrade === "number" && typeof latest.totalGrade === "number"
    ? activeGoal.targetTotalGrade - latest.totalGrade
    : null;

  return (
    <section className="dashboard-overview" aria-labelledby="dashboard-overview-title">
      <div className="dashboard-overview-heading">
        <div>
          <p className="score-section-kicker">Your learning dashboard</p>
          <h2 id="dashboard-overview-title">學習近況</h2>
        </div>
        <div className="dashboard-overview-links">
          <Link href="/score">成績分析</Link>
          <Link href="/english">英文分析</Link>
          <Link href="/study">記錄讀書時間</Link>
          <Link href="/weakness">查看弱點</Link>
        </div>
      </div>
      {error && <p className="dashboard-inline-error" role="status">{error}</p>}
      <div className="dashboard-overview-grid">
        <article className="dashboard-overview-card">
          <span>最近一次考試</span>
          <strong>{latest?.totalGrade == null ? "—" : `${formatScore(latest.totalGrade)} 級`}</strong>
          <small>{latest ? `${latest.examName} · ${latest.examDate}` : "尚無考試紀錄"}</small>
          {latest && (
            <div className="dashboard-subject-list">
              {subjects.map(([label, value]) => <span key={label}>{label}<b>{formatScore(value)}</b></span>)}
            </div>
          )}
        </article>
        <article className="dashboard-overview-card">
          <span>總級分目標</span>
          <strong>{activeGoal?.targetTotalGrade == null ? "未設定" : `${formatScore(activeGoal.targetTotalGrade)} 級`}</strong>
          <small>{totalGap === null ? activeGoal?.goalName || "設定目標以查看差距" : totalGap > 0 ? `距離目標 ${formatScore(totalGap)} 級` : `已達標，超前 ${formatScore(Math.abs(totalGap))} 級`}</small>
          {activeGoal?.targetDate && <small>目標日期：{activeGoal.targetDate}</small>}
        </article>
        <article className="dashboard-overview-card">
          <span>本週讀書時間</span>
          <strong>{activeReport ? `${Math.floor(activeReport.study.totalMinutes / 60)} 小時 ${activeReport.study.totalMinutes % 60} 分` : "—"}</strong>
          <small>{activeReport ? `${activeReport.study.sessionCount} 次時段 · ${activeReport.study.studyDays} 個讀書日` : "新增讀書時段後顯示"}</small>
          {activeReport && Object.entries(activeReport.study.minutesBySubject).length > 0 && (
            <div className="dashboard-subject-list">
              {Object.entries(activeReport.study.minutesBySubject).map(([subject, minutes]) => (
                <span key={subject}>{SUBJECT_LABELS[subject] ?? subject}<b>{minutes} 分</b></span>
              ))}
            </div>
          )}
        </article>
      </div>
      <div className="dashboard-weekly-report">
        <div>
          <h3>近七日學習摘要</h3>
          <p>{activeReport ? `${activeReport.period.startDate} – ${activeReport.period.endDate}` : "報告載入中"}</p>
        </div>
        <p>
          英文練習 {activeReport?.english.practiceCount ?? "—"} 次
          {activeReport?.english.scoreRate === null || activeReport?.english.scoreRate === undefined
            ? " · 尚無可比較的得分率"
            : ` · 得分率 ${formatScore(activeReport.english.scoreRate)}%`}
        </p>
        {activeReport?.exams.latest && <p>最新考試：{activeReport.exams.latest.name}（{activeReport.exams.latest.totalGrade ?? "無總級分"} 級）</p>}
        {activeReport?.exams.change !== null && activeReport?.exams.change !== undefined && (
          <p>較前次總級分 {activeReport.exams.change > 0 ? "+" : ""}{formatScore(activeReport.exams.change)} 級</p>
        )}
        {activeReport?.topErrors.length ? <p>近期常見錯誤：{activeReport.topErrors.map((item) => `${item.label} ${item.count} 次`).join("、")}</p> : <p>尚無近期錯題分類資料。</p>}
        {activeReport?.english.scoreRateChange !== null && activeReport?.english.scoreRateChange !== undefined && (
          <p>英文得分率較前七日 {activeReport.english.scoreRateChange > 0 ? "+" : ""}{formatScore(activeReport.english.scoreRateChange)} 個百分點</p>
        )}
        <small>只呈現已記錄資料；得分率不等於正確率，讀書與成績的變化不代表因果關係。</small>
      </div>
      {recentSessions.length > 0 && (
        <p className="dashboard-recent-activity">
          最近讀書：{recentSessions.map((session) => `${session.studyDate} ${SUBJECT_LABELS[session.subject] ?? session.subject} ${session.minutes} 分`).join(" · ")}
        </p>
      )}
    </section>
  );
}
