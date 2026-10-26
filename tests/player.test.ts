import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES } from '../src/game.ts';
import { createSession } from '../src/session.ts';
import { abandonRecord, calendarDays, dailyDifficulty, dailySeed, EMPTY_PROFILE, koreaDayKey, restoreProfile, summarizeProfile, upsertRecord, type GameRecord, type PlayerProfile } from '../src/player.ts';

const START = '2026-10-26T00:00:00.000Z';
const END = '2026-10-26T00:10:00.000Z';
function fixture(runId = 'run-1') {
  return { ...createSession(PUZZLES[0]), runId, startedAt: START, mode: 'classic' as const, elapsed: 120, mistakes: 2, hints: 1, advancedNotes: 3 };
}
function record(overrides: Partial<GameRecord> = {}): GameRecord {
  return { id: 'record-1', puzzleId: 'easy-1', difficulty: 'easy', mode: 'classic', startedAt: START,
    elapsed: 100, mistakes: 0, hints: 0, advancedNotes: 0, status: 'playing', ...overrides };
}

test('profile updates a run once, preserves first start and freezes completed results on replay', () => {
  const initial = fixture();
  const first = upsertRecord(EMPTY_PROFILE, initial, END);
  assert.equal(EMPTY_PROFILE.records.length, 0);
  assert.equal(first.records.length, 1);
  assert.equal(first.records[0].status, 'playing');
  assert.equal(first.records[0].startedAt, START);
  assert.equal(upsertRecord(first, initial, END), first, 'unchanged timer/profile renders should be a no-op');
  const second = upsertRecord(first, { ...initial, elapsed: 130, startedAt: END }, END);
  assert.equal(second.records.length, 1);
  assert.equal(second.records[0].elapsed, 130);
  assert.equal(second.records[0].startedAt, START);
  assert.equal(first.records[0].elapsed, 120, 'prior profile remains immutable');
  const complete = { ...initial, elapsed: 140, board: [...PUZZLES[0].solution] };
  const finished = upsertRecord(second, complete, END);
  assert.equal(finished.records[0].status, 'completed');
  assert.equal(finished.records[0].finishedAt, END);
  assert.equal(upsertRecord(finished, complete, '2026-10-27T00:00:00.000Z'), finished, 'StrictMode completion cannot duplicate or retimestamp a result');
  assert.equal(upsertRecord(finished, initial, END), finished, 'stale unfinished save cannot downgrade completion');
});

test('legacy records use stable fallback IDs and abandonment applies only to unfinished runs', () => {
  const legacy = createSession(PUZZLES[0]);
  const profile = upsertRecord(EMPTY_PROFILE, legacy, START);
  assert.equal(profile.records[0].id, `legacy:${legacy.puzzleId}`);
  assert.equal(upsertRecord(profile, legacy, END), profile);
  assert.equal(abandonRecord(profile, 'missing', END), profile);
  const abandoned = abandonRecord(profile, profile.records[0].id, END);
  assert.equal(abandoned.records[0].status, 'abandoned');
  assert.equal(abandoned.records[0].finishedAt, END);
  assert.equal(abandonRecord(abandoned, profile.records[0].id, END), abandoned);
  assert.equal(upsertRecord(abandoned, legacy, END), abandoned);
  assert.equal(profile.records[0].status, 'playing');
});

test('profile restoration rejects malformed rows independently and deduplicates terminal results', () => {
  for (const raw of [null, '', '{', '{}', 'null', '[]', '{"version":2,"records":[]}']) assert.deepEqual(restoreProfile(raw), EMPTY_PROFILE);
  const completed = record({ status: 'completed', finishedAt: END });
  const corruptions: Partial<GameRecord>[] = [
    { id: '' }, { elapsed: -1 }, { elapsed: 1.5 }, { hints: -1 }, { advancedNotes: 1000001 },
    { mistakes: Infinity }, { difficulty: 'unknown' as 'easy' }, { startedAt: 'bad' }, { startedAt: '1' },
    { startedAt: '2026-02-30T00:00:00.000Z' },
    { status: 'completed', finishedAt: undefined }, { finishedAt: '2020-01-01T00:00:00.000Z' },
    { mode: 'daily', dayKey: '2026-02-30' }, { mode: 'daily', dayKey: undefined },
  ];
  const rows = [record(), completed, record({ elapsed: 999 }), ...corruptions.map((change, i) => record({ id: `bad-${i}`, ...change })), record({ id: 'valid-2' })];
  const restored = restoreProfile(JSON.stringify({ version: 1, records: rows }));
  assert.equal(restored.records.length, 2);
  assert.equal(restored.records[0].status, 'completed');
  assert.equal(restored.records[0].elapsed, completed.elapsed);
  assert.deepEqual(restoreProfile(JSON.stringify(restored)), restored);
});

