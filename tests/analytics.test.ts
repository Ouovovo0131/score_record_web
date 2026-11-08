import assert from "node:assert/strict";
import test from "node:test";
import { questionAccuracy, scoreStatistics } from "../src/lib/analytics";

test("score statistics report population standard deviation and bounds", () => {
  const result = scoreStatistics([40, 50, 60, null, Number.NaN]);
  assert.equal(result.count, 3);
  assert.equal(result.average, 50);
  assert.equal(result.highest, 60);
  assert.equal(result.lowest, 40);
  assert.equal(result.range, 20);
  assert.ok(Math.abs((result.standardDeviation ?? 0) - Math.sqrt(200 / 3)) < 1e-10);
});

test("score statistics preserve an explicit empty-data state", () => {
  assert.deepEqual(scoreStatistics([null, undefined, Number.NaN]), {
    count: 0,
    average: null,
    standardDeviation: null,
    highest: null,
    lowest: null,
    range: null,
  });
});

test("question accuracy is weighted by recorded question counts and ignores invalid rows", () => {
  const result = questionAccuracy([
    { questionsAttempted: 10, questionsCorrect: 8 },
    { questionsAttempted: 10, questionsCorrect: 7 },
    { questionsAttempted: null, questionsCorrect: null },
    { questionsAttempted: 2, questionsCorrect: 3 },
  ]);
  assert.deepEqual(result, { attempted: 20, correct: 15, rate: 75 });
  assert.deepEqual(questionAccuracy([]), { attempted: 0, correct: 0, rate: null });
});
