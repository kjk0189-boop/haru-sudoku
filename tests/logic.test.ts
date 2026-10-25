import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidates, countSolutions, isComplete, PUZZLES } from '../src/game.ts';
import { analyze, findLogicalHint } from '../src/logic.ts';

const board = (text: string) => [...text].map(Number);
const HARD = board('600800000900570000007004000100020038002005001500080000080090304000002000006400070');
const EXPERT = board('000082000040000300000000006607000023009000800001300605300208007204097000000000010');
const COLUMN_XWING = board('084002700070005003000000201920100000000200000038604900001700040090008050047500009');
const transpose = (values: number[]) => values.map((_, i) => values[(i % 9) * 9 + Math.floor(i / 9)]);

test('rating is deterministic, read-only, and distinguishes all four tiers', () => {
  const fixtures = [PUZZLES[0].givens, PUZZLES[8].givens, HARD, EXPERT];
  for (const [i, given] of fixtures.entries()) {
    const original = given.slice();
    const rating = analyze(given);
    assert.deepEqual(given, original);
    assert.deepEqual(rating, analyze(given));
    assert.equal(rating.solved, true);
    assert.equal(rating.difficulty, ['easy', 'medium', 'hard', 'expert'][i]);
    assert.equal(isComplete(rating.solution), true);
    assert.equal(countSolutions(given), 1);
    assert.equal(rating.metrics.maxCandidates, given.reduce((sum, _, index) => sum + candidates(given, index).length, 0));
    const hidden = rating.steps.filter(step => step.technique === 'hidden-single').length;
    const bottlenecks = rating.steps.filter(step => step.placements.length && step.availableSingles! <= 2).length;
    assert.equal(rating.metrics.score, given.filter(v => v === 0).length + 3 * hidden + 2 * bottlenecks);
    assert.equal(rating.metrics.bottleneckSteps, bottlenecks);
    assert.ok(rating.steps.every((step, j) => j === 0 || step.candidateCount! < rating.steps[j - 1].candidateCount!));
  }
});

test('advanced tiers must stall with the lower technique cap', () => {
  assert.equal(analyze(HARD, 'singles').solved, false);
  assert.equal(analyze(EXPERT, 'hard').solved, false);
  assert.equal(analyze(HARD, 'hard').solved, true);
  assert.equal(analyze(EXPERT).hardest, 'x-wing');
  assert.ok(analyze(EXPERT).steps.some(step => step.technique === 'naked-pair'));
  assert.ok(analyze(EXPERT).steps.some(step => step.technique === 'x-wing' && /행의 같은 두 열/.test(step.explanation)));
  assert.ok(analyze(COLUMN_XWING).steps.some(step => step.technique === 'x-wing' && /열의 같은 두 행/.test(step.explanation)));
});

test('every placement and elimination is sound against independent solution search, including transposed X-Wing', () => {
  for (const givens of [HARD, EXPERT, transpose(EXPERT), COLUMN_XWING]) {
    const rating = analyze(givens);
    assert.equal(rating.solved, true);
    const work = givens.slice();
    const notes = work.map((_, i) => new Set(candidates(work, i)));
    for (const step of rating.steps) {
      assert.ok(step.explanation.length > 10);
      for (const { index, value } of step.eliminations) {
        assert.equal(work[index], 0);
        assert.ok(notes[index].has(value), 'every elimination must be productive');
        const alternative = work.slice();
        alternative[index] = value;
        assert.equal(countSolutions(alternative, 1), 0, `${step.technique} incorrectly eliminated ${index}:${value}`);
        notes[index].delete(value);
      }
      for (const { index, value } of step.placements) {
        assert.equal(work[index], 0);
        assert.ok(notes[index].has(value));
        for (const other of candidates(work, index).filter(v => v !== value)) {
          const alternative = work.slice();
          alternative[index] = other;
          assert.equal(countSolutions(alternative, 1), 0, `${step.technique} incorrectly placed ${index}:${value}`);
        }
        work[index] = value;
        notes[index].clear();
        for (let j = 0; j < 81; j++) {
          if (Math.floor(j / 9) === Math.floor(index / 9) || j % 9 === index % 9 ||
            (Math.floor(j / 27) === Math.floor(index / 27) && Math.floor(j % 9 / 3) === Math.floor(index % 9 / 3))) notes[j].delete(value);
        }
      }
    }
    assert.deepEqual(work, rating.solution);
  }
});

test('recomputed hints complete every supported level and explain candidate elimination', () => {
  for (const givens of [PUZZLES[0].givens, PUZZLES[8].givens, HARD, EXPERT]) {
    const work = givens.slice();
    let advancedExplanation = false;
    for (let i = 0; i < 81 && !isComplete(work); i++) {
      const before = work.slice();
      const hint = findLogicalHint(work, givens);
      assert.deepEqual(work, before);
      assert.ok(hint);
      assert.equal(givens[hint.index], 0);
      assert.equal(work[hint.index], 0);
      advancedExplanation ||= hint.explanation.includes('제외');
      work[hint.index] = hint.value;
    }
    assert.equal(isComplete(work), true);
    if (givens === HARD || givens === EXPERT) assert.equal(advancedExplanation, true);
  }
});

test('rating declines invalid, conflicting, unsupported and contradictory boards safely', () => {
  const empty = Array(81).fill(0);
  for (const invalid of [Array(80).fill(0), Array(81), [...empty.slice(1), 10], [...empty.slice(1), NaN]]) {
    assert.equal(analyze(invalid).solved, false);
    assert.equal(analyze(invalid).difficulty, null);
    assert.equal(findLogicalHint(invalid, empty), null);
  }
  const conflict = empty.slice();
  conflict[0] = conflict[1] = 1;
  assert.equal(analyze(conflict).solved, false);
  assert.equal(findLogicalHint(conflict, empty), null);
  assert.equal(analyze(empty).solved, false);
  assert.equal(findLogicalHint(empty, empty), null);
  const contradiction = board('012345678900000000000000000000000000000000000000000000000000000000000000000000000');
  assert.equal(analyze(contradiction).steps.length, 0);
  const altered = HARD.slice();
  altered[0] = 0;
  assert.equal(findLogicalHint(altered, HARD), null);
});
