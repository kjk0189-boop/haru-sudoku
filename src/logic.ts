import { candidates, conflicts, isComplete, type Difficulty } from './game';

export type Technique = 'naked-single' | 'hidden-single' | 'locked-candidate' | 'naked-pair' | 'x-wing';
export interface LogicalStep {
  technique: Technique;
  placements: { index: number; value: number }[];
  eliminations: { index: number; value: number }[];
  explanation: string;
  availableSingles?: number;
  candidateCount?: number;
}
export interface Rating {
  solved: boolean;
  difficulty: Difficulty | null;
  hardest: Technique | null;
  steps: LogicalStep[];
  solution: number[];
  metrics: { score: number; bottleneckSteps: number; maxCandidates: number };
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROWS = Array.from({ length: 9 }, (_, r) => DIGITS.map((_, c) => r * 9 + c));
const COLS = Array.from({ length: 9 }, (_, c) => DIGITS.map((_, r) => r * 9 + c));
const BOXES = Array.from({ length: 9 }, (_, b) => DIGITS.map((_, j) =>
  (Math.floor(b / 3) * 3 + Math.floor(j / 3)) * 9 + b % 3 * 3 + j % 3));
const UNITS = [...ROWS, ...COLS, ...BOXES];
const RANK: Record<Technique, number> = { 'naked-single': 0, 'hidden-single': 1, 'locked-candidate': 2, 'naked-pair': 3, 'x-wing': 4 };
const LABELS: Record<Technique, string> = { 'naked-single': '단일 후보', 'hidden-single': '숨은 단일 후보', 'locked-candidate': '상자·행·열 후보 잠금', 'naked-pair': '드러난 후보 쌍', 'x-wing': 'X-Wing' };
const cell = (i: number) => `${Math.floor(i / 9) + 1}행 ${i % 9 + 1}열`;
const unitLabel = (u: number) => u < 9 ? `${u + 1}행` : u < 18 ? `${u - 8}열` : `${u - 17}번째 상자`;
const valid = (board: number[]) => board.length === 81 && Array.from(board).every(v => Number.isInteger(v) && v >= 0 && v <= 9);

function singles(options: Set<number>[]): LogicalStep[] {
  const found = new Map<string, LogicalStep>();
  for (let i = 0; i < 81; i++) if (options[i].size === 1) {
    const value = [...options[i]][0];
    found.set(`${i}:${value}`, { technique: 'naked-single', placements: [{ index: i, value }], eliminations: [],
      explanation: `${cell(i)}의 후보는 ${value} 하나뿐이에요.` });
  }
  for (let u = 0; u < 27; u++) for (const value of DIGITS) {
    const places = UNITS[u].filter(i => options[i].has(value));
    if (places.length !== 1) continue;
    const index = places[0];
    if (!found.has(`${index}:${value}`)) found.set(`${index}:${value}`, {
      technique: 'hidden-single', placements: [{ index, value }], eliminations: [],
      explanation: `${unitLabel(u)}에서 ${value}를 넣을 수 있는 곳은 ${cell(index)} 하나뿐이에요.`,
    });
  }
  return [...found.values()];
}

function elimination(technique: Technique, options: Set<number>[], indices: number[], value: number, explanation: string): LogicalStep | null {
  const eliminations = indices.filter(i => options[i].has(value)).map(index => ({ index, value }));
  return eliminations.length ? { technique, placements: [], eliminations, explanation } : null;
}

function locked(options: Set<number>[]): LogicalStep | null {
  // If all candidates in one unit also share another unit, the second unit's other cells cannot contain that digit.
  for (let u = 0; u < 27; u++) for (const value of DIGITS) {
    const places = UNITS[u].filter(i => options[i].has(value));
    if (places.length < 2) continue;
    for (let v = 0; v < 27; v++) {
      if ((u < 18) === (v < 18) || !places.every(i => UNITS[v].includes(i))) continue;
      const step = elimination('locked-candidate', options, UNITS[v].filter(i => !UNITS[u].includes(i)), value,
        `${unitLabel(u)}의 ${value} 후보가 ${unitLabel(v)}에 모여 있어, ${unitLabel(v)}의 나머지 칸에서 ${value}를 제외해요.`);
      if (step) return step;
    }
  }
  return null;
}

function pair(options: Set<number>[]): LogicalStep | null {
  for (let u = 0; u < 27; u++) {
    const pairs = UNITS[u].filter(i => options[i].size === 2);
    for (let a = 0; a < pairs.length; a++) for (let b = a + 1; b < pairs.length; b++) {
      const values = [...options[pairs[a]]];
      if (!values.every(v => options[pairs[b]].has(v))) continue;
      const eliminations = UNITS[u].filter(i => i !== pairs[a] && i !== pairs[b])
        .flatMap(index => values.filter(value => options[index].has(value)).map(value => ({ index, value })));
      if (eliminations.length) return { technique: 'naked-pair', placements: [], eliminations,
        explanation: `${unitLabel(u)}의 ${cell(pairs[a])}·${cell(pairs[b])}은 ${values.join('·')} 후보 쌍이라 다른 칸에서 두 숫자를 제외해요.` };
    }
  }
  return null;
}

function xwing(options: Set<number>[]): LogicalStep | null {
  for (const rows of [true, false]) {
    const units = rows ? ROWS : COLS;
    const cross = rows ? COLS : ROWS;
    for (const value of DIGITS) for (let a = 0; a < 8; a++) {
      const positions = units[a].filter(i => options[i].has(value)).map(i => rows ? i % 9 : Math.floor(i / 9));
      if (positions.length !== 2) continue;
      for (let b = a + 1; b < 9; b++) {
        const other = units[b].filter(i => options[i].has(value)).map(i => rows ? i % 9 : Math.floor(i / 9));
        if (other.length !== 2 || !positions.every((v, j) => v === other[j])) continue;
        const step = elimination('x-wing', options, positions.flatMap(p => cross[p]).filter(i => !units[a].includes(i) && !units[b].includes(i)), value,
          `숫자 ${value}가 ${a + 1}·${b + 1}${rows ? '행' : '열'}의 같은 두 ${rows ? '열' : '행'}에만 있어요. X-Wing으로 그 ${rows ? '열' : '행'}의 다른 칸에서 ${value}를 제외해요.`);
        if (step) return step;
      }
    }
  }
  return null;
}

/** Fixed-order logical rating, without guessing. Easy score <100; medium score >=100.
 * Singles score = original empty cells + hidden-single placements*3 + bottleneck states*2.
 * A bottleneck state has only 1–2 distinct immediately available single placements.
 * Hard/expert require a productive elimination under this order, not proof of a globally minimal technique.
 */
export function analyze(board: number[], maxTechnique: 'singles' | 'hard' | 'expert' = 'expert'): Rating {
  const work = board.slice();
  const result: Rating = { solved: false, difficulty: null, hardest: null, steps: [], solution: work,
    metrics: { score: 0, bottleneckSteps: 0, maxCandidates: 0 } };
  if (!valid(work) || conflicts(work).size) return result;
  const options = work.map((_, i) => new Set(candidates(work, i)));
  result.metrics.maxCandidates = options.reduce((sum, values) => sum + values.size, 0);
  const initialEmpty = work.filter(v => v === 0).length;
  let hiddenCount = 0;
  while (!isComplete(work)) {
    // A missing digit without a possible location is a contradiction even before a cell becomes empty.
    if (work.some((v, i) => v === 0 && options[i].size === 0) || UNITS.some(unit => DIGITS.some(value =>
      !unit.some(i => work[i] === value) && !unit.some(i => options[i].has(value))))) return result;
    const available = singles(options);
    let step: LogicalStep | null = available[0] ?? null;
    if (step && available.length <= 2) result.metrics.bottleneckSteps++;
    if (!step && maxTechnique !== 'singles') step = locked(options) ?? pair(options);
    if (!step && maxTechnique === 'expert') step = xwing(options);
    if (!step) return result;
    step.availableSingles = available.length;
    step.candidateCount = options.reduce((sum, values) => sum + values.size, 0);
    result.steps.push(step);
    if (result.hardest === null || RANK[step.technique] > RANK[result.hardest]) result.hardest = step.technique;
    if (step.technique === 'hidden-single') hiddenCount++;
    for (const { index, value } of step.eliminations) options[index].delete(value);
    for (const { index, value } of step.placements) {
      work[index] = value;
      options[index].clear();
      for (const unit of UNITS.filter(unit => unit.includes(index))) for (const peer of unit) options[peer].delete(value);
    }
    result.metrics.score = initialEmpty + hiddenCount * 3 + result.metrics.bottleneckSteps * 2;
  }
  result.solved = true;
  result.difficulty = result.hardest === 'x-wing' ? 'expert' :
    result.hardest === 'locked-candidate' || result.hardest === 'naked-pair' ? 'hard' : result.metrics.score < 100 ? 'easy' : 'medium';
  return result;
}

/** Replay candidate eliminations until a justified placement; never return a guessed value. */
export function findLogicalHint(board: number[], givens: number[]): { index: number; value: number; explanation: string } | null {
  if (!valid(board) || !valid(givens) || givens.some((v, i) => v !== 0 && v !== board[i])) return null;
  const rating = analyze(board);
  const explanations: string[] = [];
  for (const step of rating.steps) {
    explanations.push(`${LABELS[step.technique]}: ${step.explanation}`);
    if (step.placements.length) return { ...step.placements[0], explanation: explanations.join(' ') };
  }
  return null;
}
