import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES } from '../src/game.ts';
import { createSession, enterValue, puzzleFor, restoreSession, undo, type Session } from '../src/session.ts';

function fixture(): Session {
  const puzzle = PUZZLES[0];
  return {
    version: 1, puzzleId: puzzle.id, board: puzzle.givens.slice(),
    notes: Array.from({ length: 81 }, () => []), elapsed: 34, hints: 2, history: [],
  };
}

test('new sessions use matching puzzle givens and independent note arrays', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = createSession(difficulty);
    const puzzle = puzzleFor(session);
    assert.equal(puzzle.difficulty, difficulty);
    assert.deepEqual(session.board, puzzle.givens);
    assert.notEqual(session.board, puzzle.givens);
    assert.equal(session.elapsed, 0);
    assert.equal(session.hints, 0);
    assert.equal(session.history.length, 0);
    assert.equal(new Set(session.notes).size, 81);
  }
});

test('valid sessions round trip with notes, progress, statistics and undo history', () => {
  let session = fixture();
  const first = session.board.findIndex(value => value === 0);
  const second = session.board.findIndex((value, i) => value === 0 && i !== first);
  session = enterValue(session, first, 3, true);
  session = enterValue(session, second, 8);
  const restored = restoreSession(JSON.stringify(session));
  assert.deepEqual(restored, session);
  assert.notEqual(restored, session);
  assert.deepEqual(undo(restored!).notes[first], [3]);
  assert.equal(undo(restored!).board[second], 0);
});

test('restore safely rejects missing, malformed and incompatible data', () => {
  for (const raw of [null, '', '{', 'null', '[]', 'true', '3', '{}']) {
    assert.equal(restoreSession(raw), null, String(raw));
  }
  const invalid: ((value: Session) => void)[] = [
    s => { s.version = 2 as 1; },
    s => { s.puzzleId = 'unknown-puzzle'; },
    s => { s.board.pop(); },
    s => { s.board[0] = 10; },
    s => { s.board[0] = 1.5; },
    s => { s.board[s.board.findIndex(value => value !== 0)] = 0; },
    s => { s.notes.pop(); },
    s => { s.notes[0] = [0]; },
    s => { s.notes[0] = [10]; },
    s => { s.notes[0] = [2, 2]; },
    s => { s.notes[s.board.findIndex(value => value !== 0)] = [2]; },
    s => { s.elapsed = -1; },
    s => { s.elapsed = 1.5; },
    s => { s.elapsed = 31536001; },
    s => { s.hints = -1; },
    s => { s.hints = 1000001; },
    s => { s.history = Array.from({ length: 101 }, () => ({ board: [...s.board], notes: s.notes.map(n => [...n]) })); },
    s => { s.history = [{ board: [], notes: [] }]; },
    s => {
      const prior = { board: [...s.board], notes: s.notes.map(n => [...n]) };
      prior.board[prior.board.findIndex(value => value !== 0)] = 0;
      s.history = [prior];
    },
  ];
  for (const [index, corrupt] of invalid.entries()) {
    const session = fixture();
    corrupt(session);
    assert.equal(restoreSession(JSON.stringify(session)), null, `corruption ${index}`);
  }
});

test('restore retains wrong user entries so unfinished games can be corrected', () => {
  const session = fixture();
  const index = session.board.findIndex(value => value === 0);
  session.board[index] = session.board[index + 1] || 9;
  assert.deepEqual(restoreSession(JSON.stringify(session)), session);
});

test('input protects fixed clues and rejects invalid indexes and digits', () => {
  const session = fixture();
  const fixed = session.board.findIndex(value => value !== 0);
  const empty = session.board.findIndex(value => value === 0);
  for (const value of [0, 1, 9]) {
    assert.equal(enterValue(session, fixed, value), session);
    assert.equal(enterValue(session, fixed, value, true), session);
  }
  for (const index of [-1, 81, 1.5, NaN]) assert.equal(enterValue(session, index, 1), session);
  for (const value of [-1, 10, 1.5, NaN]) assert.equal(enterValue(session, empty, value), session);
});

test('memo toggles and value input preserve previous snapshots without mutating inputs', () => {
  const initial = fixture();
  const frozen = JSON.stringify(initial);
  const index = initial.board.findIndex(value => value === 0);
  const withNine = enterValue(initial, index, 9, true);
  const withBoth = enterValue(withNine, index, 2, true);
  assert.deepEqual(withBoth.notes[index], [2, 9]);
  assert.equal(withBoth.board[index], 0);
  assert.deepEqual(withNine.notes[index], [9]);
  assert.equal(JSON.stringify(initial), frozen);
  const toggled = enterValue(withBoth, index, 9, true);
  assert.deepEqual(toggled.notes[index], [2]);
  const entered = enterValue(toggled, index, 4);
  assert.equal(entered.board[index], 4);
  assert.deepEqual(entered.notes[index], []);
  assert.deepEqual(toggled.notes[index], [2]);
  assert.equal(enterValue(entered, index, 3, true), entered, 'cannot memo on filled cells');
  assert.equal(enterValue(entered, index, 4), entered, 'unchanged input creates no undo history');
  const cleared = enterValue(entered, index, 0);
  assert.equal(cleared.board[index], 0);
  assert.deepEqual(cleared.notes[index], []);
  assert.equal(entered.board[index], 4);
  assert.deepEqual(undo(entered).notes[index], [2]);
});

test('undo restores board and notes, consumes history, and keeps time and hint usage', () => {
  const initial = fixture();
  const index = initial.board.findIndex(value => value === 0);
  const withMemo = enterValue(initial, index, 6, true);
  const withValue = { ...enterValue(withMemo, index, 2), elapsed: 100, hints: 3 };
  const firstUndo = undo(withValue);
  assert.equal(firstUndo.board[index], 0);
  assert.deepEqual(firstUndo.notes[index], [6]);
  assert.equal(firstUndo.elapsed, 100);
  assert.equal(firstUndo.hints, 3);
  assert.equal(firstUndo.history.length, 1);
  const secondUndo = undo(firstUndo);
  assert.deepEqual(secondUndo.board, initial.board);
  assert.deepEqual(secondUndo.notes, initial.notes);
  assert.equal(secondUndo.history.length, 0);
  assert.equal(undo(secondUndo), secondUndo);
  assert.equal(withValue.board[index], 2);
  assert.equal(withValue.history.length, 2);
});

test('history retains the most recent 100 changes and remains restorable', () => {
  let session = fixture();
  const index = session.board.findIndex(value => value === 0);
  const states = [session.board[index]];
  for (let step = 1; step <= 105; step++) {
    const value = (step - 1) % 9 + 1;
    session = enterValue(session, index, value);
    states.push(value);
    assert.equal(session.history.length, Math.min(step, 100));
  }
  assert.deepEqual(restoreSession(JSON.stringify(session)), session);
  for (let step = 104; step >= 5; step--) {
    session = undo(session);
    assert.equal(session.board[index], states[step]);
  }
  assert.equal(session.history.length, 0);
  assert.equal(undo(session), session);
});
