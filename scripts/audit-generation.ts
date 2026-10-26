import fs from 'node:fs';
import { countSolutions, type Difficulty } from '../src/game.ts';
import { generatePuzzle } from '../src/generator.ts';
import { analyze } from '../src/logic.ts';
import { acceptsDifficulty, difficultyEvidence, DIFFICULTY_BANDS, GENERATION_VERSION } from '../src/difficulty-policy.ts';
import { createSession, restoreSession } from '../src/session.ts';

const results = [];
for (const difficulty of ['easy','medium','hard','expert'] as Difficulty[]) {
  for (let seed = 1; seed <= 10; seed++) {
    const began = performance.now();
    const puzzle = generatePuzzle(difficulty, { seed, deadlineMs: 20000 });
    const elapsedMs = Math.round(performance.now() - began);
    const recheck = puzzle ? analyze(puzzle.givens) : null;
    const unique = puzzle ? countSolutions(puzzle.givens) === 1 : false;
    const restored = puzzle ? restoreSession(JSON.stringify(createSession(puzzle))) : null;
    const verified = !!puzzle && unique && recheck?.solved === true && recheck.difficulty === difficulty
      && acceptsDifficulty(difficulty, puzzle.givens, recheck) && restored?.puzzleId === puzzle.id
      && recheck.solution.every((value, i) => value === puzzle.solution[i]);
    results.push({ difficulty, seed, elapsedMs, verified, fingerprint: puzzle?.fingerprint ?? null,
      clues: puzzle?.givens.filter(Boolean).length ?? null, score: recheck?.metrics.score ?? null,
      evidence: puzzle && recheck ? difficultyEvidence(puzzle.givens, recheck) : null,
      techniques: recheck ? Object.fromEntries([...new Set(recheck.steps.map(s => s.technique))].map(name => [name, recheck.steps.filter(s => s.technique === name).length])) : null });
    console.log(`${difficulty} seed=${seed}: ${verified ? 'PASS' : 'FAIL'} ${elapsedMs}ms`);
  }
}
const report = { version: GENERATION_VERSION, environment: `${process.platform} / ${process.version}`, deadlineMs: 20000,
  criteria: Object.fromEntries(Object.entries(DIFFICULTY_BANDS).map(([name, band]) => [name, { ...band, maxEffort: Number.isFinite(band.maxEffort) ? band.maxEffort : null }])), results };
fs.writeFileSync('docs/wiki/generation-audit.json', JSON.stringify(report, null, 2) + '\n', 'utf8');
if (results.some(result => !result.verified)) process.exitCode = 1;
