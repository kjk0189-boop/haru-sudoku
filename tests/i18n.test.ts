import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreLanguage } from '../src/i18n';
import { translateGameMessage } from '../src/game-messages';
import { analyze } from '../src/logic';
import { STARTER_PUZZLE } from '../src/starter';

test('language restoration accepts supported preference and safely defaults to Korean', () => {
  assert.equal(restoreLanguage('en'), 'en');
  for (const raw of ['ko', null, '', 'ja', 'EN', '"en"', '{bad']) assert.equal(restoreLanguage(raw), 'ko');
});

test('message translation preserves Korean and provides exact useful English for game states', () => {
  const cases = [
    ['입력한 숫자 중 정답과 맞지 않는 숫자가 있어요. 먼저 다시 살펴보세요.', 'Some entered numbers do not match the solution. Check them before using a hint.'],
    ['숫자 9: 이미 9개가 채워졌어요. 숫자를 지우거나 되돌리면 다시 입력할 수 있어요.', 'All nine 9s are filled. Erase a number or undo to enter it again.'],
    ['멋져요! 102:05 동안 집중해서 완성했어요. 힌트 12회 사용.', 'Puzzle complete! Time 102:05. Hints used: 12.'],
    ['2026-10-26 매일 도전을 시작해요. 같은 날짜는 같은 문제로 즐길 수 있어요.', 'Starting the daily challenge for 2026-10-26. The same date uses the same puzzle.'],
    ['전문가 새 문제를 준비했어요. 정답이 하나이며 논리적으로 끝까지 풀 수 있어요.', 'Your expert puzzle is ready. It has one solution and can be completed using logic.'],
  ];
  for (const [ko, en] of cases) {
    assert.equal(translateGameMessage(ko, 'ko'), ko);
    assert.equal(translateGameMessage(ko, 'en'), en);
  }
  assert.match(translateGameMessage('생성 시간이 길어지고 있어요. 다시 시도해 주세요. 기존 게임은 유지됩니다.', 'en'), /current game is unchanged/);
  assert.equal(translateGameMessage('Already English or an unknown diagnostic', 'en'), 'Already English or an unknown diagnostic');
  assert.equal(translateGameMessage('__proto__', 'en'), '__proto__');
});

test('all five logical technique explanations keep their exact cells, units and digits in English', () => {
  const cases = [
    ['단일 후보: 3행 2열의 후보는 6 하나뿐이에요.', 'Naked single: The only candidate for row 3, column 2 is 6.'],
    ['숨은 단일 후보: 2번째 상자에서 8를 넣을 수 있는 곳은 1행 4열 하나뿐이에요.', 'Hidden single: In box 2, row 1, column 4 is the only place for 8.'],
    ['상자·행·열 후보 잠금: 4행의 3 후보가 5번째 상자에 모여 있어, 5번째 상자의 나머지 칸에서 3를 제외해요.', 'Locked candidates: The candidates for 3 in row 4 are confined to box 5. Remove 3 from the other cells in box 5.'],
    ['드러난 후보 쌍: 2열의 1행 2열·3행 2열은 4·7 후보 쌍이라 다른 칸에서 두 숫자를 제외해요.', 'Naked pair: In column 2, row 1, column 2 and row 3, column 2 form a pair of 4 and 7. Remove both numbers from the other cells.'],
    ['X-Wing: 숫자 5가 2·7행의 같은 두 열에만 있어요. X-Wing으로 그 열의 다른 칸에서 5를 제외해요.', 'X-Wing: 5 appears only in the same two columns of rows 2 and 7. Use X-Wing to remove 5 from the other cells in those columns.'],
    ['X-Wing: 숫자 5가 2·7열의 같은 두 행에만 있어요. X-Wing으로 그 행의 다른 칸에서 5를 제외해요.', 'X-Wing: 5 appears only in the same two rows of columns 2 and 7. Use X-Wing to remove 5 from the other cells in those rows.'],
  ];
  for (const [ko, en] of cases) assert.equal(translateGameMessage(ko, 'en'), en);
  const chain = `${cases[2][0]} ${cases[0][0]}`;
  assert.equal(translateGameMessage(chain, 'en'), `${cases[2][1]} ${cases[0][1]}`);
});

test('actual solver explanations cover every technique and translate without rewriting source evidence', () => {
  const labels: Record<string, string> = { 'naked-single': '단일 후보', 'hidden-single': '숨은 단일 후보', 'locked-candidate': '상자·행·열 후보 잠금', 'naked-pair': '드러난 후보 쌍', 'x-wing': 'X-Wing' };
  const advanced = [
    '600800000900570000007004000100020038002005001500080000080090304000002000006400070',
    '000082000040000300000000006607000023009000800001300605300208007204097000000000010',
    '084002700070005003000000201920100000000200000038604900001700040090008050047500009',
  ].map(text => [...text].map(Number));
  const covered = new Set<string>();
  for (const givens of [STARTER_PUZZLE.givens, ...advanced]) {
    const rating = analyze(givens);
    assert.equal(rating.solved, true);
    for (const step of rating.steps) {
      covered.add(step.technique);
      const source = `${labels[step.technique]}: ${step.explanation}`;
      assert.doesNotMatch(translateGameMessage(source, 'en'), /[가-힣]/);
      assert.equal(translateGameMessage(source, 'ko'), source);
    }
    const whole = rating.steps.map(step => `${labels[step.technique]}: ${step.explanation}`).join(' ');
    assert.doesNotMatch(translateGameMessage(whole, 'en'), /[가-힣]/);
  }
  assert.deepEqual([...covered].sort(), Object.keys(labels).sort());
});
