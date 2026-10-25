import type { Difficulty } from './game';
import type { GeneratedPuzzle } from './generator';

/** Workers are disposable so cancellation stops CPU work, not just the loading state. */
export function requestPuzzle(difficulty: Difficulty, excludeFingerprints: string[], signal: AbortSignal): Promise<GeneratedPuzzle> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('생성 취소', 'AbortError')); return; }
    const worker = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => { cleanup(); reject(new DOMException('생성 취소', 'AbortError')); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('생성 시간이 길어지고 있어요. 다시 시도해 주세요. 기존 게임은 유지됩니다.')); }, 35000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = event => {
      if (event.data.id !== 1) return;
      cleanup();
      if (event.data.puzzle) resolve(event.data.puzzle);
      else reject(new Error(event.data.error ?? '선택한 난이도의 검증을 통과한 문제를 아직 찾지 못했어요. 다시 시도해 주세요.'));
    };
    worker.onerror = () => { cleanup(); reject(new Error('문제 생성기를 실행하지 못했어요. 새로고침 후 다시 시도해 주세요.')); };
    worker.postMessage({ id: 1, difficulty, excludeFingerprints });
  });
}

export const RECENT_KEY = 'haru-sudoku:recent:v1';
export function readRecent(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && /^[0-9]{81}$/.test(item)))].slice(-80) : [];
  } catch { return []; }
}
export function rememberPuzzle(recent: string[], fingerprint: string): string[] {
  return [...recent.filter(item => item !== fingerprint), fingerprint].slice(-80);
}
