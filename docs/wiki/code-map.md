# 코드 연결 구조

[목차](index.md) · [설계 결정](decisions.md)

codegraph 도구와 CLI는 세션에서 발견되지 않았다. 대신 TypeScript 컴파일러 API를 사용하는 로컬 코드 그래프 스크립트를 제공해 import 관계를 분석한다. 이것은 원래 codegraph 제품과 별개의 대체 도구다.

구현 후 `pnpm graph`로 이 문서의 그래프를 갱신한다.
