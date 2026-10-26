import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES } from '../src/game.ts';
import { generatePuzzle } from '../src/generator.ts';
import { emptyLibrary, identifySession, putSession, restoreLibrary } from '../src/library.ts';
import { dailyDifficulty, dailySeed, EMPTY_PROFILE, koreaDayKey, summarizeProfile, upsertRecord } from '../src/player.ts';
import { createSession, enterValue, restoreSession, type Session } from '../src/session.ts';

const START = '2026-10-26T00:00:00.000Z';
const FINISH = '2026-10-26T00:05:00.000Z';
const make = (mode: 'classic' | 'daily' = 'classic', dayKey?: string) => identifySession(createSession(PUZZLES[0]), mode, dayKey);

test('legacy single-game saves migrate with persistent run identity and default counters', () => {
  const legacy = { ...createSession(PUZZLES[0]), elapsed: 23, hints: 2 };
  const index = legacy.board.indexOf(0);
  const progressed = enterValue(legacy, index, PUZZLES[0].solution[index]);
  const migrated = restoreLibrary(null, JSON.stringify(progressed));
  assert.ok(migrated.classic?.runId);
  assert.equal(migrated.classic.mode, 'classic');
  assert.equal(migrated.classic.mistakes, 0);
  assert.equal(migrated.classic.advancedNotes, 0);
  assert.equal(migrated.classic.elapsed, 23);
  assert.equal(migrated.classic.board[index], PUZZLES[0].solution[index]);
  assert.ok(Number.isFinite(Date.parse(migrated.classic.startedAt!)));
  assert.deepEqual(migrated.daily, {});
  const restored = restoreLibrary(JSON.stringify(migrated), JSON.stringify(legacy));
  assert.deepEqual(restored, migrated);
  assert.notEqual(restored.classic, migrated.classic);
});

test('classic and daily slots preserve independent notes, counters and resume identities', () => {
  const classic = make();
  const dayOne = make('daily', '2026-10-25');
  const dayTwo = make('daily', '2026-10-26');
  assert.notEqual(classic.runId, dayOne.runId);
  assert.notEqual(dayOne.runId, dayTwo.runId);
  const empty = classic.board.indexOf(0);
  const noted = { ...enterValue(dayOne, empty, 3, true), hints: 4, mistakes: 2, advancedNotes: 1 };
  const first = putSession(emptyLibrary(), classic);
  const second = putSession(first, noted);
  const all = putSession(second, dayTwo);
  assert.deepEqual(first.daily, {}, 'slot updates do not mutate the previous library');
  assert.equal(all.classic, classic);
  assert.deepEqual(all.classic!.notes[empty], []);
  assert.deepEqual(all.daily['2026-10-25'].notes[empty], [3]);
  assert.deepEqual(all.daily['2026-10-26'].notes[empty], []);
  const restored = restoreLibrary(JSON.stringify(all), null);
  assert.equal(restored.daily['2026-10-25'].runId, noted.runId);
  assert.equal(restored.daily['2026-10-25'].hints, 4);
  assert.equal(restored.daily['2026-10-25'].mistakes, 2);
  assert.equal(restored.daily['2026-10-25'].advancedNotes, 1);
  assert.equal(restored.classic!.runId, classic.runId);
});

test('daily slots keep the latest 30 accessed dates, with touched old dates promoted', () => {
  let library = emptyLibrary();
  const days = Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
  for (const day of days.slice(0, 30)) library = putSession(library, make('daily', day));
  const oldest = library.daily[days[0]];
  library = putSession(library, { ...oldest, elapsed: 99 });
  assert.equal(Object.keys(library.daily).at(-1), days[0]);
  library = putSession(library, make('daily', days[30]));
  assert.equal(Object.keys(library.daily).length, 30);
  assert.ok(library.daily[days[0]], 'recently resumed first date remains available');
  assert.equal(library.daily[days[1]], undefined, 'least recently accessed second date is evicted');
  assert.equal(library.daily[days[0]].elapsed, 99);
  const restored = restoreLibrary(JSON.stringify(library), null);
  assert.deepEqual(Object.keys(restored.daily), Object.keys(library.daily));
});

