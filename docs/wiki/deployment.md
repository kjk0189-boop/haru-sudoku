# 실행과 배포

[목차](index.md) · [검증 기록](verification.md)

## 로컬
Node.js 22.12 이상과 pnpm 10.11을 권장한다.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm graph
```

## GitHub Pages
1. 공개 GitHub 저장소를 생성한다.
2. 로컬 저장소의 origin을 해당 URL로 연결하고 main을 push한다.
3. 저장소 Settings → Pages → Source에서 GitHub Actions를 선택한다.
4. 배포 워크플로가 테스트·빌드 후 dist를 Pages에 올린다.
5. 실제 주소에서 자산 로딩, 새로고침, 플레이, 저장 복원을 확인한다.

Vite의 상대 base(`./`)와 단일 화면 구조를 사용해 저장소 하위 경로를 지원한다.
원격 주소와 Pages 설정이 없으면 로컬 빌드 성공만으로 배포 완료라고 기록하지 않는다.
