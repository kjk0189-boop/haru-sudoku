# 설계 결정

[목차](index.md) · [제품 기획](product.md) · [코드 구조](code-map.md)

## ADR-001: 서버 없이 시작
- 상태: 채택 (2026-10-25)
- 구성: React + TypeScript + Vite, localStorage, GitHub Actions + Pages.
- 이유: 독립적인 싱글 플레이이므로 서버 운영 없이 배포 가능. 게임 규칙을 UI에서 분리해 테스트한다.
- 한계: 브라우저 데이터 삭제 시 기록 소실. 여러 기기 간 공유 불가. 클라이언트에 정답이 있으므로 경쟁 기록의 공정성을 보장하지 않는다.
- 근거: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Vite 배포](https://vite.dev/guide/static-deploy.html#github-pages).

## ADR-002: 위키를 저장소 안에 유지
- 상태: 채택 (사용자 요구, 2026-10-25)
- 별도 GitHub Wiki 대신 docs/wiki를 사용한다. 코드와 문서 변경이 한 커밋에 남고 LLM이 로컬에서 읽을 수 있다.
- 작업 단위로 커밋하며 제품·설계·검증·남은 일을 링크로 연결한다.

## ADR-003: 검증한 문제 묶음
- 상태: 채택
- 실시간 생성 대신 고정 문제를 제공하고 유일해 검사로 품질을 보장한다.
- 난이도는 초기 분류이며 인간 풀이 기법으로 정밀 검증하기 전까지 잠정값으로 표시한다.
- 힌트는 설명할 수 있는 논리적 단일 후보를 우선한다. 발견하지 못하면 답을 임의로 공개하지 않고 그 한계를 안내한다.
