// Countdown/schedule helper functions ported from legacy-static-site/countdown.js.

import { FixedSchedule, formatDate } from "./data";

export type SchedulePhase = "upcoming" | "active" | "completed";

export interface ScheduleState {
  phase: SchedulePhase;
  diffMs: number;
  totalDays?: number;
  currentDay?: number;
  start: Date;
  end: Date;
}

export function parseStartDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00`);
}

export function parseEndDate(dateString: string): Date {
  return new Date(`${dateString}T23:59:59`);
}

export function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getScheduleState(schedule: FixedSchedule, now: Date): ScheduleState {
  const start = parseStartDate(schedule.startDate);
  const end = parseEndDate(schedule.endDate || schedule.startDate);

  if (now < start) {
    return { phase: "upcoming", diffMs: start.getTime() - now.getTime(), start, end };
  }

  if (now <= end) {
    const totalDays = Math.floor((stripTime(end).getTime() - stripTime(start).getTime()) / 86400000) + 1;
    const currentDay = Math.floor((stripTime(now).getTime() - stripTime(start).getTime()) / 86400000) + 1;
    return { phase: "active", diffMs: end.getTime() - now.getTime(), totalDays, currentDay, start, end };
  }

  return { phase: "completed", diffMs: 0, start, end };
}

export function formatScheduleRange(schedule: FixedSchedule): string {
  const startLabel = formatDate(schedule.startDate);
  const endValue = schedule.endDate || schedule.startDate;
  if (endValue === schedule.startDate) {
    return startLabel;
  }
  return `${startLabel} - ${formatDate(endValue)}`;
}

export function formatDurationShort(diffMs: number): string {
  const totalSeconds = Math.floor(Math.max(diffMs, 0) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) {
    return `${days} 天 ${hours} 小時`;
  }
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours} 小時 ${minutes} 分`;
}

export function padTime(value: number): string {
  return String(value).padStart(2, "0");
}

export function getPrimarySchedule(schedules: FixedSchedule[]): FixedSchedule | null {
  const now = new Date();
  return (
    schedules.find((schedule) => getScheduleState(schedule, now).phase === "active") ||
    schedules.find((schedule) => getScheduleState(schedule, now).phase === "upcoming") ||
    schedules.at(-1) ||
    null
  );
}
