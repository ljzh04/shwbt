import assert from 'node:assert/strict';
import { runBenchmark } from '../packages/training/src/benchmark.js';

const cases = [
  { id: 'case-a', seed: 1, state: { turn: 1 }, expected: 'recover' },
  { id: 'case-b', seed: 2, state: { turn: 2 }, expected: 'toxic' },
];
const result = runBenchmark('baseline-v1', { choose: (state: { turn: number }) => state.turn === 1 ? 'recover' : 'tackle' }, cases, (actual, expected) => actual === 'tackle' && expected === 'toxic');
assert.equal(result.total, 2);
assert.equal(result.correct, 1);
assert.equal(result.catastrophicLosses, 1);
assert.equal(result.accuracy, 0.5);
assert.equal(result.catastrophicLossRate, 0.5);
console.log('benchmark tests ok');