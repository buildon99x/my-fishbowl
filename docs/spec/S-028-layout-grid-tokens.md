# S-028 Layout Grid 토큰화 + Dock/Drawer 골격

## 상태

- 상태: done
- 구현 여부: done
- 검증 여부: tested

## 목표

- 현재 4모서리 + 중앙 하단에 흩어진 floating chrome(`page-header`, `aquarium-status`, `sound-mute-toggle`, `onboarding-help-btn`, `prop-action-panel`)을 **Drawer(좌상단 메뉴) + Hero(어항) + Dock(중앙 하단)** 3 zone으로 재배치한다.
- 모든 fixed 좌표 하드코딩을 제거하고 CSS 변수 기반 grid로 전환해 새 기능 추가 시 한 곳만 수정하면 되도록 한다.
- 좌상단 ☰ 메뉴 → drawer에 어항 제목·청결도·이끼·오브젝트 리스트·설정을 통합한다.

## 범위

- 포함할 것:
  - 루트 컨테이너에 `:root` 레벨 CSS 변수(`--safe-top/bottom`, `--dock-height`, `--dock-bottom`, `--drawer-width`) 도입.
  - `.fishbowl-page`를 CSS grid로 재구성.
  - `☰` 메뉴 버튼 + 슬라이드 drawer 컴포넌트(우→좌 슬라이드, backdrop) 추가.
  - 기존 `page-header` 타이틀, `aquarium-status` 카드, `renderFishList` 결과, `onboarding-help-btn`을 drawer 안 섹션으로 이동.
  - `sound-mute-toggle`은 우상단 단독 유지하되 z-index 토큰화.
  - undo snackbar / prop-panel / fish-input-widget 좌표를 새 변수 기반으로 갱신.
- 제외할 것:
  - 등록 UI를 bottom-sheet로 전환하는 작업 → **S-029** 별도 분리.
  - 단일 탭으로 prop-panel을 여는 인터랙션 변경 → **S-030** 별도.
  - 아이콘/색상 토큰 축소 → **S-032** 별도.

## 사용자 흐름

1. 사용자가 앱을 열면 어항이 화면 중앙 가득 차고, 좌상단에는 `☰` 버튼 하나만 보인다.
2. 우상단에는 `🔊` 음소거 토글만 노출된다.
3. 하단 중앙에는 5개 액션 dock(➕/🍖/🎁/🧽/❓)이 항상 보인다.
4. 사용자가 `☰`을 탭하면 좌측에서 drawer가 슬라이드되며 어항 제목·통계·오브젝트 리스트·도움말 진입점을 표시한다.
5. drawer 외부 영역 탭 또는 닫기 버튼으로 drawer가 사라진다.
6. iPad Split View 등으로 폭이 320px 이하가 되면 drawer가 자동으로 전체 화면 모달이 된다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - `☰` 메뉴 버튼(좌상단, 56px touch target).
  - drawer 컨테이너(width 320px, max-width 100vw, slide-in 0.25s).
  - drawer backdrop(`rgba(0,0,0,0.32)`, dismiss on tap).
  - 기존 `aquarium-status`, `renderFishList`, 도움말 진입점 흡수.
- 필요한 상태:
  - `appState.drawerOpen: boolean`.
  - 닫힘 시 `--drawer-width: 0`, 열림 시 `320px`.
- 오류 또는 빈 상태:
  - 오브젝트 0개일 때 drawer 안 리스트는 기존 "빈 상태" 메시지 재사용.

## 구현 메모

- 관련 파일:
  - `src/styles/layout.css` — grid + 변수 정의(메인 리팩토링 지점).
  - `src/styles/tokens.css` — z-index 토큰(`--z-chrome/dock/overlay/modal/toast`) 추가.
  - `src/main.js` — drawer state, render 트리에서 status/리스트 → drawer 위치로 이동.
  - `src/features/fish-list/view.js` — `renderAquariumStatus` 시그니처는 유지하되 wrapper만 drawer body로 흡수.
  - `src/features/onboarding/view.js` — `renderHelpButton`을 dock 끝에 합치거나 drawer로 이동.
  - 신규 `src/features/drawer/` 디렉터리(`index.js`, `view.js`, `events.js`). `ARCHITECTURE.md` 기준상 features 하위 도메인 모듈로 적합.
- `ARCHITECTURE.md` 기준으로 새 디렉터리 필요: 예 — `src/features/drawer/`.

## 검증 기준

- [ ] iPad Safari 가로/세로, 1024×768/834×1194에서 어떤 두 chrome 요소도 시각적으로 겹치지 않는다.
- [ ] `☰` 탭 → drawer가 0.25s 안에 열리고 backdrop tap으로 닫힌다.
- [ ] drawer 안에서 기존 오브젝트 리스트(편집/감추기/삭제), 청결도/이끼 통계가 모두 동작한다.
- [ ] `prop-panel`, `fish-input-widget`, undo snackbar 위치가 새 변수 기반으로 갱신되어 좌표 하드코딩이 코드에 없다.
- [ ] 폭 320px(Split View 가정)에서 drawer가 전체 화면 모달로 동작한다.
- [ ] 브라우저 콘솔 오류 없음, `npm run build`/`npm test` 통과.
