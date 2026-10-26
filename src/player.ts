import { isComplete, type Difficulty } from './game';
import { puzzleFor, type Session } from './session';
import { GENERATION_VERSION } from './difficulty-policy';

export type GameMode = 'classic' | 'daily';
export interface GameRecord {
  id: string;
  puzzleId: string;
  difficulty: Difficulty;
  mode: GameMode;
  dayKey?: string;
  startedAt: string;
  finishedAt?: string;
  elapsed: number;
  mistakes: number;
  hints: number;
  advancedNotes: number;
  status: 'playing' | 'completed' | 'abandoned';
}
export interface PlayerProfile { version: 1; records: GameRecord[] }
export const EMPTY_PROFILE: PlayerProfile = { version: 1, records: [] };

type TrackedSession = Session & {
  runId?: string;
  mode?: GameMode;
  dayKey?: string;
  startedAt?: string;
  mistakes?: number;
  advancedNotes?: number;
};
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const integer = (value: unknown, maximum: number) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum;
const identifier = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 200;
const instant = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && validDayKey(value.slice(0, 10)) && Number.isFinite(Date.parse(value));

function validDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validRecord(value: unknown): value is GameRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as GameRecord;
  return identifier(record.id) && identifier(record.puzzleId) && DIFFICULTIES.includes(record.difficulty)
    && (record.mode === 'classic' || record.mode === 'daily')
    && (record.dayKey === undefined || validDayKey(record.dayKey))
    && (record.mode !== 'daily' || validDayKey(record.dayKey))
    && instant(record.startedAt) && (record.finishedAt === undefined || instant(record.finishedAt))
    && (record.status === 'playing' || record.status === 'completed' || record.status === 'abandoned')
    && (record.status === 'playing' || instant(record.finishedAt))
    && (record.finishedAt === undefined || Date.parse(record.finishedAt) >= Date.parse(record.startedAt))
    && integer(record.elapsed, 31536000) && integer(record.mistakes, 1000000)
    && integer(record.hints, 1000000) && integer(record.advancedNotes, 1000000);
}

/** Skip damaged records independently so one bad row cannot erase valid history. */
export function restoreProfile(raw: string | null): PlayerProfile {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object' || (value as PlayerProfile).version !== 1 || !Array.isArray((value as PlayerProfile).records)) return { version: 1, records: [] };
    const unique = new Map<string, GameRecord>();
    for (const record of (value as PlayerProfile).records) {
      if (!validRecord(record)) continue;
      const previous = unique.get(record.id);
      if (previous && previous.status !== 'playing') continue;
      unique.set(record.id, { ...record });
    }
    return { version: 1, records: [...unique.values()].slice(-500) };
  } catch { return { version: 1, records: [] }; }
}

/** The same run is updated, never appended twice by React StrictMode or reloads. */
export function upsertRecord(profile: PlayerProfile, session: TrackedSession, now = new Date().toISOString()): PlayerProfile {
  const id = identifier(session.runId) ? session.runId! : `legacy:${session.puzzleId}`;
  const previous = profile.records.find(record => record.id === id);
  if (previous && previous.status !== 'playing') return profile;
  const puzzle = puzzleFor(session);
  const completed = isComplete(session.board);
  const when = instant(now) ? now : new Date().toISOString();
  const startedAt = previous?.startedAt ?? (instant(session.startedAt) ? session.startedAt : when);
  // Device clock changes must not create internally inconsistent end timestamps.
  const finishedAt = Date.parse(when) >= Date.parse(startedAt) ? when : startedAt;
  const mode = session.mode === 'daily' && validDayKey(session.dayKey) ? 'daily' : 'classic';
  const record: GameRecord = {
    id, puzzleId: session.puzzleId, difficulty: puzzle.difficulty, mode,
    ...(mode === 'daily' ? { dayKey: session.dayKey } : {}),
    startedAt, ...(completed ? { finishedAt } : {}), elapsed: session.elapsed,
    mistakes: session.mistakes ?? 0, hints: session.hints, advancedNotes: session.advancedNotes ?? 0,
    status: completed ? 'completed' : 'playing',
  };
  if (!validRecord(record)) return profile;
  if (previous && JSON.stringify(previous) === JSON.stringify(record)) return profile;
  const records = previous ? profile.records.map(item => item.id === id ? record : item) : [...profile.records, record];
  return { version: 1, records: records.slice(-500) };
}

export function abandonRecord(profile: PlayerProfile, runId: string, now = new Date().toISOString()): PlayerProfile {
  const existing = profile.records.find(record => record.id === runId);
  if (!existing || existing.status !== 'playing') return profile;
  const when = instant(now) && Date.parse(now) >= Date.parse(existing.startedAt) ? now : existing.startedAt;
  return { version: 1, records: profile.records.map(record => record.id === runId ? { ...record, status: 'abandoned', finishedAt: when } : record) };
}

/** Time/hint/mistake totals include all recorded runs; best and average use completions only. */
export function summarizeProfile(profile: PlayerProfile, difficulty?: Difficulty, mode?: GameMode): {
  played: number; completed: number; completionRate: number; bestSeconds: number | null;
  averageSeconds: number | null; totalSeconds: number; totalHints: number; totalMistakes: number; dailyCompleted: number;
} {
  const records = profile.records.filter(record => (!difficulty || record.difficulty === difficulty) && (!mode || record.mode === mode));
  const completed = records.filter(record => record.status === 'completed');
  const completedSeconds = completed.reduce((sum, record) => sum + record.elapsed, 0);
  return {
    played: records.length, completed: completed.length,
    completionRate: records.length ? Math.round(completed.length / records.length * 100) : 0,
    bestSeconds: completed.length ? Math.min(...completed.map(record => record.elapsed)) : null,
    averageSeconds: completed.length ? Math.round(completedSeconds / completed.length) : null,
    totalSeconds: records.reduce((sum, record) => sum + record.elapsed, 0),
    totalHints: records.reduce((sum, record) => sum + record.hints, 0),
    totalMistakes: records.reduce((sum, record) => sum + record.mistakes, 0),
    dailyCompleted: new Set(completed.filter(record => record.mode === 'daily' && validDayKey(record.dayKey)).map(record => record.dayKey)).size,
  };
}

/** Daily challenges use a fixed Korean calendar date regardless of device timezone. */
export function koreaDayKey(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new RangeError('올바른 날짜가 필요합니다.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(item => item.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Versioned FNV-1a seed. Never mix recent-history exclusions into a daily request. */
export function dailySeed(dayKey: string): number {
  if (!validDayKey(dayKey)) throw new RangeError('올바른 날짜 키가 필요합니다.');
  let hash = 2166136261;
  for (const character of `haru-sudoku:daily:v${GENERATION_VERSION}:${dayKey}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function dailyDifficulty(dayKey: string): Difficulty {
  if (!validDayKey(dayKey)) throw new RangeError('올바른 날짜 키가 필요합니다.');
  return 'medium';
}

export function calendarDays(year: number, month: number): string[] {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) return [];
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(2, '0')}`);
}
