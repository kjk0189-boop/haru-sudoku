# 개발 기록

[목차](index.md) · [검증](verification.md) · [배포](deployment.md)

## 2026-10-25 / 시작
- 사용자 승인: 추천한 스도쿠 구성으로 구현. LLM 위키 형태의 기록을 Git에 유지.
- React·TypeScript·Vite 기반 생성, 위키 작성.
- 역할 분담: 메인 에이전트는 화면·상태·저장·배포, 보조 에이전트는 퍼즐 엔진과 유일해 테스트.
- 남은 일: 게임 구현과 검증, 로컬 커밋, GitHub 원격 저장소 연결과 실제 Pages 배포.

## 2026-10-25 / 첫 플레이 버전
- 모바일 대응 게임 화면, 선택/같은 숫자/행/열/상자 강조, 입력·메모·취소·지우기 구현.
- 타이머·일시정지·새 게임·재시작·저장 복원·논리 힌트·완료 안내 구현.
- 16개 자동 테스트, 타입 검사, 배포 빌드와 브라우저 핵심 조작 확인. [검증 기록](verification.md).
- 사용자 제공 원격: https://github.com/kjk0189-boop/haru-sudoku (공개, 빈 저장소 확인).
- codegraph 미제공 환경의 대체 AST import 그래프와 Pages 워크플로 추가.
- 다음: GitHub 업로드, Pages 활성화 및 실제 배포 주소 확인.

## 2026-10-25 / 첫 공개 배포 완료
- [원격 저장소](https://github.com/kjk0189-boop/haru-sudoku)에 기획 커밋 `241e2d3`과 첫 구현 커밋 `2e91007` 업로드.
- Pages 활성화, Actions verify·deploy 성공 및 [공개 게임](https://kjk0189-boop.github.io/haru-sudoku/) 조작 확인.
- [검증 근거](verification.md), README 플레이 링크와 스크린샷, 후속 작업자를 위한 AGENTS.md 기록.
- 다음 개발 후보: 일일 도전, 풀이 기법 기반 난이도 평가, 개인 통계, 실제 휴대폰 테스트.
- 운영 규칙: 이후 구현 변경도 위키와 함께 커밋하고 main에 올리면 자동 검사 후 배포된다.
