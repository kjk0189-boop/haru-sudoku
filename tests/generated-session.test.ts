import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, type Difficulty } from '../src/game.ts';
import { generatePuzzle, type GeneratedPuzzle } from '../src/generator.ts';
import { readRecent, rememberPuzzle } from '../src/generator-client.ts';
import { applyHint, createSession, enterValue, puzzleFor, remainingHints, restartSession, restoreSession, undo } from '../src/session.ts';
import { STARTER_PUZZLE } from '../src/starter.ts';

test('first-launch starter is certified easy and can restore without any catalog entry', () => {
  const session = createSession(STARTER_PUZZLE);
  assert.equal(session.certificate?.solved, true);
  assert.equal(session.certificate?.difficulty, 'easy');
  assert.deepEqual(restoreSession(JSON.stringify(session)), session);
  assert.equal(PUZZLES.some(p => p.id === session.puzzleId), false);
});

const generated = new Map<Difficulty, GeneratedPuzzle>();
function fixture(difficulty: Difficulty = 'easy'): GeneratedPuzzle {
  let puzzle = generated.get(difficulty);
  if (!puzzle) {
    puzzle = generatePuzzle(difficulty, { seed: 42, deadlineMs: 30000 }) ?? undefined;
    assert.ok(puzzle, `${difficulty}: deterministic fixture must pass generation`);
    generated.set(difficulty, puzzle);
  }
  return puzzle;
}

test('each generated tier restores its exact puzzle, progress and recomputed certificate', () => {
  for (const tier of ['easy', 'medium', 'hard', 'expert'] as const) {
    const puzzle = fixture(tier);
    let session = createSession(puzzle);
    const index = session.board.indexOf(0);
    session = enterValue(session, index, puzzle.solution[index], true);
    session = { ...enterValue(session, index, puzzle.solution[index]), elapsed: 17, hints: 2 };
    const restored = restoreSession(JSON.stringify(session));
    assert.deepEqual(restored, session);
    assert.deepEqual(puzzleFor(restored!), session.puzzle);
    assert.equal(restored!.certificate!.difficulty, tier);
    assert.deepEqual(undo(restored!).notes[index], [puzzle.solution[index]]);
    const forged = JSON.parse(JSON.stringify(session));
    forged.certificate = { solved: true, difficulty: 'invented' };
    assert.deepEqual(restoreSession(JSON.stringify(forged))!.certificate, session.certificate);
  }
});

test('generated saves reject invalid solution, ambiguous givens and mismatched logical tier', () => {
  const session = createSession(fixture());
  const invalid = JSON.parse(JSON.stringify(session));
  invalid.puzzle.solution[0] = invalid.puzzle.solution[1];
  assert.equal(restoreSession(JSON.stringify(invalid)), null);

  const ambiguous = JSON.parse(JSON.stringify(session));
  ambiguous.puzzle.givens = Array(81).fill(0);
  ambiguous.puzzle.givens[0] = ambiguous.puzzle.solution[0];
  ambiguous.puzzleId = ambiguous.puzzle.id = `gen-42-${ambiguous.puzzle.givens.join('')}`;
  ambiguous.board = ambiguous.puzzle.givens.slice();
  assert.equal(restoreSession(JSON.stringify(ambiguous)), null);

  const mislabeled = JSON.parse(JSON.stringify(session));
  mislabeled.puzzle.difficulty = 'expert';
  assert.equal(restoreSession(JSON.stringify(mislabeled)), null);
});

test('restoration rejects custom-id grading bypass, altered fingerprints and catalog impersonation', () => {
  const original = createSession(fixture());
  const custom = JSON.parse(JSON.stringify(original));
  custom.puzzleId = custom.puzzle.id = 'custom';
  custom.puzzle.difficulty = 'expert';
  assert.equal(restoreSession(JSON.stringify(custom)), null, 'unrecognized ID cannot bypass grade validation');

  const fingerprint = JSON.parse(JSON.stringify(original));
  const clue = fingerprint.puzzle.givens.findIndex((value: number) => value !== 0);
  fingerprint.puzzle.givens[clue] = 0;
  fingerprint.board[clue] = 0;
  assert.equal(restoreSession(JSON.stringify(fingerprint)), null, 'embedded givens must match ID fingerprint');

  const disguised = JSON.parse(JSON.stringify(original));
  disguised.puzzleId = disguised.puzzle.id = PUZZLES[0].id;
  assert.equal(restoreSession(JSON.stringify(disguised)), null, 'catalog ID cannot identify a different generated puzzle');

  const legacy = createSession(PUZZLES[0]);
  assert.deepEqual(restoreSession(JSON.stringify(legacy)), legacy, 'unchanged embedded catalog puzzle is accepted');
  const changedTier = JSON.parse(JSON.stringify(legacy));
  changedTier.puzzle.difficulty = 'expert';
  assert.equal(restoreSession(JSON.stringify(changedTier)), null, 'catalog label cannot change');
  const changedClues = JSON.parse(JSON.stringify(legacy));
  const index = changedClues.puzzle.givens.findIndex((value: number) => value !== 0);
  changedClues.puzzle.givens[index] = 0;
  changedClues.board[index] = 0;
  assert.equal(restoreSession(JSON.stringify(changedClues)), null, 'catalog clue layout cannot change');
});

