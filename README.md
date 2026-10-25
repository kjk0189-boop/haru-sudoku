# 하루 스도쿠

하루의 작은 몰입. React + TypeScript로 만드는 한국어 스도쿠 웹게임.

**[지금 플레이하기](https://kjk0189-boop.github.io/haru-sudoku/)** · [배포 상태](https://github.com/kjk0189-boop/haru-sudoku/actions)

- [LLM 위키](docs/wiki/index.md)
- [기획](docs/wiki/product.md)
- [난이도·자동 생성 기준](docs/wiki/difficulty.md)
- [실행·배포](docs/wiki/deployment.md)
- [검증 기록](docs/wiki/verification.md)
- [변경 이력](docs/wiki/changes.md)

중복 숫자 항상 표시, 완료 숫자 숨김, 모든 후보를 채우는 고급 메모를 지원한다.
힌트는 현재 무제한이며 [난이도별 정책](src/policy.ts)으로 게임당 횟수를 제한할 수 있다.

`pnpm install` 후 `pnpm dev`로 실행한다. `pnpm test`, `pnpm build`로 검증한다.

쉬움·보통·어려움·전문가 문제를 무작위로 생성하고 유일해와 논리 풀이로 검증한다. 생성·힌트는 단일 후보부터 X-Wing까지 지원하며, 기록은 해당 브라우저에만 저장된다. 등급 경계는 실제 플레이를 바탕으로 보정할 초기 기준이다.

![하루 스도쿠 화면](docs/assets/generation-2026-10-25.png)
