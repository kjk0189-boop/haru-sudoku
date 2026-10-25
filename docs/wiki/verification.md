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
- GitHub Actions와 실제 Pages 배포 경로: 원격 업로드 후 확인 예정.
- 브라우저 저장 차단 상황: 예외 처리 구현 및 코드 검토만 완료. 실제 브라우저 정책 강제 테스트는 아직 하지 않음.
