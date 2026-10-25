import { candidates, conflicts, findHint, getPuzzle, isComplete, PUZZLES, type Difficulty, type Puzzle } from './game';
import { HINT_LIMITS, type HintLimits } from './policy';

export interface Snapshot { board: number[]; notes: number[][] }
export interface Session extends Snapshot {
  version: 1; puzzleId: string; elapsed: number; hints: number; history: Snapshot[];
}
export const STORAGE_KEY = 'haru-sudoku:v1';
export function createSession(difficulty: Difficulty, excludeId?: string): Session {
  const puzzle = getPuzzle(difficulty, excludeId);
  return { version: 1, puzzleId: puzzle.id, board: [...puzzle.givens], notes: Array.from({ length: 81 }, () => []), elapsed: 0, hints: 0, history: [] };
}
export function puzzleFor(session: Session): Puzzle { return PUZZLES.find(p => p.id === session.puzzleId)!; }
const integer = (n: unknown, max: number) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
function validSnapshot(value: unknown, puzzle: Puzzle): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Snapshot;
  return Array.isArray(s.board) && s.board.length === 81 && s.board.every((v, i) => integer(v, 9) && (!puzzle.givens[i] || v === puzzle.givens[i]))
    && Array.isArray(s.notes) && s.notes.length === 81 && s.notes.every((n, i) => Array.isArray(n) && n.length <= 9 && n.every(v => integer(v, 9) && v > 0) && new Set(n).size === n.length && (!s.board[i] || n.length === 0));
}
export function restoreSession(raw: string | null): Session | null {
  try {
    if (!raw) return null;
    const value = JSON.parse(raw) as Session;
    const puzzle = PUZZLES.find(p => p.id === value?.puzzleId);
    if (!puzzle || value.version !== 1 || !validSnapshot(value, puzzle) || !integer(value.elapsed, 31536000) || !integer(value.hints, 1000000)
      || !Array.isArray(value.history) || value.history.length > 100 || !value.history.every(s => validSnapshot(s, puzzle))) return null;
    return value;
  } catch { return null; }
}
export function enterValue(session: Session, index: number, value: number, memo = false): Session {
  if (!integer(index, 80) || !integer(value, 9) || puzzleFor(session).givens[index]) return session;
  if (memo && session.board[index]) return session;
  if (value && session.board[index] !== value && completedDigits(session.board).has(value)
    && !(memo && session.notes[index].includes(value))) return session;
  const board = [...session.board];
  const notes = session.notes.map(n => [...n]);
  if (memo && value) notes[index] = notes[index].includes(value) ? notes[index].filter(n => n !== value) : [...notes[index], value].sort();
  else { board[index] = value; notes[index] = []; }
  if (JSON.stringify({board, notes}) === JSON.stringify({board:session.board, notes:session.notes})) return session;
  return { ...session, board, notes, history: [...session.history, { board: session.board, notes: session.notes }].slice(-100) };
}
export function undo(session: Session): Session {
  const previous = session.history.at(-1);
  return previous ? { ...session, ...previous, history: session.history.slice(0, -1) } : session;
}

/** A full digit disappears from the pad; clearing or undoing an entry restores it. */
export function completedDigits(board: number[]): Set<number> {
  const counts = Array(10).fill(0) as number[];
  for (const value of board) if (value >= 1 && value <= 9) counts[value]++;
  return new Set(counts.flatMap((count, value) => value > 0 && count >= 9 ? [value] : []));
}

/** One-shot candidate refresh. Keep this entire action as one undo step. */
export function fillAllNotes(session: Session): Session {
  if (conflicts(session.board).size || isComplete(session.board)) return session;
  const notes = session.board.map((value, i) => value ? [] : candidates(session.board, i));
  if (JSON.stringify(notes) === JSON.stringify(session.notes)) return session;
  return { ...session, notes, history: [...session.history, { board: session.board, notes: session.notes }].slice(-100) };
}

export function remainingHints(session: Session, limits: HintLimits = HINT_LIMITS): number | null {
  const limit = limits[puzzleFor(session).difficulty];
  return limit === null ? null : Math.max(0, limit - session.hints);
}

export function applyHint(session: Session, limits: HintLimits = HINT_LIMITS): { session: Session; message: string; index?: number } {
  if (isComplete(session.board)) return { session, message: '이미 완성한 퍼즐이에요.' };
  if (remainingHints(session, limits) === 0) return { session, message: '이 난이도에서 사용할 수 있는 힌트를 모두 사용했어요.' };
  const puzzle = puzzleFor(session);
  if (session.board.some((value, i) => value && value !== puzzle.solution[i])) {
    return { session, message: '입력한 숫자 중 정답과 맞지 않는 숫자가 있어요. 먼저 다시 살펴보세요.' };
  }
  const hint = findHint(session.board, puzzle.givens);
  if (!hint) return { session, message: '기본 단일 후보 기법으로 설명할 수 있는 힌트를 찾지 못했어요. 후보 메모를 살펴보세요.' };
  const next = enterValue(session, hint.index, hint.value);
  if (next === session) return { session, message: '이 칸에는 힌트를 적용할 수 없어요.' };
  return { session: { ...next, hints: session.hints + 1 }, message: hint.explanation, index: hint.index };
}
