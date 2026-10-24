"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatDurationShort,
  formatScheduleRange,
  getPrimarySchedule,
  getScheduleState,
  padTime,
  parseEndDate,
  parseStartDate,
  stripTime,
} from "@/lib/countdown";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { FIXED_SCHEDULES, SUBJECTS, type FixedSchedule } from "@/lib/data";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const DAY_MS = 86400000;

function useNow(intervalMs: number) {
  // Start as null so the server-rendered markup matches the client's first
  // render, then switch to a live clock once mounted (avoids hydration
  // mismatches from using `new Date()` as an initializer).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial tick needed to start the live clock immediately
    setNow(new Date());
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((stripTime(to).getTime() - stripTime(from).getTime()) / DAY_MS);
}

function scheduleDays(schedule: FixedSchedule): string[] {
  const start = stripTime(parseStartDate(schedule.startDate));
  const end = stripTime(parseEndDate(schedule.endDate || schedule.startDate));
  const keys: string[] = [];
  for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    keys.push(toKey(d));
  }
  return keys;
}

function splitMs(diffMs: number) {
  const totalSeconds = Math.floor(Math.max(diffMs, 0) / 1000);
  return {
    days: String(Math.floor(totalSeconds / 86400)),
    hours: padTime(Math.floor((totalSeconds % 86400) / 3600)),
    minutes: padTime(Math.floor((totalSeconds % 3600) / 60)),
    seconds: padTime(totalSeconds % 60),
  };
}

type ViewMode = "list" | "calendar";

interface StudyTask {
  id: string;
  title: string;
  subject: string;
  kind: "exam" | "review";
  startDate: string;
  endDate: string;
  note: string;
  done: boolean;
}

const SUBJECT_COLORS: Record<string, string> = { chinese: "#747fa2", english: "#657e91", math: "#5b62a8", mathB: "#718c94", science: "#7b7896", social: "#8c806f" };

const TASK_SUBJECTS = [
  ...SUBJECTS.map((s) => ({ key: s.key as string, label: s.label, color: SUBJECT_COLORS[s.key] })),
  { key: "other", label: "其他", color: "#6b7280" },
];

function subjectMeta(key: string) {
  return TASK_SUBJECTS.find((s) => s.key === key) ?? TASK_SUBJECTS[TASK_SUBJECTS.length - 1];
}

// Exams sort above reviews; ties keep the chronological order from the API.
function sortByKind(list: StudyTask[]): StudyTask[] {
  return [...list].sort((a, b) => Number(b.kind === "exam") - Number(a.kind === "exam"));
}

function taskCoversDay(task: StudyTask, key: string) {
  return task.startDate <= key && key <= task.endDate;
}

