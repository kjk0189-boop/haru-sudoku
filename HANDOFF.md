# 하루 스도쿠 인수인계

## 2026-11-17 / 이 노트북에서 직접 수행한 개발 환경 준비

이 절은 앞선 PC의 인계·배포 기록보다 나중에 이 노트북에서 직접 실행한 결과다.

- 저장소가 없는 작업 폴더와 상위 경로를 확인한 뒤 독립된 형제 프로젝트 폴더에 새 clone. 시작 HEAD `053b4a3`, main/origin 동일, ahead/behind 0/0, 기존 사용자 변경 없음. origin과 공개 범위는 변경하지 않았다.
- Git 2.56.0.windows.4. 기존 Node 24.22.1/pnpm 11.25.0을 보존하고, 프로젝트 밖 사용자 쓰기 가능 도구 폴더에 공식 Node 22.23.5 Windows x64(공식 SHA256 대조)와 pnpm 10.11.0 준비. 관리자 설치·환경변수/토큰/.env 생성 없음.
- `pnpm install --frozen-lockfile` 성공(169 패키지). 일시적 registry 503은 자동 재시도로 복구. lockfile 변경 없음.
- 요청한 `pnpm test`는 tsx가 `os.userInfo()`를 호출하면서 `uv_os_get_passwd ENOMEM`으로 테스트 본문 실행 전에 실패했다. Node 자체의 동일 API도 실패해 Windows 제한 실행 환경 문제로 분리했다. 테스트 삭제·의존성 수정·API 모킹 없이, 저장소 밖 임시 TypeScript transpileModule ESM loader로 원본 테스트 전체를 실행: 73/73 통과. 이 대체 검증을 표준 pnpm test 성공이라고 기록하지 않는다. 일반 PowerShell에서 표준 명령을 재실행할 필요가 있다.
- `pnpm build`는 Vite 설정 번들링 시 esbuild 상위 경로 Access denied로 실패. 상위 읽기 권한 추가 후에도 동일했다. `pnpm build --configLoader native`는 TypeScript 검사와 Vite 빌드 모두 통과(1600모듈). 소스·vite.config.ts 변경 없음.
- `pnpm graph` 성공: 19모듈·56연결. `git diff --exit-code -- docs/wiki/code-map.md` 및 lockfile diff 모두 0. codegraph CLI/연결 도구가 없어 **TypeScript AST import 그래프 대체 도구**를 사용했다.
- `pnpm dev`는 같은 esbuild 접근 문제로 실패. native 설정 로더에서는 서버가 잠시 시작됐지만 의존성 사전 번들링에서 같은 오류로 종료했다. 이를 정상 dev 서버라고 보고하지 않는다.
- 대안으로 `pnpm preview --configLoader native --port 5173` 실행 중. http://127.0.0.1:5173/ 및 /preview.html, 생성 JS/CSS HTTP 200 확인. 빌드 결과 미리보기이며 소스 변경 후 재빌드 필요.
- 브라우저 도구는 loopback origin 접근 승인이 거절되어 기본 화면·iframe 렌더·실제 메뉴·모바일 화면·터치 검증을 진행하지 못했다. 브라우저에서 위 두 URL을 직접 열어 확인한다. HTTP 200을 UI 검증으로 대신하지 않는다. 기존 localStorage를 읽거나 초기화·교체하지 않았다.
- Android Studio/JDK/SDK 설치·APK 빌드는 요청 범위 밖으로 미수행. docs/SETUP.md에 JDK21·SDK36·Capacitor sync·Gradle/CI 절차가 있음을 확인했다. 게임 기록은 브라우저/앱 데이터이므로 Git clone으로 이전되지 않는다.
- GitHub 연결 로그인과 기존 작성자가 일치함을 확인해 저장소 로컬 작성자 설정만 적용. 터미널 Git은 schannel 자격 증명 처리 실패로 `-c http.sslBackend=openssl` 일회성 옵션을 사용해 clone했다. 터미널 push dry-run은 wincredman 접근 실패·비대화형 username 오류. 연결된 GitHub 도구로 문서만 반영 후 원격과 로컬 동기화 여부를 실제 확인한다. 토큰·개인 키는 출력/저장하지 않았다.
- 변경 범위: HANDOFF.md, docs/SETUP.md, docs/wiki/verification.md, docs/wiki/development-log.md, docs/wiki/changes.md. 구현·워크플로 변경 없음. main 문서 반영은 기존 Pages workflow를 촉발할 수 있으나 이번 작업에서 호스팅 설정·공개 범위·Android 배포는 변경하지 않는다.
- 다음 작업: 일반 PowerShell에서 Node22/pnpm10으로 `pnpm test`, `pnpm build`, `pnpm dev`를 재실행하고 브라우저 두 화면 및 모바일을 확인한다. 과거 40문제 감사와 실기기 검증은 이번 재실행하지 않았다.

