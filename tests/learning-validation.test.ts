import assert from "node:assert/strict";
import test from "node:test";
import { validateEnglishRecordInput } from "../src/lib/data";
import { isDateKey } from "../src/lib/learning-validation";

test("date keys validate calendar dates, including leap years", () => {
  assert.equal(isDateKey("2024-02-29"), true);
  assert.equal(isDateKey("2026-02-29"), false);
  assert.equal(isDateKey("2026-13-01"), false);
  assert.equal(isDateKey("2026-1-01"), false);
});

test("English records allow existing score-only records and explicit question counts", () => {
  assert.equal(validateEnglishRecordInput({
    practiceType: "miaomiao",
    practiceDate: "2026-10-01",
    practiceName: "練習一",
    totalScore: 40,
  }), null);
  assert.equal(validateEnglishRecordInput({
    practiceType: "miaomiao",
    practiceDate: "2026-10-01",
    questionsAttempted: 20,
    questionsCorrect: 17,
  }), null);
});

test("English record validation rejects impossible dates and inconsistent question counts", () => {
  assert.equal(validateEnglishRecordInput({
    practiceType: "miaomiao",
    practiceDate: "2026-02-30",
    totalScore: 40,
  }), "Invalid practice date.");
  assert.equal(validateEnglishRecordInput({
    practiceType: "miaomiao",
    practiceDate: "2026-10-01",
    questionsAttempted: 10,
  }), "Attempted and correct question counts must be supplied together.");
  assert.equal(validateEnglishRecordInput({
    practiceType: "miaomiao",
    practiceDate: "2026-10-01",
    questionsAttempted: 10,
    questionsCorrect: 11,
  }), "Invalid question counts.");
});
