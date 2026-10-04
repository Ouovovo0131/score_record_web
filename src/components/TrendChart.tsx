"use client";

import { compactDate, formatScore } from "@/lib/data";

export interface TrendPoint {
  date: string;
  value: number;
}

export function TrendChart({
  points,
  color = "#3563e9",
  emptyMessage = "至少新增 1 筆有效資料後才會顯示圖表。",
}: {
  points: TrendPoint[];
  color?: string;
  emptyMessage?: string;
}) {
  if (!points.length) {
    return (
      <div className="mobile-chart grid min-h-[320px] place-items-center border border-line bg-white p-5 text-center text-muted">
        {emptyMessage}
      </div>
    );
  }

  const width = 800;
  const height = 320;
  const padding = { top: 24, right: 28, bottom: 48, left: 58 };
  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 10);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const plotted = points.map((point, index) => {
    const x = padding.left + (points.length === 1 ? innerWidth / 2 : (innerWidth * index) / (points.length - 1));
    const y = padding.top + innerHeight - ((point.value - minValue) / range) * innerHeight;
    return { x, y, point };
  });

  const gridSteps = [0, 1, 2, 3, 4];

  return (
    <div className="mobile-chart min-h-[320px] border border-line bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="成長曲線" className="block h-[320px] w-full">
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#c4d5f8" strokeWidth={1.5} />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#c4d5f8" strokeWidth={1.5} />
        {gridSteps.map((step) => {
          const y = padding.top + innerHeight - (innerHeight * step) / 4;
          const value = minValue + (range * step) / 4;
          return (
            <g key={step}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5edfd" strokeWidth={1} strokeDasharray="4 6" />
              <text x={padding.left - 10} y={y + 5} fill="#5d6880" fontSize={12} textAnchor="end">
                {formatScore(value)}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={plotted.map((p) => `${p.x},${p.y}`).join(" ")}
        />
        {plotted.map((p, index) => (
          <g key={index}>
            <circle cx={p.x} cy={p.y} r={5.5} fill="#ffffff" stroke={color} strokeWidth={3} />
            <text x={p.x} y={p.y - 12} fill="#2648ac" fontSize={12} fontWeight={700} textAnchor="middle">
              {formatScore(p.point.value)}
            </text>
            <text x={p.x} y={height - padding.bottom + 22} fill="#5d6880" fontSize={12} textAnchor="middle">
              {compactDate(p.point.date)}
            </text>
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

export interface PredictionLabel {
  /** The predicted next score to plot on the right edge of the chart. */
  value: number;
  /** Full label text shown next to the prediction marker. */
  label: string;
  color?: string;
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
  predictions = [],
  showExtrema = true,
}: {
  series: MultiSeries[];
  emptyMessage?: string;
  /** Fixed Y axis lower bound (e.g. 0). Falls back to the data's min value when omitted. */
  yAxisMin?: number;
  /** Fixed Y axis upper bound (e.g. 80 for 妙妙卷, 28 for 克漏字). Falls back to the data's max value when omitted. */
  yAxisMax?: number;
  /** Reference lines used to compare the current best score for each practice type. */
  referenceLines?: ReferenceLine[];
  /** Independently computed next-score predictions. */
  predictions?: PredictionLabel[];
  /** Whether to show the chart's observed high and low lines. */
  showExtrema?: boolean;
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
  const axisMax = yAxisMax ?? Math.max(maxValue, ...predictions.map(({ value }) => value));
  const range = Math.max(axisMax - axisMin, 10);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const dateLabelInterval = Math.max(1, Math.ceil(timeline.length / 8));
  const gridSteps = [0, 1, 2, 3, 4];
  const yFor = (value: number) => padding.top + innerHeight - ((value - axisMin) / range) * innerHeight;
  const xFor = (point: TrendPoint) => {
    const index = pointIndices.get(point) ?? 0;
    const position =
      predictions.length > 0
        ? index / timeline.length
        : timeline.length === 1
          ? 0.5
          : index / (timeline.length - 1);
    return padding.left + innerWidth * position;
  };
  return (
    <div className="mobile-chart min-h-[320px] border border-line bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="英文練習成長曲線與各類型下次預測" className="block h-[320px] w-full">
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#c4d5f8" strokeWidth={1.5} />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#c4d5f8" strokeWidth={1.5} />
        {gridSteps.map((step) => {
          const y = padding.top + innerHeight - (innerHeight * step) / 4;
          const value = axisMin + (range * step) / 4;
          return (
            <g key={step}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5edfd" strokeWidth={1} strokeDasharray="4 6" />
              <text x={padding.left - 10} y={y + 5} fill="#5d6880" fontSize={12} textAnchor="end">
                {formatScore(value)}
              </text>
            </g>
          );
        })}
        {showExtrema && (
          <>
            <line
              x1={padding.left}
              y1={yFor(maxValue)}
              x2={width - padding.right}
              y2={yFor(maxValue)}
              stroke="#db7048"
              strokeWidth={1.5}
              strokeDasharray="8 5"
            />
            <text
              x={width - padding.right - 5}
              y={yFor(maxValue) - 8}
              fill="#a74324"
              fontSize={12}
              fontWeight={700}
              textAnchor="end"
            >
              最高 {formatScore(maxValue)}
            </text>
            <line
              x1={padding.left}
              y1={yFor(minValue)}
              x2={width - padding.right}
              y2={yFor(minValue)}
              stroke="#8065b5"
              strokeWidth={1.5}
              strokeDasharray="8 5"
            />
            <text
              x={padding.left + 5}
              y={yFor(minValue) + 16}
              fill="#60458f"
              fontSize={12}
              fontWeight={700}
              textAnchor="start"
            >
              最低 {formatScore(minValue)}
            </text>
          </>
        )}
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
                    <text x={p.x} y={height - padding.bottom + 22} fill="#5d6880" fontSize={12} textAnchor="middle">
                      {compactDate(p.point.date)}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
        {predictions.map((prediction, index) => {
          const predictionX = padding.left + innerWidth;
          const x = predictionX - 8 + index * 16;
          const boundedValue = Math.min(Math.max(prediction.value, axisMin), axisMax);
          const y = yFor(boundedValue);
          const labelY = y < height - padding.bottom - 28 ? y + 22 : y - 12;
          const color = prediction.color ?? "#d08016";
          return (
            <g key={prediction.label}>
              <path
                d={`M ${x} ${y - 7} L ${x + 7} ${y} L ${x} ${y + 7} L ${x - 7} ${y} Z`}
                fill="#ffffff"
                stroke={color}
                strokeWidth={3}
              />
              <text
                x={x - 10}
                y={labelY}
                fill={color}
                fontSize={12}
                fontWeight={700}
                textAnchor="end"
              >
                {prediction.label}
              </text>
              <text x={x} y={height - padding.bottom + 22} fill="#5d6880" fontSize={12} textAnchor="middle">
                下次
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
