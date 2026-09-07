"use client";

import { useEffect, useState } from "react";
import {
  formatDurationShort,
  formatScheduleRange,
  getPrimarySchedule,
  getScheduleState,
  padTime,
} from "@/lib/countdown";
import { FIXED_SCHEDULES } from "@/lib/data";

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

export default function CountdownPage() {
  const now = useNow(1000);

  if (!now) {
    return null;
  }

  const primarySchedule = getPrimarySchedule(FIXED_SCHEDULES);
  const scheduleState = primarySchedule ? getScheduleState(primarySchedule, now) : null;

  let title = "目前沒有考程";
  let subtitle = "尚未提供任何考試資料。";
  let days = "--";
  let hours = "--";
  let minutes = "--";
  let seconds = "--";

  if (primarySchedule && scheduleState) {
    if (scheduleState.phase === "active") {
      title = `${primarySchedule.name} 進行中`;
      subtitle = `${formatScheduleRange(primarySchedule)} · 第 ${scheduleState.currentDay} / ${scheduleState.totalDays} 天`;
      ({ days, hours, minutes, seconds } = splitMs(scheduleState.diffMs));
    } else if (scheduleState.phase === "completed") {
      title = `${primarySchedule.name} 已結束`;
      subtitle = formatScheduleRange(primarySchedule);
      days = "0";
      hours = "0";
      minutes = "0";
      seconds = "0";
    } else {
      title = `${primarySchedule.name} 倒數`;
      subtitle = formatScheduleRange(primarySchedule);
      ({ days, hours, minutes, seconds } = splitMs(scheduleState.diffMs));
    }
  }

  return (
    <div className="mx-auto w-[min(1240px,calc(100%-32px))] py-8 pb-14">
      <div className="mb-6 border-b-4 border-ink bg-white py-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">
          Exam Schedule Countdown
        </p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">考程倒數</h1>
        <p className="mt-2 max-w-2xl text-muted">
          這一頁只顯示目前固定的考程安排，會自動對最近一場尚未結束的考試倒數。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <section className="border border-line bg-white p-5 md:col-span-12">
          <h2 className="text-xl font-bold">最近一場考試</h2>
          <p className="mt-1 text-muted">已結束的考試會保留在下方考程列表中。</p>

          <div className="mt-4 bg-ink p-5 text-white">
            <p className="mb-4 text-lg font-bold">{title}</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: days, label: "天" },
                { value: hours, label: "時" },
                { value: minutes, label: "分" },
                { value: seconds, label: "秒" },
              ].map((unit) => (
                <div key={unit.label} className="bg-white/15 p-3 text-center">
                  <strong className="num-display block text-3xl sm:text-4xl">{unit.value}</strong>
                  <span>{unit.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-white/85">{subtitle}</p>
          </div>
        </section>

        <section className="border border-line bg-white p-5 md:col-span-12">
          <h2 className="text-xl font-bold">固定考程列表</h2>
          <p className="mt-1 text-muted">目前只顯示你提供的考試，不提供新增或編輯功能。</p>

          <div className="mt-4 flex flex-col gap-3">
            {FIXED_SCHEDULES.map((schedule) => {
              const state = getScheduleState(schedule, now);
              const statusText =
                state.phase === "upcoming"
                  ? `距離開始還有 ${formatDurationShort(state.diffMs)}`
                  : state.phase === "active"
                    ? `考試進行中，第 ${state.currentDay} / ${state.totalDays} 天`
                    : "已結束";

              return (
                <article key={schedule.id} className="border border-line bg-white p-4">
                  <p className="text-base font-bold">{schedule.name}</p>
                  <p className="mt-1 text-muted">{formatScheduleRange(schedule)}</p>
                  <p className="mt-2 font-semibold text-primary">{statusText}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function splitMs(diffMs: number) {
  const safeMs = Math.max(diffMs, 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days: String(days),
    hours: padTime(hours),
    minutes: padTime(minutes),
    seconds: padTime(seconds),
  };
}