기준일: 2026-11-17. 저장소 기준 상대 경로를 사용한다. 새 작업은 이 문서, `AGENTS.md`, `git status --short --branch`, `docs/wiki/index.md`부터 확인한다.

## 목적과 현재 목표

설치 없이 즐기는 한국어/영어 스도쿠 웹게임과 개인 테스트용 Android APK를 개발한다. 공개 웹과 같은 코드로 앱 UI를 검토하고, 무료 도움 기능을 유지하며 난이도 차이와 모바일 사용성을 다듬는다. 이번 작업의 목표는 다른 노트북에서 개발을 재개할 수 있게 상태와 설치 절차를 Git에 남기는 것이다.

## 확인한 Git 상태

- 독립 프로젝트 루트에 기존 `.git`이 있다. 상위 저장소에 새 중첩 저장소를 만들지 않았다.
- 브랜치 `main`, 원격 `origin`: https://github.com/kjk0189-boop/haru-sudoku.git
- GitHub API로 확인한 공개 저장소다. 주소·공개 범위를 변경하지 않았다.
- 작업 시작 HEAD `17bcf88b9575d447e305dc79cae12c91be9f473b`. fetch 후 origin/main 대비 ahead/behind 0/0, 미커밋 변경 없음. 다른 사용자 변경을 포함해 커밋할 항목도 없었다.
- 기능 기준은 `755f6af`(난이도 v2), `17bcf88`은 그 배포 확인 문서다. 이번 준비 커밋은 `git log -1`로 확인한다. 커밋 자체의 해시를 이 문서 안에 선기록하지 않는다.
- 이번 준비 파일은 명시적으로 스테이징해 main에 커밋·푸시한다. 최종 성공 여부는 작업 결과 보고와 `git status --short --branch`, `git fetch origin`, `git rev-list --left-right --count HEAD...origin/main`으로 확인한다. 기존 미푸시 작업은 발견되지 않았다.

## 구현 완료

- React/TypeScript/Vite 웹게임, 홈·매일 도전·내 기록과 집중 플레이 분리. 모바일 게임 화면을 한 화면에 배치하고 긴 안내는 모달/패널로 연다.
- 입력·메모·자동 후보 채우기·undo·지우기·일시정지·힌트·저장 복원, 중복/오답 표시, 9개 채운 숫자 입력 차단.
- 쉬움/보통/어려움/전문가 자동 생성. 유일해·논리 완주·등급·정답 일치·최근 중복 제외 검증. Worker 생성 실패 시 기존 게임을 유지한다.
- 난이도 v2 단서 범위 40~46 / 32~37 / 27~31 / 22~26. 기법과 부담 조건도 함께 검사하므로 단서 수만으로 평가하지 않는다. 자세한 수식은 `docs/wiki/difficulty.md`.
- 진행 게임 재개 목록, 한국 날짜 기준 일일 시드, 난이도별 기록·최고/평균 시간·완료 횟수·힌트/실수 집계. 완료 시 다섯 항목 결과 창을 확인한 뒤 홈 이동.
- 내 기록에서 한국어/영어 전환·유지. 네이비 기본 조작·화이트 배경·버건디 오류/완료 상태. Pretendard UI + Manrope 숫자, OFL 폰트 내장.
- `/preview.html`은 실제 앱의 모바일 너비 iframe이다. `?v=<커밋 해시>`를 자식 경로로 전달하며 이전 버전을 고정하는 기능은 아니다.
- Capacitor Android 프로젝트와 수동 APK CI가 있다. 네이티브 뒤로가기·백그라운드 이벤트 연결. 실제 휴대폰 검증은 완료되지 않았다.

