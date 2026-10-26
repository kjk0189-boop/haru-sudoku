# 코드 연결 구조

[목차](index.md) · [설계 결정](decisions.md)

codegraph 제품 도구/CLI가 없어 TypeScript AST로 import 그래프를 추출한다. 원래 codegraph와 별개의 대체 도구다. `pnpm graph`로 재생성한다. 정적 import 및 Worker URL 연결을 포함하며 동적 런타임 호출 그래프는 포함하지 않는다.

## 모듈 책임
- main.tsx: 앱 진입 및 스타일 로딩
- App.tsx: 홈·게임 통합, 접근성, 시간·저장·모달
- Lobby.tsx: 홈·매일 도전 달력·개인 기록 화면
- library.ts: 클래식·날짜별 저장 분리와 기존 기록 이전
- player.ts: 실행별 기록·완료 통계·한국 날짜와 일일 시드
- completion.ts: 현재 완료 실행을 포함한 난이도별 결과 요약
- access.ts: 무료 도움 및 향후 이용 정책 판단
- i18n.tsx: 한국어·영어 컨텍스트·언어 저장·문서 언어
- game-messages.ts: 게임 상태·논리 힌트 설명의 표시 언어 변환
- useNativeEvents.ts: Android 뒤로가기·백그라운드 이벤트
- session.ts: 게임 상태 변경, 실행 취소, 저장 데이터 검증
- game.ts: 문제 묶음, 후보·충돌·완성·유일해·힌트
- policy.ts: 난이도별 힌트 제한 정책
- logic.ts: 호환되는 v1 논리 인증, 설명형 힌트와 풀이 증거
- difficulty-policy.ts: 새 문제의 v2 단서·추론·부담 지수 수용 기준
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
| [App.tsx](../../src/App.tsx) | [./Lobby](../../src/Lobby.tsx) |
| [App.tsx](../../src/App.tsx) | [./library](../../src/library.ts) |
| [App.tsx](../../src/App.tsx) | [./player](../../src/player.ts) |
| [App.tsx](../../src/App.tsx) | [./access](../../src/access.ts) |
| [App.tsx](../../src/App.tsx) | [./completion](../../src/completion.ts) |
| [App.tsx](../../src/App.tsx) | [./i18n](../../src/i18n.tsx) |
| [App.tsx](../../src/App.tsx) | [./game-messages](../../src/game-messages.ts) |
| [App.tsx](../../src/App.tsx) | [./useNativeEvents](../../src/useNativeEvents.ts) |
| [App.tsx](../../src/App.tsx) | [./session](../../src/session.ts) |
| [Lobby.tsx](../../src/Lobby.tsx) | `react` |
| [Lobby.tsx](../../src/Lobby.tsx) | `lucide-react` |
| [Lobby.tsx](../../src/Lobby.tsx) | [./game](../../src/game.ts) |
| [Lobby.tsx](../../src/Lobby.tsx) | [./session](../../src/session.ts) |
| [Lobby.tsx](../../src/Lobby.tsx) | [./player](../../src/player.ts) |
| [Lobby.tsx](../../src/Lobby.tsx) | [./i18n](../../src/i18n.tsx) |
| [Lobby.tsx](../../src/Lobby.tsx) | [./lobby.css](../../src/lobby.css) |
| [completion.ts](../../src/completion.ts) | [./game](../../src/game.ts) |
| [completion.ts](../../src/completion.ts) | [./player](../../src/player.ts) |
| [completion.ts](../../src/completion.ts) | [./session](../../src/session.ts) |
| [difficulty-policy.ts](../../src/difficulty-policy.ts) | [./game](../../src/game.ts) |
| [difficulty-policy.ts](../../src/difficulty-policy.ts) | [./logic](../../src/logic.ts) |
| [game-messages.ts](../../src/game-messages.ts) | [./i18n](../../src/i18n.tsx) |
| [generator-client.ts](../../src/generator-client.ts) | [./game](../../src/game.ts) |
| [generator-client.ts](../../src/generator-client.ts) | [./generator](../../src/generator.ts) |
| [generator-client.ts](../../src/generator-client.ts) | [./generator.worker.ts](../../src/generator.worker.ts) |
| [generator.ts](../../src/generator.ts) | [./game](../../src/game.ts) |
| [generator.ts](../../src/generator.ts) | [./logic](../../src/logic.ts) |
| [generator.ts](../../src/generator.ts) | [./difficulty-policy](../../src/difficulty-policy.ts) |
| [generator.worker.ts](../../src/generator.worker.ts) | [./game](../../src/game.ts) |
| [generator.worker.ts](../../src/generator.worker.ts) | [./generator](../../src/generator.ts) |
| [i18n.tsx](../../src/i18n.tsx) | `react` |
| [library.ts](../../src/library.ts) | [./session](../../src/session.ts) |
| [library.ts](../../src/library.ts) | [./player](../../src/player.ts) |
| [logic.ts](../../src/logic.ts) | [./game](../../src/game.ts) |
| [main.tsx](../../src/main.tsx) | `react` |
| [main.tsx](../../src/main.tsx) | `react-dom/client` |
| [main.tsx](../../src/main.tsx) | [./App](../../src/App.tsx) |
| [main.tsx](../../src/main.tsx) | [./i18n](../../src/i18n.tsx) |
| [main.tsx](../../src/main.tsx) | [./style.css](../../src/style.css) |
| [player.ts](../../src/player.ts) | [./game](../../src/game.ts) |
| [player.ts](../../src/player.ts) | [./session](../../src/session.ts) |
| [player.ts](../../src/player.ts) | [./difficulty-policy](../../src/difficulty-policy.ts) |
| [policy.ts](../../src/policy.ts) | [./game](../../src/game.ts) |
| [session.ts](../../src/session.ts) | [./game](../../src/game.ts) |
| [session.ts](../../src/session.ts) | [./policy](../../src/policy.ts) |
| [session.ts](../../src/session.ts) | [./logic](../../src/logic.ts) |
| [session.ts](../../src/session.ts) | [./difficulty-policy](../../src/difficulty-policy.ts) |
| [starter.ts](../../src/starter.ts) | [./game](../../src/game.ts) |
| [useNativeEvents.ts](../../src/useNativeEvents.ts) | `react` |
| [useNativeEvents.ts](../../src/useNativeEvents.ts) | `@capacitor/core` |
| [useNativeEvents.ts](../../src/useNativeEvents.ts) | `@capacitor/app` |
