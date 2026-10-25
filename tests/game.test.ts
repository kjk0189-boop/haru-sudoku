import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidates, conflicts, countSolutions, findHint, getPuzzle, isComplete, PUZZLES } from '../src/game.ts';

test('every catalog puzzle has one solution and consistent givens', () => {
  assert.equal(new Set(PUZZLES.map(p => p.id)).size, 9);
  for (const difficulty of ['easy', 'medium', 'hard']) {
    assert.equal(PUZZLES.filter(p => p.difficulty === difficulty).length, 3);
  }
  for (const puzzle of PUZZLES) {
    assert.equal(puzzle.givens.length, 81);
    assert.equal(isComplete(puzzle.solution), true, puzzle.id);
    assert.equal(conflicts(puzzle.givens).size, 0, puzzle.id);
    assert.equal(countSolutions(puzzle.givens), 1, puzzle.id);
    assert.ok(puzzle.givens.every((value, i) => value === 0 || value === puzzle.solution[i]), puzzle.id);
  }
});

test('solution counter caps search and preserves caller state', () => {
  const empty = Array(81).fill(0);
  assert.equal(countSolutions(empty), 2);
  assert.equal(countSolutions(empty, 1), 1);
  assert.deepEqual(empty, Array(81).fill(0));
  const invalid = empty.slice();
  invalid[0] = invalid[1] = 4;
  assert.equal(countSolutions(invalid), 0);
  assert.equal(countSolutions(Array(80).fill(0)), 0);
  assert.equal(countSolutions(Array(81)), 0);
  assert.equal(countSolutions(empty, 0), 0);
});

test('conflicts identifies both cells in row, column and box duplicates', () => {
  for (const other of [1, 9, 10]) {
    const board = Array(81).fill(0);
    board[0] = board[other] = 5;
    assert.deepEqual([...conflicts(board)].sort((a, b) => a - b), [0, other]);
  }
});

test('candidates respect all three constraints and reject occupied cells', () => {
  const board = Array(81).fill(0);
  board[1] = 1;
  board[9] = 2;
  board[10] = 3;
  assert.deepEqual(candidates(board, 0), [4, 5, 6, 7, 8, 9]);
  assert.deepEqual(candidates(board, 1), []);
  assert.deepEqual(candidates(board, -1), []);
  assert.deepEqual(candidates(board, 81), []);
  assert.equal(isComplete(board), false);
  assert.equal(isComplete(Array(81).fill(1)), false);
});

test('logical hints solve easy catalog boards without changing givens', () => {
  for (const puzzle of PUZZLES.filter(p => p.difficulty === 'easy')) {
    const board = puzzle.givens.slice();
    for (let step = 0; step < 81 && !isComplete(board); step++) {
      const before = board.slice();
      const hint = findHint(board, puzzle.givens);
      assert.deepEqual(board, before, 'hint must be read-only');
      assert.ok(hint, `no logical hint for ${puzzle.id}`);
      assert.equal(puzzle.givens[hint.index], 0);
      assert.equal(board[hint.index], 0);
      assert.equal(hint.value, puzzle.solution[hint.index]);
      assert.ok(hint.explanation.length > 10);
      board[hint.index] = hint.value;
    }
    assert.equal(isComplete(board), true, puzzle.id);
    assert.equal(findHint(board, puzzle.givens), null);
  }
});

test('hints decline ambiguous boards and conflicting or altered clues', () => {
  const empty = Array(81).fill(0);
  assert.equal(findHint(empty, empty), null);
  const conflict = empty.slice();
  conflict[0] = conflict[1] = 1;
  assert.equal(findHint(conflict, empty), null);
  const puzzle = PUZZLES[0];
  const changed = puzzle.givens.slice();
  const index = changed.findIndex(value => value !== 0);
  changed[index] = 0;
  assert.equal(findHint(changed, puzzle.givens), null);
});

test('hidden singles provide a logical hint when no cell has one candidate', () => {
  const board = [...'037129008804375009002648000201964030000837010000512900075296000000751006020483701'].map(Number);
  const givens = PUZZLES.find(puzzle => puzzle.id === 'medium-1')!.givens;
  assert.equal(board.some((value, i) => value === 0 && candidates(board, i).length === 1), false);
  const hint = findHint(board, givens);
  assert.equal(hint?.index, 35);
  assert.equal(hint?.value, 7);
  assert.match(hint!.explanation, /하나뿐/);
});

test('new games avoid the previous puzzle and return isolated board copies', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const first = getPuzzle(difficulty);
    const next = getPuzzle(difficulty, first.id);
    assert.equal(next.difficulty, difficulty);
    assert.notEqual(next.id, first.id);
    const original = PUZZLES.find(p => p.id === first.id)!;
    first.givens[0] = -1;
    first.solution[0] = -1;
    assert.notEqual(original.givens[0], -1);
    assert.notEqual(original.solution[0], -1);
  }
});
