import { getPuzzle, PUZZLES, type Difficulty, type Puzzle } from './game';

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
