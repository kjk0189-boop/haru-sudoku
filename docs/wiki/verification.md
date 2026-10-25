# 검증 기록

[목차](index.md) · [개발 기록](development-log.md)

## 2026-10-25 / 초기 상태
- 작업 폴더에 기존 코드와 Git 저장소 없음.
- codegraph 도구 및 실행 명령을 찾지 못함. 코드 그래프 대체 스크립트 예정.
- Git 작성자 설정 없음. 연결된 GitHub 프로필의 계정 이름과 이메일을 저장소 로컬 설정으로 사용한다.
- 패키지 설치: Windows 심볼릭 링크 제한으로 hoisted + copy 설치 사용. 샌드박스 DNS 제한으로 네트워크 권한을 사용한 설치 진행.
- 아직 게임 코드 검증 전. 완료 후 실제 결과를 추가한다.

## 2026-10-25 / 첫 구현 검증
- `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`: 16/16 통과. 9개 문제 유일해, 후보·충돌·완성, 기본 힌트, 원본 불변성, 잘못된 저장값 거부, 고정 칸 보호, 메모·되돌리기, 기록 100개 제한.
- `node node_modules/typescript/bin/tsc -b`: 통과.
- `node node_modules/vite/bin/vite.js build`: 통과. 최초 dist/assets 생성이 Windows 권한 제한으로 실패해 PowerShell로 디렉터리를 만든 뒤 재실행해 성공.
- `node scripts/codegraph.mjs`: 4개 TS 모듈의 import 9개 추출.
- 실제 앱 내 브라우저에서 확인: 숫자 입력과 중복 안내, 실행 취소, 후보 메모, 새로고침 후 메모·시간·문제 복원, 키보드 숫자 입력, 일시정지 시 숫자 숨김·입력 비활성화, 이어하기, 설명형 힌트.
- 390×844 화면: 보드·숫자판 레이아웃 확인, 가로 넘침 없음 (document scrollWidth 375, innerWidth 390).
- 보조 에이전트 검토로 발견한 초기 키보드 선택 누락 수정. 셀 포커스 시 선택 동기화 및 중복 오류 aria-invalid 추가. 수정 후 테스트·타입·빌드 재통과.

## 남은 검증
- 실제 모바일 Safari/Android 기기: 현재 데스크톱 브라우저만 제공되어 미검증.
- 모든 난이도의 사람 풀이 기법 평가: 아직 전용 난이도 평가기를 구현하지 않아 미검증. UI 설정 안내에 잠정 분류 표시.
- GitHub Actions와 실제 Pages 배포 경로: 아래 공개 배포 검증 완료.
- 브라우저 저장 차단 상황: 예외 처리 구현 및 코드 검토만 완료. 실제 브라우저 정책 강제 테스트는 아직 하지 않음.

## 2026-10-25 / 공개 배포 검증
- 첫 구현 커밋 `2e91007`을 origin/main으로 업로드.
- [Actions 실행 40169714591](https://github.com/kjk0189-boop/haru-sudoku/actions/runs/40169714591): verify, deploy 모두 success. Linux에서 frozen lock 설치, 16개 테스트, 타입·빌드, 그래프 최신성 검사를 통과.
- GitHub Pages를 workflow 방식으로 활성화.
- [공개 게임](https://kjk0189-boop.github.io/haru-sudoku/)에서 실제 앱과 자산 로딩 확인.
- 공개 주소에서 키보드 입력, 새로고침 후 숫자 복원, 보통 난이도 새 게임(33개 단서) 시작, 같은 문제 재시작, 오류 표시 설정, 플레이 가이드 열기·닫기를 확인.
- 로컬 브라우저에서 힌트로 41개 빈칸을 채워 완성 안내와 힌트 41회 표시까지 확인.
- 공개 사이트 브라우저 error 로그 0건.
- [배포 화면 증거](../assets/preview.png) 저장.
- 실제 모바일 기기 및 브라우저 저장 차단 정책은 위 사유로 여전히 미검증. 난이도 정밀 평가도 후속 작업이다.

## 2026-10-25 / 플레이 편의 개선 검증
- `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`: 전체 23개 통과 (기존 16 + 신규 7). 신규 테스트는 [details.test.ts](../../tests/details.test.ts).
- 난이도별 제한을 테스트 인자로 easy=1, medium=2, hard=0으로 주입해 최종 1회 사용과 소진·0회 차단 검증. 실패한 힌트 미차감, undo 후 사용량 유지, 유효한 보드에서 논리 힌트 미발견도 검증.
- `node node_modules/typescript/bin/tsc -b`, `node node_modules/vite/bin/vite.js build`: 통과.
- `node scripts/codegraph.mjs`: TS 5개 모듈과 import 11개. codegraph 제품 도구·CLI는 여전히 없어 AST 대체 도구를 사용.
- 실제 로컬 브라우저: 첫 빈칸에 1을 입력해 충돌 2칸 표시 확인. 중복 상태에서 고급 메모 안내 후 작업 거부 확인.
- 고급 메모로 41개 빈칸의 후보 입력, 한 번 undo 후 0개로 복원, 다시 적용 후 새로고침해 41칸 메모 복원 확인.
- 힌트 15회 적용 후 숫자 9 버튼 숨김. 빈칸에서 9 키 입력 거부와 안내 확인. 입력된 9를 지우면 버튼 복원, undo하면 다시 숨김.
- 390×844 모바일 너비에서 고급 메모·힌트·완료 숫자 자리 확인. scrollWidth=375, innerWidth=390으로 가로 넘침 없음.
- 로컬 브라우저 error 로그 0건. [변경 화면](../assets/details-2026-10-25.png).
- 추가 코드 검토: 세션의 입력 차단, 힌트 제한, 단일 undo와 저장 형식 호환성에 수정이 필요한 결함을 발견하지 못함.
- 직접 `pnpm test`는 실행 환경의 store 심볼릭 링크 EPERM으로 실행 불가. 설치된 로컬 tsx CLI로 같은 테스트를 실행함. 원격 Actions에서는 정상 pnpm 경로를 다시 확인한다.
- 미검증: 제한이 있는 UI의 실제 공개 배포는 현재 제품 정책이 모두 무제한이므로 수행하지 않음. 제한 계산·차단은 자동 테스트로 확인. 실제 모바일 기기는 이 환경에서 접근할 수 없어 미검증.
