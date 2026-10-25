import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countSolutions, isComplete, type Difficulty } from '../src/game.ts';
import { generatePuzzle, puzzleFingerprint } from '../src/generator.ts';
import { analyze } from '../src/logic.ts';

test('randomized generation certifies all four requested tiers with unique solutions', () => {
  for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as Difficulty[]) {
    const puzzle = generatePuzzle(difficulty, { seed: 42, deadlineMs: 10000 });
    assert.ok(puzzle, `${difficulty} generation should succeed for regression seed 42`);
    assert.equal(puzzle.difficulty, difficulty);
    assert.equal(countSolutions(puzzle.givens), 1);
    assert.equal(isComplete(puzzle.solution), true);
    assert.ok(puzzle.givens.every((value, i) => value === 0 || value === puzzle.solution[i]));
    const verified = analyze(puzzle.givens);
    assert.equal(verified.solved, true);
    assert.equal(verified.difficulty, difficulty);
    assert.deepEqual(verified.solution, puzzle.solution);
    assert.deepEqual(verified, puzzle.rating);
    assert.equal(puzzle.fingerprint, puzzleFingerprint(puzzle.givens));
    if (difficulty === 'hard') assert.equal(analyze(puzzle.givens, 'singles').solved, false);
    if (difficulty === 'expert') assert.equal(analyze(puzzle.givens, 'hard').solved, false);
  }
});

test('seed replay is deterministic and different seeds create new grids and clue layouts', () => {
  const first = generatePuzzle('easy', { seed: 9 });
  const replay = generatePuzzle('easy', { seed: 9 });
  const other = generatePuzzle('easy', { seed: 10 });
  assert.ok(first && replay && other);
  assert.deepEqual(first, replay);
  assert.notDeepEqual(first.solution, other.solution);
  assert.notEqual(first.fingerprint, other.fingerprint);
  assert.notDeepEqual(first.givens.map(Boolean), other.givens.map(Boolean));
});

test('easy generation supplies varied effort instead of always returning the first dense grid', () => {
  const scores = [1, 2, 3, 4, 5].map(seed => {
    const puzzle = generatePuzzle('easy', { seed });
    assert.ok(puzzle);
    assert.ok(puzzle.rating.metrics.score >= 65 && puzzle.rating.metrics.score < 100);
    return puzzle.rating.metrics.score;
  });
  assert.ok(new Set(scores).size > 1);
});

test('recent fingerprints are excluded without mutating the caller list', () => {
  const first = generatePuzzle('easy', { seed: 42 });
  assert.ok(first);
  const excludeFingerprints = [first.fingerprint];
  const next = generatePuzzle('easy', { seed: 42, excludeFingerprints });
  assert.ok(next);
  assert.notEqual(next.fingerprint, first.fingerprint);
  assert.deepEqual(excludeFingerprints, [first.fingerprint]);
  assert.equal(analyze(next.givens).difficulty, 'easy');
});

test('exhausted search and deadlines return explicit failure instead of a wrong tier', () => {
  assert.equal(generatePuzzle('expert', { seed: 42, maxAttempts: 0 }), null);
  assert.equal(generatePuzzle('easy', { seed: 42, deadlineMs: 0 }), null);
  assert.equal(generatePuzzle('expert', { seed: 42, maxAttempts: 1 }), null);
  assert.equal(generatePuzzle('invalid' as Difficulty), null);
});
