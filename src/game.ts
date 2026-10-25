export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Puzzle {
  id: string;
  difficulty: Difficulty;
  givens: number[];
  solution: number[];
}

export interface Hint {
  index: number;
  value: number;
  explanation: string;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROWS = Array.from({ length: 9 }, (_, r) => DIGITS.map((_, c) => r * 9 + c));
const COLS = Array.from({ length: 9 }, (_, c) => DIGITS.map((_, r) => r * 9 + c));
const BOXES = Array.from({ length: 9 }, (_, b) =>
  DIGITS.map((_, j) => (Math.floor(b / 3) * 3 + Math.floor(j / 3)) * 9 + (b % 3) * 3 + j % 3),
);
const UNITS = [...ROWS, ...COLS, ...BOXES];
const PEERS = Array.from({ length: 81 }, (_, i) =>
  [...new Set(UNITS.filter(unit => unit.includes(i)).flat())].filter(j => j !== i),
);

function validBoard(board: number[]): boolean {
  return board.length === 81 && Array.from(board).every(value => Number.isInteger(value) && value >= 0 && value <= 9);
}

/** Returns both cells in every duplicate; zero represents an empty cell. */
export function conflicts(board: number[]): Set<number> {
  const result = new Set<number>();
  for (const unit of UNITS) {
    const seen = new Map<number, number>();
    for (const i of unit) {
      const value = board[i];
      if (!Number.isInteger(value) || value < 0 || value > 9) {
        result.add(i);
      } else if (value !== 0) {
        const previous = seen.get(value);
        if (previous !== undefined) {
          result.add(previous);
          result.add(i);
        } else seen.set(value, i);
      }
    }
  }
  return result;
}

export function candidates(board: number[], index: number): number[] {
  if (!validBoard(board) || !Number.isInteger(index) || index < 0 || index >= 81 || board[index] !== 0) return [];
  const used = new Set(PEERS[index].map(i => board[i]));
  return DIGITS.filter(value => !used.has(value));
}

export function isComplete(board: number[]): boolean {
  return validBoard(board) && board.every(value => value !== 0) && conflicts(board).size === 0;
}

/** Counts up to limit solutions without mutating the caller's board. */
export function countSolutions(board: number[], limit = 2): number {
  if (!validBoard(board) || !Number.isInteger(limit) || limit < 1 || conflicts(board).size > 0) return 0;
  const work = board.slice();
  function search(remaining: number): number {
    let index = -1;
    let options: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (work[i] !== 0) continue;
      const used = new Set(PEERS[i].map(j => work[j]));
      const values = DIGITS.filter(value => !used.has(value));
      if (values.length === 0) return 0;
      if (index === -1 || values.length < options.length) {
        index = i;
        options = values;
        if (values.length === 1) break;
      }
    }
    if (index === -1) return 1;
    let total = 0;
    for (const value of options) {
      work[index] = value;
      total += search(remaining - total);
      if (total >= remaining) break;
    }
    work[index] = 0;
    return total;
  }
  return search(limit);
}

/** Uses naked and hidden singles only. Never reveals a guessed answer. */
export function findHint(board: number[], givens: number[]): Hint | null {
  if (!validBoard(board) || !validBoard(givens) || conflicts(board).size > 0) return null;
  if (givens.some((value, i) => value !== 0 && value !== board[i])) return null;
  const options = board.map((_, i) => candidates(board, i));
  // Contradictory entries can leave an empty cell without any legal value.
  if (board.some((value, i) => value === 0 && options[i].length === 0)) return null;
  for (let i = 0; i < 81; i++) {
    if (givens[i] === 0 && options[i].length === 1) {
      return { index: i, value: options[i][0], explanation: `${Math.floor(i / 9) + 1}행 ${i % 9 + 1}열은 행·열·3×3 상자를 확인하면 ${options[i][0]}만 들어갈 수 있어요.` };
    }
  }
  for (let u = 0; u < UNITS.length; u++) {
    for (const value of DIGITS) {
      const places = UNITS[u].filter(i => givens[i] === 0 && options[i].includes(value));
      if (places.length === 1) {
        const index = places[0];
        const label = u < 9 ? `${u + 1}행` : u < 18 ? `${u - 8}열` : `${u - 17}번째 3×3 상자`;
        return { index, value, explanation: `${label}에서 숫자 ${value}를 넣을 수 있는 칸은 ${Math.floor(index / 9) + 1}행 ${index % 9 + 1}열 하나뿐이에요.` };
      }
    }
  }
  return null;
}

// All nine puzzles have a tested unique solution. Difficulty labels are provisional:
// clue counts guide the tiers; these have not been rated by human solving techniques.
const CATALOG: [Difficulty, string, string][] = [
  ['easy', '090758230080603001036140007800401905004000802975086004050002003000910708028300100', '491758236587623491236149587862431975314597862975286314159872643643915728728364159'],
  ['easy', '000510970000638005040200830050002001820040097401790203509800064030951000278003009', '386514972792638415145279836957382641823146597461795283519827364634951728278463159'],
  ['easy', '630958000589701623010063090000030049094617302305400000250000706900300280000000014', '632958471589741623417263598176532849894617352325489167258194736941376285763825914'],
  ['medium', '037029008804005009002640000201060030000807010000012900075206000000750006020080701', '537129648864375129912648375251964837496837512783512964175296483348751296629483751'],
  ['medium', '900000076000010420000600195832006900040308000010090000006004030400703609370900502', '951842376763519428284637195832176954549328761617495283196254837425783619378961542'],
  ['medium', '081306092409000000060090000002985100900060720030024000200801000670250001003600009', '581376492429518376367492518742985163958163724136724985295831647674259831813647259'],
  ['hard', '009003087000700591000000000021000000400500200000300860060047050000001608215006000', '159623487632784591748195326321468975486579213597312864863947152974251638215836749'],
  ['hard', '709005003501320000000000800004036900890000000000508020006079500900000006100000708', '769185243581324679423967851214736985895412367637598124346879512978251436152643798'],
  ['hard', '006400200000906054000170030064080007000300005081000400200040710010003000000800090', '936458271172936854458172639364581927729364185581729463293645718817293546645817392'],
];

export const PUZZLES: Puzzle[] = CATALOG.map(([difficulty, givens, solution], index) => ({
  id: `${difficulty}-${index % 3 + 1}`,
  difficulty,
  givens: [...givens].map(Number),
  solution: [...solution].map(Number),
}));

export function getPuzzle(difficulty: Difficulty, excludeId?: string): Puzzle {
  const pool = PUZZLES.filter(puzzle => puzzle.difficulty === difficulty && puzzle.id !== excludeId);
  const puzzle = pool[Math.floor(Math.random() * pool.length)];
  if (!puzzle) throw new Error('선택한 난이도의 문제가 없습니다.');
  return { ...puzzle, givens: puzzle.givens.slice(), solution: puzzle.solution.slice() };
}
