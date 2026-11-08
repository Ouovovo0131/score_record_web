export interface ScoreStatistics {
  count: number;
  average: number | null;
  standardDeviation: number | null;
  highest: number | null;
  lowest: number | null;
  range: number | null;
}

export function scoreStatistics(values: readonly (number | null | undefined)[]): ScoreStatistics {
  const scores = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!scores.length) {
    return { count: 0, average: null, standardDeviation: null, highest: null, lowest: null, range: null };
  }
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  return {
    count: scores.length,
    average,
    standardDeviation: Math.sqrt(scores.reduce((sum, score) => sum + (score - average) ** 2, 0) / scores.length),
    highest,
    lowest,
    range: highest - lowest,
  };
}

export function questionAccuracy(
  records: readonly { questionsAttempted: number | null; questionsCorrect: number | null }[]
) {
  const valid = records.filter((record) =>
    Number.isInteger(record.questionsAttempted) &&
    Number.isInteger(record.questionsCorrect) &&
    (record.questionsAttempted ?? 0) > 0 &&
    (record.questionsCorrect ?? -1) >= 0 &&
    (record.questionsCorrect ?? Infinity) <= (record.questionsAttempted ?? 0)
  );
  const attempted = valid.reduce((sum, record) => sum + (record.questionsAttempted ?? 0), 0);
  const correct = valid.reduce((sum, record) => sum + (record.questionsCorrect ?? 0), 0);
  return { attempted, correct, rate: attempted ? (correct / attempted) * 100 : null };
}
