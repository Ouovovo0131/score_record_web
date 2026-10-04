"use client";

import { SUBJECTS } from "@/lib/data";

function getRadarAngle(index: number): number {
  return -Math.PI / 2 + (Math.PI * 2 * index) / SUBJECTS.length;
}

function buildRadarPolygon(values: (number | null)[], centerX: number, centerY: number, radius: number): string {
  return SUBJECTS.map((_, index) => {
    const angle = getRadarAngle(index);
    const raw = values[index];
    const safeValue = Number.isFinite(raw) ? (raw as number) : 0;
    const pointRadius = (Math.max(0, Math.min(100, safeValue)) / 100) * radius;
    return `${centerX + Math.cos(angle) * pointRadius},${centerY + Math.sin(angle) * pointRadius}`;
  }).join(" ");
}

export function RadarChart({
  averageValues,
  latestValues,
}: {
  averageValues: (number | null)[];
  latestValues: (number | null)[];
}) {
  const validAverage = averageValues.some((v) => Number.isFinite(v));
  const validLatest = latestValues.some((v) => Number.isFinite(v));

  if (!validAverage && !validLatest) {
    return (
      <div className="mobile-chart grid min-h-[320px] place-items-center border border-line bg-white p-5 text-center text-muted">
        至少需要 1 筆含科目分數的紀錄。
      </div>
    );
  }

  const width = 400;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2 + 10;
  const radius = 108;
  const levels = [20, 40, 60, 80, 100];

  return (
    <div className="mobile-chart min-h-[320px] border border-line bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="各科戰力雷達圖" className="block h-[320px] w-full">
        {levels.map((level) => {
          const points = SUBJECTS.map((_, index) => {
            const angle = getRadarAngle(index);
            const pointRadius = (level / 100) * radius;
            return `${centerX + Math.cos(angle) * pointRadius},${centerY + Math.sin(angle) * pointRadius}`;
          }).join(" ");
          return <polygon key={level} points={points} fill="none" stroke="#dbe6fb" strokeWidth={1} />;
        })}

        {SUBJECTS.map((subject, index) => {
          const angle = getRadarAngle(index);
          const axisX = centerX + Math.cos(angle) * radius;
          const axisY = centerY + Math.sin(angle) * radius;
          const labelX = centerX + Math.cos(angle) * (radius + 22);
          const labelY = centerY + Math.sin(angle) * (radius + 22);
          return (
            <g key={subject.key}>
              <line x1={centerX} y1={centerY} x2={axisX} y2={axisY} stroke="#dbe6fb" strokeWidth={1} />
              <text x={labelX} y={labelY} fill="#4d5972" fontSize={13} fontWeight={700} textAnchor="middle">
                {subject.shortLabel}
              </text>
            </g>
          );
        })}

        <polygon
          points={buildRadarPolygon(averageValues, centerX, centerY, radius)}
          fill="rgba(53, 99, 233, 0.16)"
          stroke="#3563e9"
          strokeWidth={2.5}
        />
        <polygon
          points={buildRadarPolygon(latestValues, centerX, centerY, radius)}
          fill="rgba(32, 161, 107, 0.16)"
          stroke="#20a16b"
          strokeWidth={2.5}
        />
      </svg>
    </div>
  );
}
