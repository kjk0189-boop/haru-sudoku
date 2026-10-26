import { isComplete, type Difficulty } from './game';
import { summarizeProfile, upsertRecord, type PlayerProfile } from './player';
import type { Session } from './session';

export interface CompletionResult {
  difficulty: Difficulty;
  elapsed: number;
  bestSeconds: number;
  hints: number;
  completedCount: number;
}

/** Include this run before React's persistence effect, without changing stored inputs. */
export function getCompletionResult(profile: PlayerProfile, session: Session): CompletionResult | null {
  if (!isComplete(session.board)) return null;
  const id = typeof session.runId === 'string' && session.runId.length > 0 && session.runId.length <= 200
    ? session.runId : `legacy:${session.puzzleId}`;
  // The result contains no wall-clock fields. Use a deterministic timestamp; player
  // clamps it to the stored start when needed and preserves already-finalized runs.
  const completedProfile = upsertRecord(profile, session, session.startedAt ?? '1970-01-01T00:00:00.000Z');
  const record = completedProfile.records.find(item => item.id === id);
  if (record?.status !== 'completed') return null;
  const summary = summarizeProfile(completedProfile, record.difficulty);
  if (summary.bestSeconds === null) return null;
  return {
    difficulty: record.difficulty,
    elapsed: record.elapsed,
    bestSeconds: summary.bestSeconds,
    hints: record.hints,
    completedCount: summary.completed,
  };
}
