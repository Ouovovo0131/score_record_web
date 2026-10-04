// Shared reusable UI bits for insight cards used on both score & english pages.
"use client";

export interface Comparison {
  icon: string;
  tone: "positive" | "negative" | "neutral";
  label: string;
}

export function buildComparison(
  currentValue: number | null | undefined,
  baselineValue: number | null | undefined,
  prefix: string,
  unit: string
): Comparison {
  if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue)) {
    return { icon: "•", tone: "neutral", label: "資料不足，暫時無法比較" };
  }

  const diff = (currentValue as number) - (baselineValue as number);
  if (diff > 0) {
    return { icon: "▲", tone: "positive", label: `${prefix} +${formatScoreLocal(diff)} ${unit}` };
  }
  if (diff < 0) {
    return { icon: "▼", tone: "negative", label: `${prefix} ${formatScoreLocal(diff)} ${unit}` };
  }
  return { icon: "•", tone: "neutral", label: `${prefix} 持平` };
}

function formatScoreLocal(value: number): string {
  return Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1);
}

const toneClass: Record<Comparison["tone"], string> = {
  positive: "bg-[#dcfce7] text-success",
  negative: "bg-[#fee2e2] text-danger",
  neutral: "bg-[#f3f4f6] text-muted",
};

export function InsightCard({
  title,
  value,
  detail,
  comparison,
}: {
  title: string;
  value: string;
  detail: string;
  comparison: Comparison;
}) {
  return (
    <article className="mobile-summary-card border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-muted">{title}</p>
        <span
          className={`inline-grid h-8 min-w-8 place-items-center border border-line font-extrabold ${toneClass[comparison.tone]}`}
        >
          {comparison.icon}
        </span>
      </div>
      <strong className="num-display mt-3 block text-3xl">{value}</strong>
      <p className="mt-2 font-bold text-primary">{detail}</p>
      <span className="mt-2 block text-muted">{comparison.label}</span>
    </article>
  );
}

export function Tag({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 font-bold ${
        muted ? "bg-[rgba(93,104,128,0.12)] text-muted" : "bg-[#f3f4f6] text-ink"
      }`}
    >
      {label}
    </span>
  );
}