## 주요 결정과 보존할 동작

- 서버·계정 없이 기기 내 저장. 클래식 1개 + 최근 접근한 날짜별 30개 보드, 프로필 최대 500개 실행 기록. 실행 ID 중복 제거 및 완료 기록 고정. 새 PC clone은 게임 기록을 옮기지 않는다.
- 기존 생성 저장을 보존하려고 v1 논리 인증을 유지하고 `gen-v2-` 새 게임에만 강화 정책을 적용한다. 기존 게임을 억지로 재등급화하거나 삭제하지 않는다. 기존 기록과 새 기록은 함께 집계된다.
- 힌트·고급 메모는 현재 무료/무제한. `src/policy.ts`는 난이도별 제한, `src/access.ts`는 미래 무료 횟수·재화·보상 광고 판단 틀이다. 실제 지갑·광고 SDK·결제·보상 검증은 없다. 설정 변경만으로 수익화가 완성되지는 않는다.
- Worker 20초, 클라이언트 정리 35초, 생성 최대 10,000회. 실패 시 낮은 난이도로 바꾸지 않는다. 전문가 조건을 과도하게 강화하거나 조기에 삭제 복원을 적용하면 일부 seed가 실패해 현 정책을 채택했다.
- 더 자세한 결정과 근거: `docs/wiki/decisions.md` ADR-005~011.

## 중요한 파일

| 경로 | 역할 |
| --- | --- |
| `src/App.tsx`, `src/Lobby.tsx` | 게임/홈/기록/달력/모달 통합 |
| `src/session.ts`, `src/game.ts` | UI와 분리한 상태·저장 검증·보드 규칙 |
| `src/logic.ts`, `src/difficulty-policy.ts` | v1 논리 인증, v2 생성 수용 기준 |
| `src/generator*.ts`, `src/starter.ts` | 생성/Worker/최근 문제/최초 문제 |
| `src/library.ts`, `src/player.ts`, `src/completion.ts` | 모드별 저장·실행 통계·결과 집계 |
| `src/i18n.tsx`, `src/game-messages.ts` | 언어 설정과 메시지 번역 |
| `src/style.css`, `src/lobby.css`, `src/fonts.css`, `public/fonts/` | 화면과 내장 폰트/라이선스 |
| `src/useNativeEvents.ts`, `capacitor.config.ts`, `android/` | Android 앱 연결·패키징 |
| `public/preview.html`, `vite.config.ts` | 실제 앱 미리보기·상대 자산 경로 |
| `tests/`, `scripts/`, `.github/workflows/` | 자동 검사·생성 감사·그래프·배포/APK |

정적 의존관계는 `docs/wiki/code-map.md`(19개 모듈·56개 import 연결). 이번 환경에 codegraph 제품/CLI/연결 도구가 없어 TypeScript AST 기반 `pnpm graph`를 대체 사용했다.

## 실행과 검증

