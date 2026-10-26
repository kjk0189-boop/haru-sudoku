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

## 현재 운영 정보
- 저장소: https://github.com/kjk0189-boop/haru-sudoku
- 게임: https://kjk0189-boop.github.io/haru-sudoku/
- 배포 브랜치: main
- Pages Source: GitHub Actions (workflow)
- [첫 배포 성공 기록](https://github.com/kjk0189-boop/haru-sudoku/actions/runs/40169714591)
- 소스·위키 변경을 main에 push하면 자동 재검증·재배포된다. 검증 실패 시 새 배포가 진행되지 않는다.
- 네 단계 자동 생성 배포: [2026-10-25 실행](https://github.com/kjk0189-boop/haru-sudoku/actions/runs/40172499301). 실제 공개 경로에서 Worker 생성 성공 확인. 이전 탭이 열린 경우 새로고침하면 최신 코드로 전환된다.

## 개인 Android APK
[앱 설계와 설치 안내](android-app.md)를 따른다. `.github/workflows/android-apk.yml`을 수동 실행한다. 웹 변경은 기존 Pages 워크플로로 별도 배포되며, APK는 다시 빌드하고 설치해야 변경된다.

## 설치 없이 모바일 디자인 검토
[모바일 미리보기](https://kjk0189-boop.github.io/haru-sudoku/preview.html)는 동일한 게임을 PC에서도 모바일 너비로 보여준다. PC 홈 상단 `모바일 화면 보기`에서도 연다. 디자인 수정은 Pages 배포 후 웹에서 확인할 수 있다. [설계](visual-design.md).
