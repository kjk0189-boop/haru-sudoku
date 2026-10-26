import type { Language } from './i18n';

const MESSAGES: Readonly<Record<string, string>> = {
  '빈칸을 선택하고 숫자를 채워보세요.': 'Select an empty cell and enter a number.',
  '처음 주어진 숫자는 바꿀 수 없어요.': 'The starting numbers cannot be changed.',
  '후보 숫자를 메모했어요.': 'Candidate notes updated.',
  '좋아요. 천천히 이어가세요.': 'Number entered. Keep going at your own pace.',
  '선택한 칸을 지웠어요.': 'The selected cell has been cleared.',
  '정답 확인 이용 한도에 도달했어요. 추가 이용 방식은 준비 중입니다.': 'You have reached the hint limit. More ways to use hints are coming later.',
  '자동 메모 이용 한도에 도달했어요. 추가 이용 방식은 준비 중입니다.': 'You have reached the auto-notes limit. More ways to use auto notes are coming later.',
  '중복된 숫자를 먼저 수정하면 모든 후보를 메모할 수 있어요.': 'Correct the duplicate numbers before filling all candidate notes.',
  '모든 빈칸의 후보 메모가 이미 최신 상태예요.': 'Candidate notes are already up to date in every empty cell.',
  '모든 빈칸에 현재 가능한 후보를 메모했어요. 되돌리기로 이전 메모를 복원할 수 있어요.': 'All empty cells now contain the current candidates. Undo restores the previous notes.',
  '이어서 천천히 풀어보세요.': 'Continue where you left off.',
  '새 문제의 정답과 난이도를 검증하고 있어요.': 'Checking the new puzzle’s solution and difficulty.',
  '문제 생성을 취소했어요. 기존 기록은 그대로 보관됩니다.': 'Puzzle generation was canceled. Your existing progress is unchanged.',
  '문제를 생성하지 못했어요. 다시 시도해 주세요.': 'Could not generate a puzzle. Please try again.',
  '같은 문제를 처음부터 다시 시작해요.': 'Starting a new attempt at the same puzzle.',
  '생성 취소': 'Generation canceled',
  '생성 시간이 길어지고 있어요. 다시 시도해 주세요. 기존 게임은 유지됩니다.': 'Generation is taking too long. Please try again. Your current game is unchanged.',
  '선택한 난이도의 검증을 통과한 문제를 아직 찾지 못했어요. 다시 시도해 주세요.': 'A verified puzzle for this difficulty could not be found in time. Please try again.',
  '문제 생성기를 실행하지 못했어요. 새로고침 후 다시 시도해 주세요.': 'Could not start the puzzle generator. Refresh the page and try again.',
  '이미 완성한 퍼즐이에요.': 'This puzzle is already complete.',
  '이 난이도에서 사용할 수 있는 힌트를 모두 사용했어요.': 'You have used all hints available for this difficulty.',
  '입력한 숫자 중 정답과 맞지 않는 숫자가 있어요. 먼저 다시 살펴보세요.': 'Some entered numbers do not match the solution. Check them before using a hint.',
  '지원하는 논리 기법으로 다음 칸을 확정하지 못했어요. 입력과 후보 메모를 다시 살펴보세요.': 'The supported techniques could not determine the next cell. Review your entries and candidate notes.',
  '이 칸에는 힌트를 적용할 수 없어요.': 'A hint cannot be applied to this cell.',
  '자동 저장을 할 수 없어요. 브라우저 저장 설정을 확인해 주세요.': 'Could not save progress. Check your browser’s storage settings.',
  '진행 기록은 기기 내 자동 저장됩니다.': 'Progress is saved automatically on this device.',
};

const DIFFICULTIES: Readonly<Record<string, string>> = { 쉬움: 'Easy', 보통: 'Medium', 어려움: 'Hard', 전문가: 'Expert' };
const TECHNIQUES: Readonly<Record<string, string>> = {
  '단일 후보': 'Naked single', '숨은 단일 후보': 'Hidden single',
  '상자·행·열 후보 잠금': 'Locked candidates', '드러난 후보 쌍': 'Naked pair', 'X-Wing': 'X-Wing',
};
const unit = (value: string) => value.endsWith('번째 상자') ? `box ${value.match(/^\d+/)![0]}`
  : `${value.endsWith('행') ? 'row' : 'column'} ${value.match(/^\d+/)![0]}`;
const cell = (row: string, column: string) => `row ${row}, column ${column}`;

