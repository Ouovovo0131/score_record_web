"use client";

import { SCIENCE_MAX_SCORE, SCIENCE_PARTS, SUBJECTS, SUBJECT_MAX_SCORE, formatScore } from "@/lib/data";

export interface RatioRow {
  key: string;
  label: string;
  max: number;
  average: number | null;
  latest: number | null;
  isPart?: boolean;
}

export function buildRatioRows(averageOf: (scoreKey: string) => number | null, latestOf: (scoreKey: string) => number | null): RatioRow[] {
  const rows: RatioRow[] = [];
  SUBJECTS.forEach((subject) => {
    rows.push({
      key: subject.key,
      label: subject.label,
      max: SUBJECT_MAX_SCORE,
      average: averageOf(subject.scoreKey),
      latest: latestOf(subject.scoreKey),
    });
    if (subject.key === "science") {
      SCIENCE_PARTS.forEach((part) => {
        rows.push({
          key: part.key,
          label: part.label,
          max: SCIENCE_MAX_SCORE,
          average: averageOf(part.scoreKey),
          latest: latestOf(part.scoreKey),
          isPart: true,
        });
      });
    }
  });
  return rows;
}

function Bar({ value, max, color, name }: { value: number | null; max: number; color: string; name: string }) {
  if (!Number.isFinite(value)) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="w-12 shrink-0">{name}</span>
        <span>尚無資料</span>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, ((value as number) / max) * 100));
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-12 shrink-0 text-muted">{name}</span>
      <div className="h-3 flex-1 bg-[#e8eefb]">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-40 shrink-0 text-right tabular-nums">
        {formatScore(value as number)} / {max}
        <strong className="ml-2">{formatScore(pct)}%</strong>
      </span>
    </div>
  );
}

export function ScoreRatioChart({ rows }: { rows: RatioRow[] }) {
  const hasData = rows.some((r) => Number.isFinite(r.average) || Number.isFinite(r.latest));
  if (!hasData) {
    return (
      <div className="grid min-h-[200px] place-items-center border border-line bg-white p-5 text-center text-muted">
        至少需要 1 筆含科目分數的紀錄。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => (
        <div key={row.key} className={row.isPart ? "ml-6 border-l-2 border-line pl-4" : ""}>
          <h3 className={row.isPart ? "mb-1.5 text-sm font-bold text-muted" : "mb-1.5 font-bold"}>
            {row.label}
            <span className="ml-2 text-sm font-normal text-muted">滿分 {row.max}</span>
          </h3>
          <div className="flex flex-col gap-1.5">
            <Bar name="平均" value={row.average} max={row.max} color="#3563e9" />
            <Bar name="最近" value={row.latest} max={row.max} color="#20a16b" />
          </div>
        </div>
      ))}
    </div>
  );
}
