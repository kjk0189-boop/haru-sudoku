import type { Difficulty } from './game';
import type { Rating } from './logic';

export const GENERATION_VERSION = 2;
/** The v1 logical certificate stays stable for existing saves; new puzzles pass these stricter gates. */
export const DIFFICULTY_BANDS = {
  easy: { minClues: 40, maxClues: 46, minEffort: 0, maxEffort: 70 },
  medium: { minClues: 32, maxClues: 37, minEffort: 105, maxEffort: 145 },
  hard: { minClues: 27, maxClues: 31, minEffort: 170, maxEffort: 209 },
  expert: { minClues: 22, maxClues: 26, minEffort: 210, maxEffort: Infinity },
} as const;

export function difficultyEvidence(givens: number[], rating: Rating) {
  const count = (name: string) => rating.steps.filter(step => step.technique === name).length;
  const locked = count('locked-candidate'), pairs = count('naked-pair'), xWings = count('x-wing');
  return { clues: givens.filter(Boolean).length, hiddenSingles: count('hidden-single'),
    initialSingles: rating.steps[0]?.availableSingles ?? 0,
    eliminationSteps: locked + pairs + xWings, locked, pairs, xWings,
    effort: rating.metrics.score + locked * 12 + pairs * 20 + xWings * 45 };
}

export function acceptsDifficulty(difficulty: Difficulty, givens: number[], rating: Rating): boolean {
  if (!rating.solved || rating.difficulty !== difficulty) return false;
  const band = DIFFICULTY_BANDS[difficulty];
  const proof = difficultyEvidence(givens, rating);
  if (proof.clues < band.minClues || proof.clues > band.maxClues || proof.effort < band.minEffort || proof.effort > band.maxEffort) return false;
  if (difficulty === 'easy') return proof.hiddenSingles <= 5 && proof.initialSingles >= 10 && proof.eliminationSteps === 0;
  if (difficulty === 'medium') return proof.hiddenSingles >= 10 && proof.eliminationSteps === 0;
  if (difficulty === 'hard') return proof.eliminationSteps >= 3 && proof.pairs >= 1 && proof.xWings === 0;
  return proof.eliminationSteps >= 4 && proof.xWings >= 1;
}
