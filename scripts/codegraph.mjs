import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const files = fs.readdirSync('src').filter(f => /\.tsx?$/.test(f)).sort();
const edges = [];
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join('src', file), 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = node => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      edges.push([file, node.moduleSpecifier.text]);
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL'
      && node.arguments?.[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text.startsWith('./')) {
      edges.push([file, node.arguments[0].text]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const lines = edges.map(([from, to]) => `| [${from}](../../src/${from}) | ${to.startsWith('.') ? `[${to}](../../src/${files.find(f => './' + f === to || './' + f.replace(/\.tsx?$/, '') === to) ?? to.replace('./', '')})` : '`' + to + '`'} |`);
const document = `# 코드 연결 구조\n\n[목차](index.md) · [설계 결정](decisions.md)\n\ncodegraph 제품 도구/CLI가 없어 TypeScript AST로 import 그래프를 추출한다. 원래 codegraph와 별개의 대체 도구다. \`pnpm graph\`로 재생성한다. 정적 import 및 Worker URL 연결을 포함하며 동적 런타임 호출 그래프는 포함하지 않는다.\n\n## 모듈 책임\n- main.tsx: 앱 진입 및 스타일 로딩\n- App.tsx: 홈·게임 통합, 접근성, 시간·저장·모달\n- Lobby.tsx: 홈·매일 도전 달력·개인 기록 화면\n- library.ts: 클래식·날짜별 저장 분리와 기존 기록 이전\n- player.ts: 실행별 기록·완료 통계·한국 날짜와 일일 시드\n- access.ts: 무료 도움 및 향후 이용 정책 판단\n- i18n.tsx: 한국어·영어 컨텍스트·언어 저장·문서 언어\n- game-messages.ts: 게임 상태·논리 힌트 설명의 표시 언어 변환\n- useNativeEvents.ts: Android 뒤로가기·백그라운드 이벤트\n- session.ts: 게임 상태 변경, 실행 취소, 저장 데이터 검증\n- game.ts: 문제 묶음, 후보·충돌·완성·유일해·힌트\n- policy.ts: 난이도별 힌트 제한 정책\n- logic.ts: 논리 풀이, 네 단계 평가, 설명형 힌트와 풀이 증거\n- generator.ts: 무작위 정답판과 유일해·난이도 검증 생성\n- generator.worker.ts: 생성 작업의 백그라운드 실행\n- generator-client.ts: Worker 생명주기와 최근 문제 80개 관리\n- starter.ts: 최초 실행용 검증된 쉬움 문제\n\n## import 연결\n| 소스 | 의존 대상 |\n| --- | --- |\n${lines.join('\n')}\n`;
fs.writeFileSync('docs/wiki/code-map.md', document, 'utf8');
console.log(`Code graph: ${files.length} modules, ${edges.length} import edges`);
