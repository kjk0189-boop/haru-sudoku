# 코드 연결 구조

[목차](index.md) · [설계 결정](decisions.md)

codegraph 제품 도구/CLI가 없어 TypeScript AST로 import 그래프를 추출한다. 원래 codegraph와 별개의 대체 도구다. `pnpm graph`로 재생성한다. 정적 import 및 Worker URL 연결을 포함하며 동적 런타임 호출 그래프는 포함하지 않는다.

## 모듈 책임
- main.tsx: 앱 진입 및 스타일 로딩
- App.tsx: 게임 화면, 접근성, 시간·저장·모달
- session.ts: 게임 상태 변경, 실행 취소, 저장 데이터 검증
- game.ts: 문제 묶음, 후보·충돌·완성·유일해·힌트
- policy.ts: 난이도별 힌트 제한 정책
- logic.ts: 논리 풀이, 네 단계 평가, 설명형 힌트와 풀이 증거
- generator.ts: 무작위 정답판과 유일해·난이도 검증 생성
- generator.worker.ts: 생성 작업의 백그라운드 실행
- generator-client.ts: Worker 생명주기와 최근 문제 80개 관리
- starter.ts: 최초 실행용 검증된 쉬움 문제

## import 연결
| 소스 | 의존 대상 |
| --- | --- |
| [App.tsx](../../src/App.tsx) | `react` |
| [App.tsx](../../src/App.tsx) | `lucide-react` |
| [App.tsx](../../src/App.tsx) | [./game](../../src/game.ts) |
| [App.tsx](../../src/App.tsx) | [./generator-client](../../src/generator-client.ts) |
| [App.tsx](../../src/App.tsx) | [./starter](../../src/starter.ts) |
| [App.tsx](../../src/App.tsx) | [./session](../../src/session.ts) |
| [generator-client.ts](../../src/generator-client.ts) | [./game](../../src/game.ts) |
| [generator-client.ts](../../src/generator-client.ts) | [./generator](../../src/generator.ts) |
| [generator-client.ts](../../src/generator-client.ts) | [./generator.worker.ts](../../src/generator.worker.ts) |
| [generator.ts](../../src/generator.ts) | [./game](../../src/game.ts) |
| [generator.ts](../../src/generator.ts) | [./logic](../../src/logic.ts) |
| [generator.worker.ts](../../src/generator.worker.ts) | [./game](../../src/game.ts) |
| [generator.worker.ts](../../src/generator.worker.ts) | [./generator](../../src/generator.ts) |
| [logic.ts](../../src/logic.ts) | [./game](../../src/game.ts) |
| [main.tsx](../../src/main.tsx) | `react` |
| [main.tsx](../../src/main.tsx) | `react-dom/client` |
| [main.tsx](../../src/main.tsx) | [./App](../../src/App.tsx) |
| [main.tsx](../../src/main.tsx) | [./style.css](../../src/style.css) |
| [policy.ts](../../src/policy.ts) | [./game](../../src/game.ts) |
| [session.ts](../../src/session.ts) | [./game](../../src/game.ts) |
| [session.ts](../../src/session.ts) | [./policy](../../src/policy.ts) |
| [session.ts](../../src/session.ts) | [./logic](../../src/logic.ts) |
| [starter.ts](../../src/starter.ts) | [./game](../../src/game.ts) |
