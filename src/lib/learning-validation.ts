import { SUBJECTS } from "@/lib/data";

export const STUDY_SUBJECTS = [...SUBJECTS.map(({ key }) => key), "other"] as const;
export const QUESTION_ERROR_CATEGORIES = [
  "vocabulary",
  "grammar",
  "context",
  "careless",
  "time_management",
  "other",
] as const;
export const QUESTION_REVIEW_STATUSES = ["not_reviewed", "reviewing", "reviewed"] as const;
export const WEAKNESS_STATUSES = ["not_reviewed", "reviewing", "improving", "resolved"] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function dateFromKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function boundedText(value: unknown, maxLength: number): string | null {
  if (value === undefined) return "";
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

export function isOptionalRecordId(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || (typeof value === "string" && value.length <= 100);
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  return body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null;
}
