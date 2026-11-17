# 다른 노트북에서 개발하기

저장소 루트를 기준으로 실행한다. 텍스트는 UTF-8로 취급한다. 현재 웹 실행에는 환경변수·API 키·서버가 필요 없으므로 `.env.example`은 만들지 않았다. 향후 필요할 때 이름과 빈 예시만 추가하고 실제 값은 Git에 넣지 않는다. `package.json`의 private는 npm 배포 방지이며 GitHub 비공개 설정이 아니다.

## 웹 개발

필수: Git, Node.js 22 LTS의 22.12 이상 패치 버전(CI 기준 22), pnpm 10.11.0, 최신 브라우저. 실제 의존성 버전은 `pnpm-lock.yaml`에 고정되어 있다. 다른 버전으로 lockfile을 임의 갱신하지 않는다.

```sh
git clone https://github.com/kjk0189-boop/haru-sudoku.git
cd haru-sudoku
git status --short --branch
```

`AGENTS.md`, `HANDOFF.md`, `docs/wiki/index.md`를 읽는다. Node.js 22를 설치한 뒤 pnpm이 없거나 버전이 다르면 다음을 실행한다(설치 디렉터리 권한이 없으면 사용자 쓰기 가능한 Node 설치를 사용한다).

```sh
npm install --global pnpm@10.11.0
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm dev
```

터미널이 표시하는 로컬 URL을 연다. 보통 `http://127.0.0.1:5173/`, 모바일 화면은 같은 서버의 `/preview.html`이다. 이미 포트가 사용 중이면 Vite가 다른 포트를 고를 수 있다. 서버를 종료하려면 Ctrl+C.

```sh
pnpm test
pnpm build
pnpm graph
git diff --exit-code -- docs/wiki/code-map.md
pnpm preview
```

`pnpm preview`는 먼저 만든 dist를 제공하며 보통 포트 4173이다. 소스 수정 후 재빌드해야 한다. `pnpm audit:generation`은 난이도별 10개, 총 40개 문제를 재생성하고 `docs/wiki/generation-audit.json`을 덮어쓰는 선택 검사다. 성능 수치는 PC마다 다르므로 diff를 검토한 뒤 의도한 경우에만 커밋한다.

## Android APK가 필요할 때만

웹 개발에는 Android 도구가 필요 없다. 로컬 APK 빌드에는 JDK 21, Android Studio와 SDK Platform 36, Build Tools 36.0.0, Platform Tools가 필요하다. Android Studio의 SDK Manager에서 해당 패키지와 라이선스를 준비한다. `JAVA_HOME`은 JDK 21을 가리키도록 설정한다. SDK 경로는 각 PC의 `ANDROID_HOME` 또는 Git에서 제외된 `android/local.properties`의 `sdk.dir`로 지정한다. 다른 PC의 경로를 복사하지 않는다.

프로젝트는 Gradle Wrapper 8.14.3·AGP 8.13.0을 사용하므로 전역 Gradle 설치는 필요 없다. 최소 기기는 Android 7/API 24다.

```sh
pnpm android:sync
pnpm android:open
```

clone 직후에도 `android:sync`가 필수다. 이 명령은 웹 빌드 후 제외된 Capacitor 자산·플러그인 구성을 생성한다. Windows에서 CLI 빌드하려면:

```powershell
cd android
.\gradlew.bat :app:assembleDebug --no-daemon
```

macOS/Linux에서는 `cd android` 후 `./gradlew :app:assembleDebug --no-daemon`을 사용한다. 실행 권한 오류 시 `chmod +x gradlew`를 먼저 실행한다. APK는 `android/app/build/outputs/apk/debug/app-debug.apk`에 생성된다.

대안은 GitHub Actions의 **Build Android test APK → Run workflow → main**이다. 쓰기 권한으로 다시 로그인하고 성공한 실행의 `haru-sudoku-debug` artifact를 받는다. 보관 기간은 30일이므로 과거 파일이 남아 있다고 가정하지 않는다. 스토어 등록·광고·release 서명 설정은 없다. debug 키가 달라지면 기존 앱 위에 설치되지 않을 수 있으며 앱 삭제는 기록도 삭제할 수 있다.

## 별도로 준비하거나 인증할 항목

- 공개 clone은 로그인 없이 가능하다. push·Actions 수동 실행에는 해당 GitHub 저장소 쓰기 권한으로 새 PC에서 인증한다. OS 자격 증명 관리자 또는 SSH를 이용하고 토큰을 원격 URL·문서·셸 파일에 넣지 않는다. 커밋용 `git config user.name`과 `git config user.email`도 확인한다.
- GitHub Pages는 기존 저장소의 Actions 배포를 사용한다. main push는 검사 후 공개 사이트를 갱신하므로 공개할 변경만 올린다. 원격 주소·공개 범위·Pages 설정을 임의 변경하지 않는다.
- 게임 진행·통계·언어는 각 브라우저/앱의 localStorage다. Git에는 없고 자동 이전·계정 동기화·내보내기 UI도 없다. 새 노트북은 새 기록으로 시작한다. 기존 기록이 중요하면 기존 브라우저/앱을 유지하고 데이터 이전 기능을 별도 구현한다.
- `node_modules/`, `dist/`, Gradle 캐시·빌드 결과·Capacitor 생성물은 설치/빌드/sync로 다시 만든다. `artifacts/`의 과거 APK·실험 파일은 옮길 필요가 없다. 폰트와 라이선스는 저장소에 포함되어 별도 다운로드하지 않는다.
- 서명 키·비밀번호·로컬 SDK 설정은 Git에서 제외한다. 현재 안정적 release 키 운용은 미구현이다. 향후 만들면 안전한 별도 보관·백업 절차가 필요하다. 개인 debug 키를 공개 저장소로 복사하지 않는다.

## codegraph·MCP·스킬

이 프로젝트는 MCP·Codex 스킬·codegraph 제품 설치 없이 실행/검증할 수 있다. 이번 환경에는 codegraph CLI나 연결 도구가 없어 `pnpm graph`의 **TypeScript AST import 그래프 대체 도구**를 사용했다. `scripts/codegraph.mjs`는 TypeScript 의존성 설치 후 동작하며 `docs/wiki/code-map.md`를 생성한다. 정적 import와 Worker URL 연결을 다루며 런타임 호출은 분석하지 않는다.

새 환경에서 실제 codegraph 도구가 제공되면 해당 설치의 공식 안내에 따라 연결하고 구조 분석에 사용하되, CI가 요구하는 `pnpm graph`는 계속 실행한다. 특정 codegraph 패키지나 설치 명령은 확인되지 않아 추정해 지정하지 않는다. GitHub MCP나 브라우저 자동화는 선택 사항이며 사용 시 새 노트북에서 별도로 로그인·권한 연결한다. 기존 PC의 MCP 설정·토큰은 복사하거나 커밋하지 않는다. Codex 사용 시 저장소의 AGENTS.md를 읽고, 필요한 스킬은 새 환경에서 제공되는 지침을 따른다.
