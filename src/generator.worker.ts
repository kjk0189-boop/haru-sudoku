import { type Difficulty } from './game';
import { generatePuzzle } from './generator';

self.onmessage = (event: MessageEvent<{
  id: number;
  difficulty: Difficulty;
  excludeFingerprints: string[];
  seed?: number;
}>) => {
  const { id, difficulty, excludeFingerprints, seed } = event.data;
  try {
    const puzzle = generatePuzzle(difficulty, {
      seed, excludeFingerprints, deadlineMs: 20000,
    });
    self.postMessage({ id, puzzle });
  } catch {
    self.postMessage({ id, puzzle: null, error: '문제를 생성하지 못했어요. 다시 시도해 주세요.' });
  }
};
