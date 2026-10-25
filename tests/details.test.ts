import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidates, conflicts, findHint, PUZZLES, type Difficulty } from '../src/game.ts';
import { HINT_LIMITS, type HintLimits } from '../src/policy.ts';
import { applyHint, completedDigits, enterValue, fillAllNotes, puzzleFor, remainingHints, restoreSession, undo, type Session } from '../src/session.ts';

function fixture(difficulty: Difficulty = 'easy'): Session {
  const puzzle = PUZZLES.find(p => p.difficulty === difficulty)!;
  return { version: 1, puzzleId: puzzle.id, board: [...puzzle.givens], notes: Array.from({ length: 81 }, () => []), elapsed: 34, hints: 0, history: [] };
}

test('completed digits count all entered cells and ignore empty cells', () => {
  const board = Array(81).fill(0) as number[];
  assert.deepEqual([...completedDigits(board)], []);
  board.fill(3, 0, 8);
  assert.equal(completedDigits(board).has(3), false);
  board[8] = 3;
  assert.deepEqual([...completedDigits(board)], [3]);
  board[9] = 3;
  assert.deepEqual([...completedDigits(board)], [3], 'restored duplicate entries still disable the digit');
});

test('completed digits block value and memo input and become available after erase or undo', () => {
  const initial = fixture();
  const puzzle = puzzleFor(initial);
  const editable = puzzle.givens.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
  const filled = editable[0];
  const digit = puzzle.solution[filled];
  const target = editable.find(i => puzzle.solution[i] !== digit)!;
  const session = { ...initial, board: [...puzzle.solution] };
  session.board[target] = 0;
  assert.equal(completedDigits(session.board).has(digit), true);
  assert.equal(enterValue(session, target, digit), session);
  assert.equal(enterValue(session, target, digit, true), session);
  assert.equal(enterValue(session, filled, digit), session);
  const erased = enterValue(session, filled, 0);
  assert.equal(completedDigits(erased.board).has(digit), false);
  assert.equal(enterValue(erased, target, digit).board[target], digit);
  assert.deepEqual(enterValue(erased, target, digit, true).notes[target], [digit]);
  const refilled = enterValue(erased, filled, digit);
  assert.equal(completedDigits(refilled.board).has(digit), true);
  assert.equal(completedDigits(undo(refilled).board).has(digit), false);
});

test('advanced memo replaces every blank cell with legal candidates in a single reversible change', () => {
  const initial = fixture();
  const first = initial.board.findIndex(v => v === 0);
  initial.notes[first] = [1, 9];
  const before = JSON.stringify(initial);
  const filled = fillAllNotes(initial);
  assert.notEqual(filled, initial);
  assert.equal(JSON.stringify(initial), before, 'must not mutate existing board or notes');
  assert.deepEqual(filled.board, initial.board);
  for (let index = 0; index < 81; index++) {
    assert.deepEqual(filled.notes[index], candidates(initial.board, index), `cell ${index}`);
  }
  assert.equal(filled.history.length, 1);
  assert.deepEqual(undo(filled), initial);
  assert.equal(fillAllNotes(filled), filled, 'repeated advanced memo does not create undo history');
  assert.deepEqual(restoreSession(JSON.stringify(filled)), filled);
});

test('advanced memo uses current user entries and refuses conflicting or completed boards', () => {
  const initial = fixture();
  const puzzle = puzzleFor(initial);
  const first = initial.board.findIndex(v => v === 0);
  const entered = enterValue(initial, first, puzzle.solution[first]);
  const filled = fillAllNotes(entered);
  assert.deepEqual(filled.notes[first], []);
  for (let index = 0; index < 81; index++) assert.deepEqual(filled.notes[index], candidates(entered.board, index));
  const conflicting = { ...initial, board: [...initial.board] };
  conflicting.board[first] = initial.board.slice(0, 9).find(v => v !== 0)!;
  assert.ok(conflicts(conflicting.board).size > 0);
  assert.equal(fillAllNotes(conflicting), conflicting);
  const complete = { ...initial, board: [...puzzle.solution] };
  assert.equal(fillAllNotes(complete), complete);
});

test('all difficulty defaults allow unlimited hints and successful hints alone increase usage', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    assert.equal(HINT_LIMITS[difficulty], null);
    const initial = { ...fixture(difficulty), hints: 100 };
    assert.equal(remainingHints(initial), null);
    const result = applyHint(initial);
    assert.notEqual(result.session, initial);
    assert.equal(result.session.hints, 101);
    assert.equal(typeof result.index, 'number');
    assert.ok(result.message.length > 0);
    assert.equal(result.session.board[result.index!], puzzleFor(initial).solution[result.index!]);
    assert.deepEqual(undo(result.session).board, initial.board);
    assert.equal(undo(result.session).hints, 101, 'undo does not refund hint usage');
  }
});

test('injected per-difficulty limits enforce zero and exhausted budgets without changing sessions', () => {
  const limits: HintLimits = { easy: 1, medium: 2, hard: 0 };
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const budget = limits[difficulty]!;
    const initial = fixture(difficulty);
    assert.equal(remainingHints(initial, limits), budget);
    const exhausted = { ...initial, hints: budget };
    assert.equal(remainingHints(exhausted, limits), 0);
    assert.equal(applyHint(exhausted, limits).session, exhausted);
    assert.equal(remainingHints({ ...exhausted, hints: budget + 5 }, limits), 0);
    if (budget > 0) {
      const last = { ...initial, hints: budget - 1 };
      const used = applyHint(last, limits).session;
      assert.equal(used.hints, budget);
      assert.equal(remainingHints(used, limits), 0);
      assert.equal(applyHint(used, limits).session, used);
    }
  }
});

test('wrong entries, completed boards and unavailable hints consume no hint budget', () => {
  const initial = fixture();
  const puzzle = puzzleFor(initial);
  const first = initial.board.findIndex(v => v === 0);
  const incorrect = { ...initial, board: [...initial.board] };
  incorrect.board[first] = candidates(initial.board, first).find(v => v !== puzzle.solution[first])!;
  assert.ok(incorrect.board[first], 'fixture has a locally legal but incorrect choice');
  assert.equal(conflicts(incorrect.board).size, 0);
  assert.equal(applyHint(incorrect).session, incorrect);
  const complete = { ...initial, board: [...puzzle.solution] };
  assert.equal(applyHint(complete).session, complete);
  // hard-2 eventually requires a technique beyond the supported singles.
  const hard = PUZZLES.find(p => p.id === 'hard-2')!;
  const noHint = { ...fixture('hard'), puzzleId: hard.id, board: [...hard.givens], hints: 4 };
  for (let step = 0; step < 81; step++) {
    const hint = findHint(noHint.board, hard.givens);
    if (!hint) break;
    noHint.board[hint.index] = hint.value;
  }
  assert.ok(noHint.board.includes(0), 'fixture remains incomplete after all supported hints');
  assert.equal(conflicts(noHint.board).size, 0);
  assert.equal(applyHint(noHint).session, noHint);
  assert.equal(noHint.hints, 4);
  assert.equal(initial.hints, 0);
});
