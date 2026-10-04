"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";

interface StudyLogDTO {
  date: string;
  note: string;
}

const CELL = 16;
const GAP = 3;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function computeStreaks(days: Set<string>, today: Date) {
  let current = 0;
  // Today not studied yet doesn't break the streak; it still counts from yesterday.
  let cursor = days.has(toKey(today)) ? today : addDays(today, -1);
  while (days.has(toKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let prevKey: string | null = null;
  for (const key of [...days].sort()) {
    const [y, m, d] = key.split("-").map(Number);
    const previousDay: string = toKey(new Date(y, m - 1, d - 1));
    run = prevKey === previousDay ? run + 1 : 1;
    longest = Math.max(longest, run);
    prevKey = key;
  }
  return { current, longest };
}

function StudyPageContent() {
  const [logs, setLogs] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [today] = useState(() => new Date());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [selected, setSelected] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    fetch("/api/study-logs")
      .then((r) => r.json())
      .then((data: StudyLogDTO[]) => setLogs(new Map(data.map((l) => [l.date, l.note]))))
      .catch(() => setStatus("讀取資料失敗，請稍後再試。"))
      .finally(() => setLoading(false));
  }, []);

  const todayKey = toKey(today);
  const days = useMemo(() => new Set(logs.keys()), [logs]);

  const weeks = useMemo(() => {
    const first = new Date(year, 0, 1);
    const start = addDays(first, -first.getDay());
    const last = new Date(year, 11, 31);
    const count = Math.ceil((last.getTime() - start.getTime()) / 86400000 / 7) + 1;
    return Array.from({ length: count }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  }, [year]);

  const stats = useMemo(() => {
    const { current, longest } = computeStreaks(days, today);
    const weekStart = addDays(today, -today.getDay());
    let week = 0;
    for (let i = 0; i < 7; i += 1) {
      if (days.has(toKey(addDays(weekStart, i)))) week += 1;
    }
    const monthPrefix = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    const month = [...days].filter((k) => k.startsWith(monthPrefix)).length;
    const yearTotal = [...days].filter((k) => k.startsWith(`${year}-`)).length;
    return { current, longest, week, month, monthDays: today.getDate(), yearTotal };
  }, [days, today, year]);

  async function save(date: string, studied: boolean, note?: string) {
    const previous = logs;
    const next = new Map(logs);
    if (studied) next.set(date, note ?? logs.get(date) ?? "");
    else next.delete(date);
    setLogs(next);
    setStatus(null);

    const res = await fetch("/api/study-logs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, studied, note }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setLogs(previous);
      setStatus("儲存失敗，請稍後再試。");
    }
  }

  function handleCellClick(key: string) {
    if (key > todayKey) return;
    setSelected(key);
    setNoteDraft("");
    save(key, !days.has(key));
  }

  const selectedStudied = selected ? days.has(selected) : false;

  return (
    <div className="mobile-page">
      <div className="mobile-page-header mb-6 border-b-4 border-ink bg-white py-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Study Tracker</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">讀書紀錄</h1>
        <p className="mt-2 max-w-2xl text-muted">點選日期格子標記當天有讀書，格子填色代表有讀；也可以補登過去的日子。</p>
      </div>

      {status && <p className="mb-4 border border-danger bg-white px-4 py-3 text-danger">{status}</p>}

      <section className="mobile-panel grid grid-cols-2 gap-3 border border-line bg-white p-5 sm:grid-cols-5">
        {[
          { label: "目前連續", value: `${stats.current} 天` },
          { label: "最長連續", value: `${stats.longest} 天` },
          { label: "本週", value: `${stats.week} / 7 天` },
          { label: "本月", value: `${stats.month} / ${stats.monthDays} 天` },
          { label: `${year} 年累計`, value: `${stats.yearTotal} 天` },
        ].map((item) => (
          <div key={item.label} className="bg-[#f9fafb] p-3 text-center">
            <p className="text-sm text-muted">{item.label}</p>
            <strong className="num-display text-2xl">{loading ? "—" : item.value}</strong>
          </div>
        ))}
      </section>

      <section className="mobile-panel mt-5 border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{year} 年</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setYear(year - 1)} aria-label="上一年" className="border border-line px-3 py-1.5 font-bold text-primary">
              ‹
            </button>
            <button
              type="button"
              onClick={() => setYear(today.getFullYear())}
              disabled={year === today.getFullYear()}
              className="border border-line px-3 py-1.5 font-bold text-primary disabled:opacity-40"
            >
              今年
            </button>
            <button type="button" onClick={() => setYear(year + 1)} aria-label="下一年" className="border border-line px-3 py-1.5 font-bold text-primary">
              ›
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex w-max" style={{ gap: GAP }}>
            <div className="flex flex-col pr-1 text-xs text-muted" style={{ gap: GAP, paddingTop: 20 }}>
              {["日", "一", "二", "三", "四", "五", "六"].map((w, i) => (
                <span key={w} style={{ height: CELL, lineHeight: `${CELL}px` }} className={i % 2 === 0 ? "invisible" : ""}>
                  {w}
                </span>
              ))}
            </div>
            {weeks.map((week, index) => {
              const monthStart = week.find((d) => d.getFullYear() === year && d.getDate() === 1);
              return (
                <div key={index} className="flex flex-col" style={{ gap: GAP }}>
                  <span className="h-[17px] whitespace-nowrap text-xs leading-[17px] text-muted">{monthStart ? `${monthStart.getMonth() + 1} 月` : ""}</span>
                  {week.map((date) => {
                    const key = toKey(date);
                    if (date.getFullYear() !== year) {
                      return <span key={key} style={{ width: CELL, height: CELL }} />;
                    }
                    const studied = days.has(key);
                    const future = key > todayKey;
                    const note = logs.get(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={future || loading}
                        onClick={() => handleCellClick(key)}
                        title={`${key}${studied ? " · 有讀書" : ""}${note ? ` · ${note}` : ""}`}
                        aria-label={`${key}${studied ? " 已讀書" : " 未讀書"}`}
                        aria-pressed={studied}
                        style={{ width: CELL, height: CELL }}
                        className={`${studied ? "bg-[#2563eb]" : future ? "bg-[#f3f4f6]" : "bg-[#e5e7eb] hover:bg-[#cbd5e1]"} ${key === todayKey ? "outline outline-2 outline-ink" : ""} ${key === selected ? "ring-2 ring-primary ring-offset-1" : ""} disabled:cursor-not-allowed`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-3.5 w-3.5 bg-[#e5e7eb]" /> 沒讀書
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-3.5 w-3.5 bg-[#2563eb]" /> 有讀書
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-3.5 w-3.5 outline outline-2 outline-ink" /> 今天
          </span>
        </div>

        {selected && (
          <div className="mt-4 border border-line bg-[#f9fafb] p-4">
            <p className="font-bold">
              {selected} · {selectedStudied ? "有讀書" : "沒讀書"}
            </p>
            {selectedStudied ? (
              <form
                className="mt-2 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  save(selected, true, noteDraft.trim());
                }}
              >
                <input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  maxLength={200}
                  placeholder={logs.get(selected) ? `目前備註：${logs.get(selected)}` : "備註（例：複習數 A）"}
                  className="min-w-0 flex-1 border border-line bg-white px-3 py-2"
                />
                <button type="submit" className="border border-ink bg-ink px-4 py-2 font-bold text-white">
                  儲存備註
                </button>
              </form>
            ) : (
              <p className="mt-1 text-sm text-muted">再點一次格子可標記為有讀書。</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function StudyPage() {
  return (
    <RequireAuth>
      <StudyPageContent />
    </RequireAuth>
  );
}