test('legacy fixture saves without embedded puzzle retain their original tier and state', () => {
  for (const puzzle of PUZZLES) {
    const legacy = {
      version: 1, puzzleId: puzzle.id, board: puzzle.givens.slice(),
      notes: Array.from({ length: 81 }, () => []), elapsed: 29, hints: 3, history: [],
    };
    const restored = restoreSession(JSON.stringify(legacy));
    assert.deepEqual(restored, legacy);
    assert.equal(puzzleFor(restored!).id, puzzle.id);
    assert.equal(puzzleFor(restored!).difficulty, puzzle.difficulty);
  }
});

test('restart retains exact generated givens and solution and clears player progress', () => {
  const puzzle = fixture('expert');
  const initial = createSession(puzzle);
  const index = initial.board.indexOf(0);
  const progressed = { ...enterValue(initial, index, puzzle.solution[index]), elapsed: 31, hints: 7 };
  const restarted = restartSession(progressed);
  assert.deepEqual(restarted, initial);
  assert.notEqual(restarted.board, initial.board);
  assert.deepEqual(restoreSession(JSON.stringify(restarted)), initial);
});

test('expert hints respect configurable limits and undo does not refund usage', () => {
  const initial = createSession(fixture('expert'));
  const limits = { easy: null, medium: null, hard: null, expert: 1 };
  const hinted = applyHint(initial, limits);
  assert.ok(hinted.index !== undefined);
  assert.equal(hinted.session.board[hinted.index!], puzzleFor(initial).solution[hinted.index!]);
  assert.equal(remainingHints(hinted.session, limits), 0);
  assert.equal(applyHint(hinted.session, limits).session, hinted.session);
  const reverted = undo(hinted.session);
  assert.deepEqual(reverted.board, initial.board);
  assert.equal(reverted.hints, 1);
  assert.equal(applyHint(reverted, limits).session, reverted);
});

test('expert logical hints continue through advanced eliminations until completion', () => {
  let session = createSession(fixture('expert'));
  let advanced = false;
  const empty = session.board.filter(v => !v).length;
  for (let step = 0; step < empty; step++) {
    const hint = applyHint(session);
    assert.notEqual(hint.session, session, `hint ${step}: ${hint.message}`);
    assert.ok(hint.index !== undefined);
    assert.equal(hint.session.board[hint.index!], puzzleFor(session).solution[hint.index!]);
    advanced ||= hint.message.includes('X-Wing');
    session = hint.session;
  }
  assert.deepEqual(session.board, puzzleFor(session).solution);
  assert.equal(session.hints, empty);
  assert.equal(advanced, true);
});

test('recent puzzles reject malformed storage, deduplicate and retain only the latest 80', () => {
  for (const raw of [null, '{', 'null', '{}', '1', 'true']) assert.deepEqual(readRecent(raw), []);
  const key = (index: number) => String(index).padStart(81, '0');
  assert.deepEqual(readRecent(JSON.stringify([key(1), key(1), 'x', '0'.repeat(80), 42, key(2)])), [key(1), key(2)]);
  const keys = Array.from({ length: 90 }, (_, i) => key(i));
  assert.deepEqual(readRecent(JSON.stringify(keys)), keys.slice(-80));
  const recent = keys.slice(-80);
  const copied = recent.slice();
  const result = rememberPuzzle(recent, key(15));
  assert.deepEqual(result, [...recent.filter(v => v !== key(15)), key(15)]);
  assert.deepEqual(recent, copied);
  assert.deepEqual(rememberPuzzle(recent, key(91)), [...recent.slice(1), key(91)]);
});