/** Translate the solver's fixed explanation templates without changing its logical evidence. */
function explanation(text: string): string | null {
  let m = /^(\d+)행 (\d+)열의 후보는 (\d+) 하나뿐이에요\.$/.exec(text);
  if (m) return `The only candidate for ${cell(m[1], m[2])} is ${m[3]}.`;
  m = /^(\d+행|\d+열|\d+번째 상자)에서 (\d+)를 넣을 수 있는 곳은 (\d+)행 (\d+)열 하나뿐이에요\.$/.exec(text);
  if (m) return `In ${unit(m[1])}, ${cell(m[3], m[4])} is the only place for ${m[2]}.`;
  m = /^(\d+행|\d+열|\d+번째 상자)의 (\d+) 후보가 (\d+행|\d+열|\d+번째 상자)에 모여 있어, (\d+행|\d+열|\d+번째 상자)의 나머지 칸에서 (\d+)를 제외해요\.$/.exec(text);
  if (m) return `The candidates for ${m[2]} in ${unit(m[1])} are confined to ${unit(m[3])}. Remove ${m[5]} from the other cells in ${unit(m[4])}.`;
  m = /^(\d+행|\d+열|\d+번째 상자)의 (\d+)행 (\d+)열·(\d+)행 (\d+)열은 (\d+)·(\d+) 후보 쌍이라 다른 칸에서 두 숫자를 제외해요\.$/.exec(text);
  if (m) return `In ${unit(m[1])}, ${cell(m[2], m[3])} and ${cell(m[4], m[5])} form a pair of ${m[6]} and ${m[7]}. Remove both numbers from the other cells.`;
  m = /^숫자 (\d+)가 (\d+)·(\d+)(행|열)의 같은 두 (열|행)에만 있어요\. X-Wing으로 그 (열|행)의 다른 칸에서 (\d+)를 제외해요\.$/.exec(text);
  if (m) return `${m[1]} appears only in the same two ${m[5] === '열' ? 'columns' : 'rows'} of ${m[4] === '행' ? 'rows' : 'columns'} ${m[2]} and ${m[3]}. Use X-Wing to remove ${m[7]} from the other cells in those ${m[6] === '열' ? 'columns' : 'rows'}.`;
  return null;
}

function logicalMessage(message: string): string | null {
  const pattern = /(단일 후보|숨은 단일 후보|상자·행·열 후보 잠금|드러난 후보 쌍|X-Wing): ([\s\S]*?)(?= (?:단일 후보|숨은 단일 후보|상자·행·열 후보 잠금|드러난 후보 쌍|X-Wing): |$)/g;
  const matches = [...message.matchAll(pattern)];
  if (!matches.length || matches.map(m => m[0]).join(' ') !== message) return null;
  const translated = matches.map(m => {
    const body = explanation(m[2]);
    return body === null ? null : `${TECHNIQUES[m[1]]}: ${body}`;
  });
  return translated.some(value => value === null) ? null : translated.join(' ');
}

/** Korean remains the solver's canonical message; render translations in the selected language. */
export function translateGameMessage(message: string, language: Language): string {
  if (language === 'ko') return message;
  if (Object.hasOwn(MESSAGES, message)) return MESSAGES[message];
  let m = /^숫자 (\d+): 이미 9개가 채워졌어요\. 숫자를 지우거나 되돌리면 다시 입력할 수 있어요\.$/.exec(message);
  if (m) return `All nine ${m[1]}s are filled. Erase a number or undo to enter it again.`;
  m = /^(\d{4}-\d{2}-\d{2}) 매일 도전을 시작해요\. 같은 날짜는 같은 문제로 즐길 수 있어요\.$/.exec(message);
  if (m) return `Starting the daily challenge for ${m[1]}. The same date uses the same puzzle.`;
  m = /^(쉬움|보통|어려움|전문가) 새 문제를 준비했어요\. 정답이 하나이며 논리적으로 끝까지 풀 수 있어요\.$/.exec(message);
  if (m) return `Your ${DIFFICULTIES[m[1]].toLowerCase()} puzzle is ready. It has one solution and can be completed using logic.`;
  m = /^멋져요! (\d+:\d{2}) 동안 집중해서 완성했어요\. 힌트 (\d+)회 사용\.$/.exec(message);
  if (m) return `Puzzle complete! Time ${m[1]}. Hints used: ${m[2]}.`;
  return logicalMessage(message) ?? message;
}