export default function CountdownPage() {
  const now = useNow(1000);
  const [view, setView] = useState<ViewMode>("calendar");

  if (!now) {
    return null;
  }

  const primary = getPrimarySchedule(FIXED_SCHEDULES);
  const primaryState = primary ? getScheduleState(primary, now) : null;
  const upcoming = FIXED_SCHEDULES.filter((s) => getScheduleState(s, now).phase !== "completed");
  const finished = FIXED_SCHEDULES.length - upcoming.length;

  return (
    <div className="mobile-page">
      <div className="mobile-page-header mb-6 border-b-4 border-ink bg-white py-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Exam Schedule Countdown</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">考程倒數</h1>
        <p className="mt-2 max-w-2xl text-muted">自動對最近一場尚未結束的考試倒數，並可用月曆檢視整體考程。</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <HeroCountdown schedule={primary} state={primaryState} now={now} className="md:col-span-8" />

        <section className="mobile-panel border border-line bg-white p-5 md:col-span-4">
          <h2 className="text-xl font-bold">考程總覽</h2>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "全部", value: FIXED_SCHEDULES.length },
              { label: "已結束", value: finished },
              { label: "待考", value: upcoming.length },
            ].map((item) => (
              <div key={item.label} className="bg-[#f9fafb] p-3">
                <dd className="num-display text-3xl font-extrabold">{item.value}</dd>
                <dt className="text-sm text-muted">{item.label}</dt>
              </div>
            ))}
          </dl>
          <ul className="mt-4 space-y-2 text-sm">
            {upcoming.slice(0, 3).map((s) => {
              const state = getScheduleState(s, now);
              const left = state.phase === "active" ? "進行中" : `${daysBetween(now, state.start)} 天後`;
              return (
                <li key={s.id} className="flex justify-between gap-2 border-b border-[#edf2fa] pb-2">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-primary">{left}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mobile-panel border border-line bg-white p-5 md:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">考程檢視</h2>
            <div className="flex gap-2" role="tablist" aria-label="檢視方式">
              {(
                [
                  { key: "calendar", label: "月曆" },
                  { key: "list", label: "列表" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={view === tab.key}
                  onClick={() => setView(tab.key)}
                  className={`border px-4 py-2 font-bold ${view === tab.key ? "border-primary bg-primary text-white" : "border-line bg-white text-primary"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {view === "calendar" ? <CalendarView now={now} /> : <ListView now={now} />}
          </div>
        </section>
      </div>
    </div>
  );
}

function HeroCountdown({
  schedule,
  state,
  now,
  className,
}: {
  schedule: FixedSchedule | null;
  state: ReturnType<typeof getScheduleState> | null;
  now: Date;
  className?: string;
}) {
  if (!schedule || !state) {
    return (
      <section className={`mobile-panel border border-line bg-white p-5 ${className ?? ""}`}>
        <h2 className="text-xl font-bold">目前沒有考程</h2>
      </section>
    );
  }

  const index = FIXED_SCHEDULES.findIndex((s) => s.id === schedule.id);
  const prev = index > 0 ? FIXED_SCHEDULES[index - 1] : null;
  const completed = state.phase === "completed";
  const units = completed ? splitMs(0) : splitMs(state.diffMs);

  // Progress from the previous exam's end (or 60 days ahead) to this exam's start.
  let progress = 100;
  if (state.phase === "upcoming") {
    const from = prev ? parseEndDate(prev.endDate || prev.startDate).getTime() : state.start.getTime() - 60 * DAY_MS;
    progress = Math.min(100, Math.max(0, ((now.getTime() - from) / (state.start.getTime() - from)) * 100));
  } else if (state.phase === "active") {
    progress = Math.min(100, Math.max(0, ((now.getTime() - state.start.getTime()) / (state.end.getTime() - state.start.getTime())) * 100));
  }

  const badge = state.phase === "active" ? "進行中" : completed ? "已結束" : "下一場";
  const subtitle =
    state.phase === "active"
      ? `${formatScheduleRange(schedule)} · 第 ${state.currentDay} / ${state.totalDays} 天`
      : formatScheduleRange(schedule);

  return (
    <section className={`mobile-panel countdown-hero overflow-hidden border border-line ${className ?? ""}`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="countdown-badge px-2.5 py-1 text-sm font-bold">{badge}</span>
          <h2 className="text-2xl font-extrabold sm:text-3xl">{schedule.name}</h2>
        </div>
        <p className="mt-2">{subtitle}</p>

        <div className="mobile-countdown-grid mt-5 grid grid-cols-4 gap-3">
          {[
            { value: units.days, label: "天" },
            { value: units.hours, label: "時" },
            { value: units.minutes, label: "分" },
            { value: units.seconds, label: "秒" },
          ].map((unit) => (
            <div key={unit.label} className="mobile-countdown-unit p-3 text-center">
              <strong className="num-display block text-3xl sm:text-5xl">{unit.value}</strong>
              <span>{unit.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="countdown-progress-label flex justify-between text-sm">
            <span>{state.phase === "active" ? "考試進度" : completed ? "已完成" : prev ? `自${prev.name}後` : "備考進度"}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="countdown-progress-track mt-1.5 h-2 rounded-full">
            <div className="h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ListView({ now }: { now: Date }) {
  return (
    <ol className="relative flex flex-col gap-3 border-l-2 border-line pl-5">
      {FIXED_SCHEDULES.map((schedule) => {
        const state = getScheduleState(schedule, now);
        const statusText =
          state.phase === "upcoming"
            ? `距離開始還有 ${formatDurationShort(state.diffMs)}`
            : state.phase === "active"
              ? `考試進行中，第 ${state.currentDay} / ${state.totalDays} 天`
              : "已結束";
        const dot = state.phase === "active" ? "bg-[#20a16b]" : state.phase === "upcoming" ? "bg-primary" : "bg-[#b6bfce]";

        return (
          <li key={schedule.id} className={`relative border border-line p-4 ${state.phase === "completed" ? "bg-[#f9fafb] text-muted" : "bg-white"}`}>
            <span className={`absolute -left-[27px] top-5 h-3 w-3 rounded-full ${dot}`} />
            <p className="text-base font-bold">{schedule.name}</p>
            <p className="mt-1 text-muted">{formatScheduleRange(schedule)}</p>
            <p className={`mt-2 font-semibold ${state.phase === "completed" ? "" : "text-primary"}`}>{statusText}</p>
          </li>
        );
      })}
    </ol>
  );
}

function CalendarView({ now }: { now: Date }) {
  const { user, track } = useAuth();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [taskError, setTaskError] = useState("");
  const [form, setForm] = useState({ kind: "review" as "exam" | "review", title: "", subject: "math", endDate: "", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authFetch(user, "/api/study-tasks")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: StudyTask[]) => {
        if (!cancelled) setTasks(data);
      })
      .catch(() => {
        if (!cancelled) setTaskError("無法載入複習事項（請確認資料表已建立）");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function addTask() {
    if (!selected || !form.title.trim() || saving) return;
    setSaving(true);
    setTaskError("");
    try {
      const res = await authFetch(user, "/api/study-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: form.kind, title: form.title, subject: form.subject, startDate: selected, endDate: form.endDate || selected, note: form.note }),
      });
      if (!res.ok) throw new Error("save failed");
      const created: StudyTask = await res.json();
      setTasks((prev) => [...prev, created].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setForm((f) => ({ ...f, title: "", endDate: "", note: "" }));
    } catch {
      setTaskError("新增失敗，請確認結束日期不早於開始日期");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: StudyTask) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    const res = await authFetch(user, "/api/study-tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, done: !task.done }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      setTaskError("更新失敗");
    }
  }

  async function removeTask(task: StudyTask) {
    const res = await authFetch(user, `/api/study-tasks?id=${encodeURIComponent(task.id)}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) setTasks((prev) => prev.filter((t) => t.id !== task.id));
    else setTaskError("刪除失敗");
  }

  const byDay = useMemo(() => {
    const map = new Map<string, FixedSchedule[]>();
    FIXED_SCHEDULES.forEach((s) => scheduleDays(s).forEach((key) => map.set(key, [...(map.get(key) ?? []), s])));
    return map;
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = toKey(now);
  const selectedList = selected ? byDay.get(selected) ?? [] : [];
  const selectedTasks = selected ? sortByKind(tasks.filter((t) => taskCoversDay(t, selected))) : [];
  const monthSchedules = FIXED_SCHEDULES.filter((s) => scheduleDays(s).some((k) => k.startsWith(`${year}-${padTime(month + 1)}`)));

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="上個月" className="border border-line px-3 py-1.5 font-bold text-primary">
          ‹
        </button>
        <div className="flex items-center gap-3">
          <strong className="text-lg">
            {year} 年 {month + 1} 月
          </strong>
          <button
            type="button"
            onClick={() => {
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelected(todayKey);
            }}
            className="border border-line px-2.5 py-1 text-sm font-bold text-primary"
          >
            今天
          </button>
        </div>
        <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="下個月" className="border border-line px-3 py-1.5 font-bold text-primary">
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px border border-line bg-line text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-[#f9fafb] py-1.5 text-sm font-bold text-muted">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="min-h-14 bg-[#fcfcfd] sm:min-h-20" />;
          const key = `${year}-${padTime(month + 1)}-${padTime(day)}`;
          const items = byDay.get(key) ?? [];
          const dayTasks = sortByKind(tasks.filter((t) => taskCoversDay(t, key)));
          const isToday = key === todayKey;
          const isSelected = key === selected;
          const past = key < todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(isSelected ? null : key)}
              className={`min-h-14 bg-white p-1 text-left align-top sm:min-h-20 sm:p-1.5 ${isSelected ? "outline outline-2 -outline-offset-2 outline-primary" : ""}`}
            >
              <span className={`inline-grid h-6 w-6 place-items-center text-sm ${isToday ? "bg-ink font-bold text-white" : past ? "text-muted" : ""}`}>{day}</span>
              {items.map((s) => (
                <span
                  key={s.id}
                  className={`mt-0.5 block truncate px-1 text-[11px] font-bold leading-5 sm:text-xs ${past ? "bg-[#e5e9f0] text-muted" : "bg-primary text-white"}`}
                >
                  {s.name}
                </span>
              ))}
              {dayTasks.slice(0, 2).map((t) => (
                <span
                  key={t.id}
                  style={t.done ? undefined : { backgroundColor: subjectMeta(t.subject).color }}
                  className={`mt-0.5 block truncate px-1 text-[11px] leading-5 sm:text-xs ${t.kind === "exam" ? "font-bold" : ""} ${t.done ? "bg-[#e5e9f0] text-muted line-through" : "text-white"}`}
                >
                  {t.kind === "exam" ? "考 " : ""}{t.title}
                </span>
              ))}
              {dayTasks.length > 2 ? <span className="block text-[11px] text-muted">+{dayTasks.length - 2}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border border-line bg-[#f9fafb] p-4">
        {selected ? (
          <>
            <p className="font-bold">{selected}</p>
            {selectedList.length ? (
              selectedList.map((s) => {
                const state = getScheduleState(s, now);
                return (
                  <p key={s.id} className="mt-1 text-muted">
                    {s.name} · {formatScheduleRange(s)} ·{" "}
                    {state.phase === "completed" ? "已結束" : state.phase === "active" ? "進行中" : `還有 ${daysBetween(now, state.start)} 天`}
                  </p>
                );
              })
            ) : (
              <p className="mt-1 text-muted">這天沒有考試。</p>
            )}

            <div className="mt-3 border-t border-line pt-3">
              <p className="font-bold">考試 / 複習事項</p>
              {selectedTasks.length ? (
                <ul className="mt-2 space-y-2">
                  {selectedTasks.map((t) => {
                    const meta = subjectMeta(t.subject);
                    return (
                      <li key={t.id} className="flex items-start gap-2 bg-white p-2">
                        <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} aria-label={`完成 ${t.title}`} className="mt-1.5 h-4 w-4" />
                        <div className="min-w-0 flex-1">
                          <p className={t.done ? "text-muted line-through" : ""}>
                            <span className={`mr-1 px-1.5 py-0.5 text-xs font-bold ${t.kind === "exam" ? "bg-ink text-white" : "border border-line text-muted"}`}>
                              {t.kind === "exam" ? "考試" : "複習"}
                            </span>
                            <span className="mr-2 px-1.5 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: meta.color }}>
                              {meta.label}
                            </span>
                            {t.title}
                          </p>
                          <p className="text-xs text-muted">
                            {t.startDate === t.endDate ? t.startDate : `${t.startDate} ~ ${t.endDate}`}
                            {t.note ? ` · ${t.note}` : ""}
                          </p>
                        </div>
                        <button type="button" onClick={() => removeTask(t)} className="px-2 text-sm font-bold text-muted hover:text-ink" aria-label={`刪除 ${t.title}`}>
                          刪除
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-muted">這天沒有考試或複習事項。</p>
              )}

              <form
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addTask();
                }}
              >
                <div className="flex gap-1 sm:col-span-6" role="radiogroup" aria-label="類型">
                  {(
                    [
                      { key: "exam", label: "考試" },
                      { key: "review", label: "複習" },
                    ] as const
                  ).map((k) => (
                    <button key={k.key} type="button" role="radio" aria-checked={form.kind === k.key} onClick={() => setForm({ ...form, kind: k.key })} className={`border px-4 py-1.5 font-bold ${form.kind === k.key ? "border-primary bg-primary text-white" : "border-line bg-white text-primary"}`}>
                      {k.label}
                    </button>
                  ))}
                </div>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="border border-line bg-white p-2 sm:col-span-1" aria-label="科目">
                  {TASK_SUBJECTS.filter((s) => track === "all" || !(track === "social" ? ["science"] : ["social", "mathB"]).includes(s.key)).map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} placeholder="複習範圍，例如：第三章 三角函數" className="border border-line bg-white p-2 sm:col-span-3" aria-label="事項" />
                <label className="flex items-center gap-1 text-sm text-muted sm:col-span-2">
                  到
                  <input type="date" min={selected} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="min-w-0 flex-1 border border-line bg-white p-2" aria-label="結束日期（可留空）" />
                </label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={300} placeholder="備註（選填）" className="border border-line bg-white p-2 sm:col-span-5" aria-label="備註" />
                <button type="submit" disabled={saving || !form.title.trim()} className="bg-primary p-2 font-bold text-white disabled:opacity-50 sm:col-span-1">
                  新增
                </button>
              </form>
              {taskError ? <p className="mt-2 text-sm text-[#dc2626]">{taskError}</p> : null}
            </div>
          </>
        ) : monthSchedules.length ? (
          monthSchedules.map((s) => (
            <p key={s.id} className="text-muted">
              <strong className="text-ink">{s.name}</strong> · {formatScheduleRange(s)}
            </p>
          ))
        ) : (
          <p className="text-muted">這個月沒有考試，點選日期可查看詳情。</p>
        )}
      </div>
    </div>
  );
}