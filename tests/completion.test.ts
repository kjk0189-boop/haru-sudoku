import test from 'node:test';
import assert from 'node:assert/strict';
import { getCompletionResult } from '../src/completion';
import { PUZZLES } from '../src/game';
import { EMPTY_PROFILE, restoreProfile, upsertRecord, type GameRecord, type PlayerProfile } from '../src/player';
import { createSession, restoreSession, type Session } from '../src/session';

const START = '2026-10-26T00:00:00.000Z';
const END = '2026-10-26T00:10:00.000Z';
function finished(): Session {
  return { ...createSession(PUZZLES[0]), runId: 'current', startedAt: START, mode: 'classic',
    board: [...PUZZLES[0].solution], elapsed: 240, hints: 3 };
}
function historical(overrides: Partial<GameRecord> = {}): GameRecord {
  return { id: 'past', puzzleId: PUZZLES[0].id, difficulty: PUZZLES[0].difficulty,
    mode: 'classic', startedAt: START, finishedAt: END, elapsed: 300, hints: 1,
    advancedNotes: 0, mistakes: 0, status: 'completed', ...overrides };
}

test('first completion includes the just-finished run before it is persisted, without mutating either input', () => {
  const session = finished();
  const before = JSON.stringify({ profile: EMPTY_PROFILE, session });
  assert.deepEqual(getCompletionResult(EMPTY_PROFILE, session), {
    difficulty: PUZZLES[0].difficulty, elapsed: 240, bestSeconds: 240, hints: 3, completedCount: 1,
  });
  assert.equal(JSON.stringify({ profile: EMPTY_PROFILE, session }), before);
});

test('best time and successes combine both modes in this difficulty and exclude other tiers and unfinished runs', () => {
  const profile: PlayerProfile = { version: 1, records: [
    historical({ id: 'classic-fast', elapsed: 120 }),
    historical({ id: 'daily-fastest', elapsed: 90, mode: 'daily', dayKey: '2026-10-25' }),
    historical({ id: 'other-tier', elapsed: 5, difficulty: 'expert' }),
    historical({ id: 'unfinished', elapsed: 10, status: 'playing', finishedAt: undefined }),
    historical({ id: 'abandoned', elapsed: 15, status: 'abandoned' }),
  ] };
  const before = JSON.stringify(profile);
  assert.deepEqual(getCompletionResult(profile, finished()), {
    difficulty: PUZZLES[0].difficulty, elapsed: 240, bestSeconds: 90, hints: 3, completedCount: 3,
  });
  assert.equal(JSON.stringify(profile), before);
});

test('repeat rendering and restored saves keep a single completion and its immutable elapsed time and hint count', () => {
  const session = finished();
  const profile = upsertRecord(EMPTY_PROFILE, session, END);
  const expected = getCompletionResult(profile, session);
  assert.deepEqual(getCompletionResult(profile, { ...session, elapsed: 999, hints: 99 }), expected);
  assert.deepEqual(getCompletionResult(profile, session), expected);
  const restoredSession = restoreSession(JSON.stringify(session));
  assert.ok(restoredSession);
  assert.deepEqual(getCompletionResult(restoreProfile(JSON.stringify(profile)), restoredSession), expected);
  assert.equal(expected?.completedCount, 1);
  assert.equal(profile.records.length, 1);
});

test('incomplete games have no result, including stale unfinished copies of a previously completed run', () => {
  const session = finished();
  const incomplete = { ...session, board: [...PUZZLES[0].givens] };
  assert.equal(getCompletionResult(EMPTY_PROFILE, incomplete), null);
  assert.equal(getCompletionResult(upsertRecord(EMPTY_PROFILE, session, END), incomplete), null);
});

test('legacy sessions use the same stable identity as stored records and cannot duplicate a result', () => {
  const { runId: _runId, ...legacy } = finished();
  const profile = upsertRecord(EMPTY_PROFILE, legacy, END);
  assert.equal(profile.records[0].id, `legacy:${legacy.puzzleId}`);
  assert.equal(getCompletionResult(profile, legacy)?.completedCount, 1);
  assert.equal(getCompletionResult(profile, { ...legacy, elapsed: 1 })?.elapsed, 240);
});