새 PC의 도구 설치부터 Android 설정까지는 `docs/SETUP.md`를 따른다. CI 기준 Node.js 22, pnpm 10.11.0이다.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm graph
git diff --exit-code -- docs/wiki/code-map.md
```

2026-11-17 실제 재검증: 기존 설치 의존성에서 테스트 73/73, TypeScript 검사, Vite 배포 빌드, AST 그래프 재생성과 최신성 비교 통과. 현재 실행 환경은 Node 24.22.1·전역 pnpm 11.25.0으로 CI와 달라, 검사는 아래 직접 명령을 사용했다. 이것을 새 PC에서의 pnpm 10 설치 검증으로 해석하지 않는다.

```sh
node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
node scripts/codegraph.mjs
```

추적된 ignored 파일 없음. 추적 경로에 환경 파일/서명 키/의존성/빌드 결과 없음. 비밀키·GitHub 토큰·AWS 키의 제한된 패턴을 파일명만 반환하도록 검사해 일치 없음. 패턴 검사는 모든 종류의 비밀정보 부재를 보증하지 않으므로 새 파일도 diff 검토한다.

과거 검증 사실(이번 재실행과 구분): 2026-10-26 생성 감사 40/40, 실제 브라우저 네 난이도 생성·메모/기존 저장 복원·모바일 배치·완료 결과·언어 전환 확인. Pages 실행 40294484130 성공, 공개 Worker와 로컬 빌드 해시 일치. 상세 증거는 `docs/wiki/verification.md`, `docs/wiki/generation-audit.json`, `docs/assets/`에 있다.

## 미검증·알려진 문제

- 새 노트북에서의 깨끗한 clone/의존성 설치는 해당 기기가 없어 미수행. `docs/SETUP.md` 순서로 실행하고 frozen-lockfile 설치 및 전체 검사를 확인한다. 이번에는 게임 코드를 바꾸지 않아 생성 40개 감사와 브라우저 조작을 반복하지 않았다.
- 실제 Android 설치·오프라인·뒤로가기·터치·안전 영역·모바일 CPU 생성 속도는 연결 기기/JDK/SDK 부재로 미검증. 최신 코드로 APK를 빌드해 휴대폰에서 확인한다. 웹 빌드 성공은 기기 검증을 대신하지 않는다.
- 마지막으로 기록된 APK는 `1c56c07` 기준이다. 후속 디자인·언어·완료 결과·난이도 v2는 그 APK에 없다. artifact는 30일 보관이므로 현재 다운로드 가능하다고 가정하지 말고 새 빌드를 실행한다. CI debug 서명이 달라지면 재설치가 필요할 수 있고 기록 손실 위험이 있다.
- 실제 플레이 체감 난이도는 추정/보정 대상이다. PC 표본 전문가 최대 8.107초는 모바일 성능 보증이 아니며 제한 시간 실패가 가능하다.
- 과거 iframe 검사에서 출처 불명 MutationObserver.observe 오류가 수집되었다. 앱에 해당 호출이 없고 초기 error 계측·조작은 정상이었지만 도구가 소스/스택을 제공하지 않아 원인 미확정이다. 재현되면 직접 브라우저 콘솔의 소스/스택을 확보한다.
- 계정 동기화·기록 내보내기·안정적 release 서명·광고/재화는 미구현이며 진행 중인 구현으로 오인하지 않는다. 현재 다른 미완성 코드 작업은 발견되지 않았다.

## 다음 할 일(우선순위)

1. 새 노트북에서 clone → 문서/상태 확인 → Node/pnpm 설치 → frozen 설치 → 테스트/빌드/그래프 → 웹 미리보기. 도구 버전과 결과를 이 문서에 갱신한다.
2. 최신 main으로 APK를 재빌드하고 실제 Android에서 설치·진행 저장·오프라인·백그라운드/뒤로가기·안전 영역을 검증한다. 기존 기록을 삭제하는 재설치는 신중히 진행한다.
3. 네 단계의 사람 플레이 기록과 실제 모바일 생성 시간을 수집해 정책을 보정한다. v1 저장 호환과 생성 실패 시 기존 게임 유지 테스트를 보존한다.
4. 앱 업데이트 전에 기록 내보내기/가져오기와 안정적 서명 키 운용을 설계한다.
5. 광고/재화는 사용자의 추가 요구와 운영 정책이 정해진 뒤 실제 연동·보상 검증을 구현한다.
