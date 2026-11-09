"use client";

import { compactDate, formatScore } from "@/lib/data";

export interface TrendPoint {
  date: string;
  value: number;
  name?: string;
}

export function TrendChart({
  points,
  color = "var(--color-primary)",
  emptyMessage = "至少新增 1 筆有效資料後才會顯示圖表。",
  yAxisMin,
  yAxisMax,
  referenceLine,
  size = "default",
  valueSuffix = "",
}: {
  points: TrendPoint[];
  color?: string;
  emptyMessage?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  referenceLine?: { value: number; label: string };
  size?: "default" | "large";
  valueSuffix?: string;
}) {
  if (!points.length) {
    return (
      <div className="mobile-chart grid min-h-[320px] place-items-center border border-line bg-white p-5 text-center text-muted">
        {emptyMessage}
      </div>
    );
  }

  const width = 800;
  const height = size === "large" ? 380 : 320;
  const padding = { top: 30, right: 32, bottom: 52, left: 58 };
  const values = points.map((p) => p.value);
  const minValue = yAxisMin ?? Math.min(...values);
  const maxValue = yAxisMax ?? Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const plotted = points.map((point, index) => {
    const x = padding.left + (points.length === 1 ? innerWidth / 2 : (innerWidth * index) / (points.length - 1));
    const y = padding.top + innerHeight - ((point.value - minValue) / range) * innerHeight;
    return { x, y, point };
  });

  const gridSteps = [0, 1, 2, 3, 4];
  const dateLabelInterval = Math.max(1, Math.ceil(points.length / 8));
  const yFor = (value: number) => padding.top + innerHeight - ((value - minValue) / range) * innerHeight;

  return (
    <div className={`mobile-chart trend-chart${size === "large" ? " trend-chart-large" : ""}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="成長曲線" className="block w-full" style={{ height }}>
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="var(--color-outline)" strokeWidth={1} />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="var(--color-outline)" strokeWidth={1} />
        {gridSteps.map((step) => {
          const y = padding.top + innerHeight - (innerHeight * step) / 4;
          const value = minValue + (range * step) / 4;
          return (
            <g key={step}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--color-chart-grid)" strokeWidth={1} />
              <text x={padding.left - 10} y={y + 5} fill="var(--color-muted)" fontFamily="var(--font-mono)" fontSize={size === "large" ? 13 : 12} textAnchor="end">
                {formatScore(value)}{valueSuffix}
              </text>
            </g>
          );
        })}
        {referenceLine && referenceLine.value >= minValue && referenceLine.value <= maxValue && (
          <g>
            <line
              x1={padding.left}
              y1={yFor(referenceLine.value)}
              x2={width - padding.right}
              y2={yFor(referenceLine.value)}
              stroke="var(--color-outline)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
            <text x={width - padding.right - 4} y={yFor(referenceLine.value) - 7} fill="var(--color-muted)" fontFamily="var(--font-mono)" fontSize={12} textAnchor="end">
              {referenceLine.label}
            </text>
          </g>
        )}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={plotted.map((p) => `${p.x},${p.y}`).join(" ")}
        />
        {plotted.map((p, index) => (
          <g key={index}>
            <circle
              cx={p.x}
              cy={p.y}
              r={size === "large" ? 7 : 5.5}
              fill="#ffffff"
              stroke={color}
              strokeWidth={3}
              tabIndex={0}
              aria-label={`${p.point.name ? `${p.point.name}，` : ""}${p.point.date}，${formatScore(p.point.value)}${valueSuffix || " 分"}`}
            >
              <title>{`${p.point.name ? `${p.point.name} · ` : ""}${p.point.date} · ${formatScore(p.point.value)}${valueSuffix || " 分"}`}</title>
            </circle>
            {points.length <= 8 && (
              <text x={p.x} y={p.y - 13} fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize={13} fontWeight={700} textAnchor="middle">
                {formatScore(p.point.value)}{valueSuffix}
              </text>
            )}
            {(index % dateLabelInterval === 0 || index === points.length - 1) && (
              <text x={p.x} y={height - padding.bottom + 24} fill="var(--color-muted)" fontSize={12} textAnchor="middle">
                {compactDate(p.point.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export interface MultiSeries {
  key: string;
  color: string;
  points: TrendPoint[];
}

export interface ReferenceLine {
  value: number;
  label: string;
  color: string;
}

export function MultiTrendChart({
  series,
  emptyMessage = "目前沒有資料可顯示。",
  yAxisMin,
  yAxisMax,
  referenceLines = [],
}: {
  series: MultiSeries[];
  emptyMessage?: string;
  /** Fixed Y axis lower bound (e.g. 0). Falls back to the data's min value when omitted. */
  yAxisMin?: number;
  /** Fixed Y axis upper bound (e.g. 80 for 妙妙卷, 28 for 克漏字). Falls back to the data's max value when omitted. */
  yAxisMax?: number;
  /** Reference lines used to compare the current best score for each practice type. */
  referenceLines?: ReferenceLine[];
}) {
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  if (!allValues.length) {
    return (
      <div className="mobile-chart grid min-h-[320px] place-items-center border border-line bg-white p-5 text-center text-muted">
        {emptyMessage}
      </div>
    );
  }

  const width = 800;
  const height = 320;
  const padding = { top: 36, right: 28, bottom: 48, left: 58 };
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const timeline = series
    .flatMap((s, seriesIndex) =>
      s.points.map((point, pointIndex) => ({ point, seriesIndex, pointIndex }))
    )
    .sort(
      (a, b) =>
        a.point.date.localeCompare(b.point.date) ||
        a.seriesIndex - b.seriesIndex ||
        a.pointIndex - b.pointIndex
    );
  const pointIndices = new Map(timeline.map(({ point }, index) => [point, index]));
  const axisMin = yAxisMin ?? minValue;
  const axisMax = yAxisMax ?? maxValue;
  const range = Math.max(axisMax - axisMin, 10);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const dateLabelInterval = Math.max(1, Math.ceil(timeline.length / 8));
  const gridSteps = [0, 1, 2, 3, 4];
  const yFor = (value: number) => padding.top + innerHeight - ((value - axisMin) / range) * innerHeight;
  const xFor = (point: TrendPoint) => {
    const index = pointIndices.get(point) ?? 0;
    const position = timeline.length === 1 ? 0.5 : index / (timeline.length - 1);
    return padding.left + innerWidth * position;
  };
  return (
    <div className="mobile-chart min-h-[320px] border border-line bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="英文練習總分成長曲線與各類型最高成績" className="block h-[320px] w-full">
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="var(--color-outline)" strokeWidth={1} />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="var(--color-outline)" strokeWidth={1} />
        {gridSteps.map((step) => {
          const y = padding.top + innerHeight - (innerHeight * step) / 4;
          const value = axisMin + (range * step) / 4;
          return (
            <g key={step}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--color-chart-grid)" strokeWidth={1} />
              <text x={padding.left - 10} y={y + 5} fill="var(--color-muted)" fontFamily="var(--font-mono)" fontSize={12} textAnchor="end">
                {formatScore(value)}
              </text>
            </g>
          );
        })}
        {referenceLines.map((line, index) => (
          <g key={`${line.label}-${line.value}`}>
            <line
              x1={padding.left}
              y1={yFor(line.value)}
              x2={width - padding.right}
              y2={yFor(line.value)}
              stroke={line.color}
              strokeWidth={1.5}
              strokeDasharray="2 4"
            />
            <text
              x={index === 0 ? padding.left + 5 : width - padding.right - 5}
              y={yFor(line.value) - 8}
              fill={line.color}
              fontSize={12}
              fontWeight={700}
              textAnchor={index === 0 ? "start" : "end"}
            >
              {line.label}
            </text>
          </g>
        ))}
        {series.map((s) => {
          if (!s.points.length) return null;
          const plotted = s.points.map((point) => {
            const x = xFor(point);
            const y = yFor(point.value);
            return { x, y, point };
          });
          return (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={plotted.map((p) => `${p.x},${p.y}`).join(" ")}
              />
              {plotted.map((p, index) => (
                <g key={index}>
                  <circle cx={p.x} cy={p.y} r={5.5} fill="#ffffff" stroke={s.color} strokeWidth={3} />
                  {(pointIndices.get(p.point) ?? 0) % dateLabelInterval === 0 && (
                    <text x={p.x} y={height - padding.bottom + 22} fill="var(--color-muted)" fontSize={12} textAnchor="middle">
                      {compactDate(p.point.date)}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
