import { countSolutions, type Difficulty, type Puzzle } from './game';
import { analyze, type Rating } from './logic';

export interface GeneratedPuzzle extends Puzzle {
  rating: Rating;
  fingerprint: string;
  seed: number;
}

export interface GeneratorOptions {
  seed?: number;
  excludeFingerprints?: string[];
  maxAttempts?: number;
  deadlineMs?: number;
}

/** Exact clue layout and values, rather than a potentially colliding short hash. */
export function puzzleFingerprint(givens: number[]): string {
  return givens.join('');
}

function randomSource(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Builds a new complete grid by randomized search, without a catalog template. */
function fullGrid(random: () => number): number[] {
  const board = Array<number>(81).fill(0);
  const rows = Array<number>(9).fill(0);
  const columns = Array<number>(9).fill(0);
  const boxes = Array<number>(9).fill(0);
  function fill(): boolean {
    let chosen = -1;
    let choices: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (board[i]) continue;
      const row = Math.floor(i / 9), column = i % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
      const mask = rows[row] | columns[column] | boxes[box];
      const possible = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(value => !(mask & 1 << value));
      if (!possible.length) return false;
      if (chosen < 0 || possible.length < choices.length) {
        chosen = i;
        choices = possible;
        if (possible.length === 1) break;
      }
    }
    if (chosen < 0) return true;
    const row = Math.floor(chosen / 9), column = chosen % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
    for (const value of shuffled(choices, random)) {
      const bit = 1 << value;
      board[chosen] = value;
      rows[row] |= bit; columns[column] |= bit; boxes[box] |= bit;
      if (fill()) return true;
      board[chosen] = 0;
      rows[row] &= ~bit; columns[column] &= ~bit; boxes[box] &= ~bit;
    }
    return false;
  }
  fill();
  return board;
}

/** Returns only a uniquely solvable, logically certified puzzle of the requested tier.
 * Search is bounded: failure is explicit, never a silently relabelled fallback.
 */
export function generatePuzzle(difficulty: Difficulty, options: GeneratorOptions = {}): GeneratedPuzzle | null {
  if (!['easy', 'medium', 'hard', 'expert'].includes(difficulty)) return null;
  const seed = (options.seed ?? Math.floor(Math.random() * 4294967296)) >>> 0;
  const random = randomSource(seed);
  // Vary the target effort inside the selected tier instead of always accepting
  // the first dense, low-effort grid. The rating boundaries remain unchanged.
  const effortTarget = difficulty === 'easy' ? 65 + Math.floor(random() * 30)
    : difficulty === 'medium' ? 100 + Math.floor(random() * 15) : 0;
  const excluded = new Set(options.excludeFingerprints ?? []);
  const duration = Math.max(0, Math.min(options.deadlineMs ?? 10000, 30000));
  const deadline = performance.now() + duration;
  const maxAttempts = Math.max(0, Math.min(Math.floor(options.maxAttempts ?? 1000), 10000));
  for (let attempt = 0; attempt < maxAttempts && performance.now() < deadline; attempt++) {
    const solution = fullGrid(random);
    const givens = solution.slice();
    let clueCount = 81;
    for (const index of shuffled(Array.from({ length: 81 }, (_, i) => i), random)) {
      if (performance.now() >= deadline) return null;
      const value = givens[index];
      givens[index] = 0;
      if (countSolutions(givens, 2) !== 1) {
        givens[index] = value;
        continue;
      }
      clueCount--;
      // Advanced patterns are uncommon in dense grids. This is a search shortcut,
      // never a grading rule: the logical solver still decides the exact tier.
      if (clueCount > (difficulty === 'hard' || difficulty === 'expert' ? 32 : 40)) continue;
      const rating = analyze(givens);
      if (performance.now() >= deadline) return null;
      if (!rating.solved || rating.difficulty !== difficulty) continue;
      if (rating.solution.length !== 81 || rating.solution.some((value, i) => value !== solution[i])) continue;
      if (rating.metrics.score < effortTarget) continue;
      const fingerprint = puzzleFingerprint(givens);
      if (excluded.has(fingerprint)) continue;
      return {
        id: `gen-${seed}-${fingerprint}`,
        difficulty, givens: givens.slice(), solution, rating, fingerprint, seed,
      };
    }
  }
  return null;
}
