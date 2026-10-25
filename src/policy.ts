import type { Difficulty } from './game';

export type HintLimits = Readonly<Record<Difficulty, number | null>>;

/** null = unlimited; set a non-negative integer here to enable a per-game cap. */
export const HINT_LIMITS: HintLimits = {
  easy: null,
  medium: null,
  hard: null,
};
