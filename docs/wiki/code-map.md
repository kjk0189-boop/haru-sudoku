# 코드 연결 구조

[목차](index.md) · [설계 결정](decisions.md)

codegraph 제품 도구/CLI가 없어 TypeScript AST로 import 그래프를 추출한다. 원래 codegraph와 별개의 대체 도구다. `pnpm graph`로 재생성한다. 동적 런타임 호출 그래프는 포함하지 않는다.

## 모듈 책임
- main.tsx: 앱 진입 및 스타일 로딩
- App.tsx: 게임 화면, 접근성, 시간·저장·모달
- session.ts: 게임 상태 변경, 실행 취소, 저장 데이터 검증
- game.ts: 문제 묶음, 후보·충돌·완성·유일해·힌트
- policy.ts: 난이도별 힌트 제한 정책

## import 연결
| 소스 | 의존 대상 |
| --- | --- |
| [App.tsx](../../src/App.tsx) | `react` |
| [App.tsx](../../src/App.tsx) | `lucide-react` |
| [App.tsx](../../src/App.tsx) | [./game](../../src/game.ts) |
| [App.tsx](../../src/App.tsx) | [./session](../../src/session.ts) |
| [main.tsx](../../src/main.tsx) | `react` |
| [main.tsx](../../src/main.tsx) | `react-dom/client` |
| [main.tsx](../../src/main.tsx) | [./App](../../src/App.tsx) |
| [main.tsx](../../src/main.tsx) | [./style.css](../../src/style.css) |
| [policy.ts](../../src/policy.ts) | [./game](../../src/game.ts) |
| [session.ts](../../src/session.ts) | [./game](../../src/game.ts) |
| [session.ts](../../src/session.ts) | [./policy](../../src/policy.ts) |