test('malformed library rows do not overwrite valid slots and legacy fallback is controlled', () => {
  const classic = make();
  const day = make('daily', '2026-10-26');
  const data = { version: 1, classic, daily: {
    '2026-10-26': day,
    '2026-10-25': day, // Valid save in the wrong date slot must not be accepted.
    'broken': { bad: true },
  } };
  const restored = restoreLibrary(JSON.stringify(data), null);
  assert.deepEqual(Object.keys(restored.daily), ['2026-10-26']);
  assert.equal(restored.classic!.runId, classic.runId);
  assert.deepEqual(restoreLibrary(JSON.stringify(emptyLibrary()), JSON.stringify(classic)), emptyLibrary(), 'valid empty new schema must not resurrect legacy data');
  for (const broken of ['{', 'null', '{}', '{"version":2}', '{"version":1,"daily":[]}']) {
    assert.equal(restoreLibrary(broken, JSON.stringify(classic)).classic!.runId, classic.runId);
  }
});

test('session metadata rejects malformed identifiers, dates, modes and usage counters', () => {
  const source = make('daily', '2026-10-26');
  const invalid: Partial<Session>[] = [
    { runId: '' }, { runId: 'x'.repeat(201) }, { mode: 'other' as 'daily' },
    { startedAt: 'bad' }, { startedAt: '1' }, { startedAt: '2026-02-30T00:00:00.000Z' },
    { dayKey: undefined }, { dayKey: '2026-02-30' }, { dayKey: '26-10-26' },
    { mistakes: -1 }, { mistakes: 1.5 }, { advancedNotes: -1 }, { advancedNotes: 1000001 },
  ];
  for (const change of invalid) assert.equal(restoreSession(JSON.stringify({ ...source, ...change })), null, JSON.stringify(change));
  assert.ok(restoreSession(JSON.stringify(source)));
  const legacy = createSession(PUZZLES[0]);
  assert.ok(restoreSession(JSON.stringify(legacy)), 'optional metadata must not invalidate existing shipped saves');
});

test('same Korean date generates the same daily board independently of classic history', () => {
  const date = koreaDayKey(new Date('2026-10-25T15:00:00.000Z'));
  assert.equal(date, '2026-10-26');
  const options = { seed: dailySeed(date), deadlineMs: 20000 };
  const first = generatePuzzle(dailyDifficulty(date), options);
  const replay = generatePuzzle(dailyDifficulty(date), { ...options, excludeFingerprints: [] });
  assert.ok(first && replay);
  assert.deepEqual(replay.givens, first.givens);
  assert.deepEqual(replay.solution, first.solution);
  const nextDay = generatePuzzle(dailyDifficulty('2026-10-27'), { seed: dailySeed('2026-10-27'), deadlineMs: 20000 });
  assert.ok(nextDay);
  assert.notEqual(nextDay.fingerprint, first.fingerprint);
  const excluded = generatePuzzle(dailyDifficulty(date), { ...options, excludeFingerprints: [first.fingerprint] });
  assert.ok(excluded);
  assert.notEqual(excluded.fingerprint, first.fingerprint, 'daily requests must deliberately omit classic recent-history exclusions');
});

test('completed migrated games remain a single stable record through saves and replays', () => {
  const completed = { ...createSession(PUZZLES[0]), board: [...PUZZLES[0].solution], elapsed: 180, hints: 3 };
  const firstLibrary = restoreLibrary(null, JSON.stringify(completed));
  let profile = upsertRecord(EMPTY_PROFILE, { ...firstLibrary.classic!, startedAt: START }, FINISH);
  const firstRecord = { ...profile.records[0] };
  const afterReload = restoreLibrary(JSON.stringify(firstLibrary), null);
  profile = upsertRecord(profile, afterReload.classic!, '2026-10-27T00:00:00.000Z');
  assert.equal(profile.records.length, 1);
  assert.deepEqual(profile.records[0], firstRecord);
  assert.equal(summarizeProfile(profile).completed, 1);
  assert.equal(summarizeProfile(profile).totalHints, 3);
});
