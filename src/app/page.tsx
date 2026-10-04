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
import { FIXED_SCHEDULES, type FixedSchedule } from "@/lib/data";

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
    <section className={`mobile-panel overflow-hidden border border-line bg-ink text-white ${className ?? ""}`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-white/20 px-2.5 py-1 text-sm font-bold">{badge}</span>
          <h2 className="text-2xl font-extrabold sm:text-3xl">{schedule.name}</h2>
        </div>
        <p className="mt-2 text-white/85">{subtitle}</p>

        <div className="mobile-countdown-grid mt-5 grid grid-cols-4 gap-3">
          {[
            { value: units.days, label: "天" },
            { value: units.hours, label: "時" },
            { value: units.minutes, label: "分" },
            { value: units.seconds, label: "秒" },
          ].map((unit) => (
            <div key={unit.label} className="mobile-countdown-unit bg-white/15 p-3 text-center">
              <strong className="num-display block text-3xl sm:text-5xl">{unit.value}</strong>
              <span>{unit.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm text-white/80">
            <span>{state.phase === "active" ? "考試進度" : completed ? "已完成" : prev ? `自${prev.name}後` : "備考進度"}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mt-1.5 h-2 bg-white/20">
            <div className="h-full bg-white" style={{ width: `${progress}%` }} />
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
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

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