test('both imported profiles and new records retain at most the latest 500 runs', () => {
  const records = Array.from({ length: 505 }, (_, i) => record({ id: `record-${i}` }));
  const restored = restoreProfile(JSON.stringify({ version: 1, records }));
  assert.equal(restored.records.length, 500);
  assert.equal(restored.records[0].id, 'record-5');
  const updated = upsertRecord(restored, fixture('newest'), END);
  assert.equal(updated.records.length, 500);
  assert.equal(updated.records[0].id, 'record-6');
  assert.equal(updated.records.at(-1)!.id, 'newest');
});

test('statistics use completed timing, all-run totals and mode/difficulty filters', () => {
  const profile: PlayerProfile = { version: 1, records: [
    record({ id: 'a', elapsed: 60, hints: 1, mistakes: 2, status: 'completed', finishedAt: END }),
    record({ id: 'b', difficulty: 'hard', elapsed: 90, hints: 2, mistakes: 3, mode: 'daily', dayKey: '2026-10-26', status: 'completed', finishedAt: END }),
    record({ id: 'c', difficulty: 'hard', elapsed: 150, mode: 'daily', dayKey: '2026-10-26', status: 'completed', finishedAt: END }),
    record({ id: 'd', elapsed: 30, hints: 3, mistakes: 1, status: 'abandoned', finishedAt: END }),
  ] };
  assert.deepEqual(summarizeProfile(profile), { played: 4, completed: 3, completionRate: 75, bestSeconds: 60, averageSeconds: 100, totalSeconds: 330, totalHints: 6, totalMistakes: 6, dailyCompleted: 1 });
  assert.deepEqual(summarizeProfile(profile, 'hard', 'daily'), { played: 2, completed: 2, completionRate: 100, bestSeconds: 90, averageSeconds: 120, totalSeconds: 240, totalHints: 2, totalMistakes: 3, dailyCompleted: 1 });
  assert.equal(summarizeProfile(profile, 'easy', 'classic').completionRate, 50);
  assert.deepEqual(summarizeProfile(EMPTY_PROFILE), { played: 0, completed: 0, completionRate: 0, bestSeconds: null, averageSeconds: null, totalSeconds: 0, totalHints: 0, totalMistakes: 0, dailyCompleted: 0 });
});

test('Korean daily date, seed and month calendar are deterministic across midnight and leap years', () => {
  assert.equal(koreaDayKey(new Date('2026-10-25T14:59:59.000Z')), '2026-10-25');
  assert.equal(koreaDayKey(new Date('2026-10-25T15:00:00.000Z')), '2026-10-26');
  assert.equal(dailySeed('2026-10-26'), dailySeed('2026-10-26'));
  assert.notEqual(dailySeed('2026-10-25'), dailySeed('2026-10-26'));
  assert.ok(Number.isInteger(dailySeed('2026-10-26')) && dailySeed('2026-10-26') >= 0);
  assert.equal(dailyDifficulty('2026-10-26'), 'medium');
  assert.deepEqual(calendarDays(2024, 2).slice(-2), ['2024-02-28', '2024-02-29']);
  assert.equal(calendarDays(2026, 2).length, 28);
  assert.equal(calendarDays(2026, 10)[0], '2026-10-01');
  assert.equal(calendarDays(2026, 10).at(-1), '2026-10-31');
  assert.deepEqual(calendarDays(2026, 13), []);
  assert.deepEqual(calendarDays(2026, 0), []);
  assert.deepEqual(calendarDays(NaN, 1), []);
  assert.throws(() => dailySeed('2026-02-30'), RangeError);
  assert.throws(() => dailyDifficulty('invalid'), RangeError);
  assert.throws(() => koreaDayKey(new Date('invalid')), RangeError);
});

test('backward clock changes keep completion and abandonment timestamps internally consistent', () => {
  const session = fixture();
  const beforeStart = '2025-01-01T00:00:00.000Z';
  const complete = upsertRecord(EMPTY_PROFILE, { ...session, board: [...PUZZLES[0].solution] }, beforeStart);
  assert.equal(complete.records[0].finishedAt, START);
  const abandoned = abandonRecord(upsertRecord(EMPTY_PROFILE, session, END), session.runId, beforeStart);
  assert.equal(abandoned.records[0].finishedAt, START);
  assert.equal(restoreProfile(JSON.stringify(abandoned)).records.length, 1);
});
