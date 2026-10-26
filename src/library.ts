import { restoreSession, type Session } from './session';
import type { GameMode } from './player';

export interface SessionLibrary { version: 1; classic: Session | null; daily: Record<string, Session> }
export const LIBRARY_KEY = 'haru-sudoku:library:v1';
export const PROFILE_KEY = 'haru-sudoku:profile:v1';
export const emptyLibrary = (): SessionLibrary => ({ version: 1, classic: null, daily: {} });

export function identifySession(session: Session, mode: GameMode = 'classic', dayKey?: string): Session {
  return { ...session, runId: session.runId ?? crypto.randomUUID(), mode, ...(dayKey ? { dayKey } : {}),
    startedAt: session.startedAt ?? new Date().toISOString(), mistakes: session.mistakes ?? 0, advancedNotes: session.advancedNotes ?? 0 };
}
export function putSession(library: SessionLibrary, session: Session): SessionLibrary {
  if (session.mode !== 'daily' || !session.dayKey) return { ...library, classic: session };
  const daily = { ...library.daily };
  delete daily[session.dayKey];
  daily[session.dayKey] = session;
  return { ...library, daily: Object.fromEntries(Object.entries(daily).slice(-30)) };
}
export function restoreLibrary(raw: string | null, legacyRaw: string | null): SessionLibrary {
  try {
    const value = JSON.parse(raw ?? 'null') as SessionLibrary | null;
    if (value?.version === 1 && value.daily && typeof value.daily === 'object' && !Array.isArray(value.daily)) {
      const classic = restoreSession(JSON.stringify(value.classic));
      const daily: Record<string, Session> = {};
      for (const [key, data] of Object.entries(value.daily).slice(-30)) {
        const session = restoreSession(JSON.stringify(data));
        if (session?.mode === 'daily' && session.dayKey === key) daily[key] = identifySession(session, 'daily', key);
      }
      return { version: 1, classic: classic ? identifySession(classic) : null, daily };
    }
  } catch { /* Recover the previously shipped single-game save when possible. */ }
  const legacy = restoreSession(legacyRaw);
  return { ...emptyLibrary(), classic: legacy ? identifySession(legacy) : null };
}
