# S-017 Main and Components Structure

## 상태

- 상태: implemented
- 구현 여부: in-progress
- 검증 여부: unit-tested

## 목표

- `src/main.js`와 `src/styles/components.css`를 Claude가 더 쉽게 수정할 수 있도록 구조 정리 계획을 정의한다.
- 기능 동작을 바꾸지 않고, 먼저 수정 위치를 명확히 한 뒤 작은 단위의 helper 추출과 제한적 CSS 분할을 진행한다.
- 대규모 파일 분할보다 반복 수정 안정성, 검증 가능성, 스펙 기반 작업 흐름을 우선한다.

## 범위

- 포함:
  - `src/main.js`의 현재 책임을 문서화하고 수정 위치 맵을 만든다.
  - `src/main.js` 내부 함수 순서를 섹션별로 정리하는 계획을 정의한다.
  - 물고기 표시/transform 경로를 작은 pure helper로 추출하는 계획을 정의한다.
  - helper 추출 대상에 대한 Vitest 검증 기준을 정의한다.
  - `src/styles/components.css`의 현재 섹션을 문서화하고, CSS 분할 기준을 정의한다.
  - CSS 분할은 필요한 경우 2~3개 단위로 제한한다.
  - `src/styles/components.css`의 selector ownership과 import 순서 기준을 정의한다.
- 제외:
  - CSS `@media` 닫힘 수정과 깨진 문구/주석 복구. 해당 항목은 이미 처리된 것으로 간주한다.
  - `src/main.js`를 한 번에 여러 feature 파일로 대규모 분리하는 작업.
  - `src/styles/components.css`를 한 번에 많은 파일로 분리하는 작업.
  - 런타임 UI 동작 변경.
  - 새로운 기능 추가.

## 사용자 흐름

1. 사용자가 Claude에게 `src/main.js` 또는 `src/styles/components.css` 관련 수정을 요청한다.
2. Claude는 먼저 이 스펙의 수정 위치 맵을 확인한다.
3. Claude는 요구사항이 어느 영역에 해당하는지 분류한다.
   - 앱 저장/복원
   - 물고기 생성/표시/transform
   - 물고기 목록과 편집 UI
   - feeding/cleaning/bubble/algae 연결
   - prop panel
   - CSS 레이어와 컴포넌트 스타일
4. Claude는 해당 영역의 최소 파일과 함수만 수정한다.
5. transform 또는 계산 helper를 수정한 경우 관련 unit test를 실행한다.
6. UI 또는 CSS를 수정한 경우 현재 worktree의 실제 dev server URL을 확인한 뒤 브라우저에서 상태 전환을 검증한다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 없음. 이 스펙은 구조 정리 계획이며 새로운 UI를 요구하지 않는다.
- 필요한 상태:
  - 기존 localStorage 저장 형식과 fish 상태 필드를 유지한다.
  - 기존 fish transform 필드(`size`, `rotation`, `scaleX`, `scaleY`, `flipped`, `flippedY`, `movementTilt`, `waveOffset`)의 의미를 유지한다.
- 오류 또는 빈 상태:
  - 기존 저장 데이터를 로드할 수 있어야 한다.
  - 물고기 목록이 비어 있을 때 기존 빈 상태가 유지되어야 한다.
  - CSS 분할 후에도 기존 responsive, hover, focus, expanded 상태가 깨지지 않아야 한다.

## 구현 메모

### `src/main.js` 수정 위치 맵

- 앱 초기화:
  - `initApp`
  - `renderApp`
- 저장/복원:
  - `createAquarium`
  - `normalizeAquarium`
  - `loadAquarium`
  - `saveAquarium`
- 물고기 생성과 변경:
  - `createFishFromDraft`
  - `addFishToAquarium`
  - `deleteFishFromAquarium`
  - `toggleFishHidden`
  - `updateFishAppearance`
  - `getFishById`
- 물고기 표시/transform:
  - `renderFishes`
  - `patchFishPositions`
  - `shouldFlipFishForMovement`
  - CSS 변수: `--fish-x`, `--fish-y`, `--fish-size`, `--fish-scale-x`, `--fish-scale-y`, `--fish-rotation`, `--fish-tilt`, `--fish-bob-y`, `--fish-flip`, `--fish-flip-y`
- 물고기 목록/편집:
  - `renderFishList`
  - `renderAquariumStatus`
  - `bindAquariumControls`
- Feeding 연결:
  - `startFeedingAnimation`
  - `patchFoodLayer`
  - `bindFeedingEvents`
  - feeding feature 모듈 구성(S-010 반영): `src/features/feeding/state.js`, `view.js`, `index.js`, `foodConfig.js`, `foodPhysics.js`, `foodEffects.js`. 종류별 설정/물리/효과는 `foodConfig.js`/`foodPhysics.js`/`foodEffects.js`에 위치한다.
- Cleaning 연결:
  - `renderCleanButton`
  - `renderCleaningProgressBar`
  - `renderCleaningOverlay`
  - `bindCleaningEvents`
  - `exitCleaningMode`
- Aquarium visual:
  - `renderDecoration`
  - `renderEmptyState`
- Feature shell 연결 (import된 call site — 정의 위치는 `src/features/` 하위):
  - `renderFishInputPanel` → `src/features/fish-input/view.js`
  - `renderPropPanel` → `src/features/prop-panel/view.js`
  - `bindFishInputEvents` → `src/features/fish-input/index.js`
  - `bindFeedingEvents` → `src/features/feeding/index.js`
  - `bindPropPanelEvents` → `src/features/prop-panel/events.js`
- 위 항목은 `main.js`에서의 **call site 위치**만을 가리킨다. "Feeding 연결" 등 앞선 섹션에 같은 이름이 나오면 그 섹션은 `main.js` 내부 정의(또는 호출 흐름)를 가리키며, 이 섹션은 외부 정의 모듈을 가리킨다. 동일 함수가 양쪽에 등장하는 경우(예: `bindFeedingEvents`) 정의는 항상 `src/features/` 하위에 있다.

### `src/main.js` 정리 순서

1. 함수 이동만으로 섹션 순서를 정리한다.
   - imports/constants
   - shared helpers
   - aquarium persistence/model
   - fish model/actions
   - render helpers
   - event binding
   - animation loops
   - app render/init
2. **[1순위 helper 추출]** 이미 여러 파일에 복붙된 `escapeHtml`, `clamp`를 신규 모듈 `src/lib/utils.js`로 이동하고 각 feature 파일에서 import하도록 교체한다. 현재 `src/lib/`은 존재하지 않으므로 이 단계에서 새로 생성한다(프로젝트 컨벤션에 `src/shared/`가 도입되면 그 경로로 정렬한다).
   - 현재 중복 현황:
     - `escapeHtml`: `src/main.js`, `src/features/fish-input/view.js`, `src/features/feeding/view.js`, `src/features/prop-panel/fish-props.js`, `src/features/prop-panel/view.js` (5곳)
     - `clamp`: `src/main.js`, `src/features/fish-input/index.js`, `src/features/feeding/state.js`, `src/features/prop-panel/events.js`, `src/features/fish-movement/` 3개 파일 (7곳)
   - **통합 전 사전 검증**: 각 사본이 동일 시맨틱인지 확인한 뒤에만 통합한다.
     - `clamp`: 모든 구현이 `(value, min, max)` 시그니처와 `Math.min(Math.max(value, min), max)` 동등 동작을 가지는지 비교. NaN/타입 강제 차이가 있으면 통합을 보류하고 차이를 본 스펙에 기록한다.
     - `escapeHtml`: 엔티티 매핑(`&`, `<`, `>`, `"`, `'`/`&#39;`)과 비문자열 입력 처리(빈 문자열 반환 등)가 동일한지 비교한다.
   - 통합 commit은 helper 1개당 분리한다(예: "extract clamp", "extract escapeHtml"). import 경로 변경만 포함하고 동작 변경은 금지.
3. 동작 변경 없이 `getFishSpriteStyleVars(fish)`, `shouldFlipFishForMovement` 같은 pure helper를 추출한다.
   - `getFishSpriteStyleVars(fish)`는 **CSS 변수명을 키로 가지는 plain object**를 반환한다(예: `{ '--fish-x': '10px', '--fish-size': 1.2, ... }`). 단위(`px`, `deg`, unitless)는 helper 내부에서 결정한다. 문자열 직렬화는 호출자(`renderFishes`)가 담당한다. 이 형태가 Vitest에서 키 단위 단언이 가능해 테스트하기 쉽다.
4. `renderFishes`는 helper가 반환한 객체를 순회하여 `style.setProperty` 또는 inline style 문자열로 변환한다. 변환 로직은 별도 작은 helper(`cssVarsToInlineStyle`)로 분리해도 좋다.
5. helper에 대한 Vitest 테스트를 추가한다 (`getFishSpriteStyleVars`, `shouldFlipFishForMovement` 포함).
6. 그 이후에도 파일이 크고 변경 충돌이 반복될 때만 feature 디렉터리 분리를 별도 스펙으로 진행한다.

각 단계(2의 helper별 분리 포함, 3, 4, 5)는 독립 commit으로 나누어 부분 롤백이 가능하도록 한다.

### `src/styles/components.css` 수정 위치 맵

- Aquarium shell and art:
  - `.aquarium-bowl`
  - `.aquarium-art`
  - `.aquarium-ground`
  - `.sand-*`
  - `.sway-plant`
  - `.garden-eel`
- Aquarium layers:
  - `.bubble-layer`
  - `.algae-layer`
  - `.fish-layer`
  - `.food-layer`
  - `.aquarium-empty`
- Feeding UI(S-010 반영):
  - `.feeding-controls`
  - `.food-palette`
  - `.food-palette-item`
  - `.food-pellet`
  - `.food-pellet--flake`
  - `.food-pellet--pellet`
  - `.food-pellet--bloodworm`
  - 종류별 modifier(`--flake`/`--pellet`/`--bloodworm`)는 base `.food-pellet`을 확장하는 형태를 유지한다. asset 경로(`assets/food/*.svg`)는 CSS 분할 시에도 그대로 유지한다.
- Fish rendering:
  - `.fish-sprite`
  - `.fish-sprite.is-selected`
  - `.fish-sprite.is-editing`
  - `.fish-sprite.is-eating`
  - `@keyframes fish-eat`
- Fish list/editor:
  - `.aquarium-status`
  - `.status-list`
  - `.fish-list`
  - `.fish-list-item`
  - `.fish-action-button`
  - `.fish-editor`
- Fish input:
  - `.fish-input-*`
  - `.draw-*`
  - `.preview-*`
  - `.text-input`
  - `.file-input`
  - `.select-input`
- Shared controls:
  - `.button`
  - `.button-primary`
  - `.button-secondary`
- Cleaning:
  - `.clean-*`
  - `.cleaning-*`
  - `@keyframes cleaning-ripple`
  - `@keyframes cleaning-complete-in`
- Prop panel:
  - `.prop-action-panel`
  - `.prop-panel`
  - `.prop-control-*`
  - `.prop-btn-*`
  - `.prop-feed-submenu`
  - `.prop-godmode-*`
- God Mode:
  - `.god-mode-*`

### CSS 정리 순서

1. 파일 분할 전에 섹션 주석과 selector ownership을 명확히 한다.
2. CSS 분할이 필요하면 한 번에 2~3개 파일만 분리한다.
3. 1차 분할 후보(우선순위 순):
   1. `src/styles/components/cleaning.css` — `@keyframes cleaning-ripple`, `cleaning-complete-in`을 포함하고 selector가 `.clean-*`/`.cleaning-*`로 닫혀 있어 외부 의존이 가장 적다. 가장 먼저 분리.
   2. `src/styles/components/fish.css` — `.fish-sprite`, `@keyframes fish-eat`, fish list/editor 일부. transform CSS 변수 의미 유지가 핵심이라 분리 후 즉시 검증 가능.
   3. `src/styles/components/aquarium.css` — `.aquarium-bowl`, layers, decoration. shell/art와 layer가 상호 cascade 의존이 있어 fish 분리 이후로 미룬다.
   4. `src/styles/components/panels.css` — prop panel/God Mode, feeding 컨트롤(`.feeding-controls`, `.food-palette*`)과 food modifier(`.food-pellet--*`)를 함께 포함한다. 가장 많은 selector를 가지고 fish-list/editor와 경계가 모호하므로 마지막.
   - food palette/feeding 컨트롤은 prop-panel feed submenu와 함께 동작하므로 별도 `feeding.css`로 분리하지 않고 `panels.css`에 둔다. 단, `.food-pellet`(base)는 `.food-layer`와 함께 aquarium 레이어 영역으로 두어 layer cascade를 깨지 않는다.
   - 1차 PR에서는 위 1·2번(2개)을 우선 처리하고, 회귀가 없으면 후속 PR에서 3·4번을 진행한다. 한 번에 3개를 묶을 경우에도 4번은 단독 PR로 분리한다.
4. `src/styles/index.css`의 import 순서를 cascade 기준으로 고정한다.
5. 공통 `.button`과 form control 스타일은 중복 분리하지 않고, 실제 재사용 범위가 확인된 뒤 별도 파일로 분리한다.

## 검증 기준

- [ ] `src/main.js` 수정 위치 맵이 문서에 존재한다.
- [ ] `src/styles/components.css` 수정 위치 맵이 문서에 존재한다.
- [ ] `src/main.js` 대규모 분리 없이 함수 섹션 정리 계획이 명확하다.
- [ ] `getFishSpriteStyleVars(fish)` 또는 동등한 pure helper 추출 기준이 정의되어 있다.
- [ ] `getFishSpriteStyleVars(fish)`의 반환 타입(CSS 변수명을 키로 가지는 plain object)이 명시되어 있다.
- [ ] `escapeHtml`, `clamp`가 단일 모듈(`src/lib/utils.js`)에서만 export되며, 모든 호출부가 해당 모듈을 import한다.
- [ ] helper 통합 전 시그니처/동작 동등성 검증 절차가 본 스펙에 명시되어 있다.
- [ ] 정리 순서 단계 2(helper별)·3·4·5는 각각 독립 commit으로 분리한다.
- [ ] fish transform CSS 변수의 기존 의미와 render pipeline이 유지된다.
- [ ] CSS 분할은 한 번에 2~3개 파일 이하로 제한한다는 기준이 명시되어 있다.
- [ ] CSS import 순서와 selector ownership 기준이 명시되어 있다.
- [ ] 구현 시 `npm test`가 통과한다.
- [ ] 구현 시 `npm run build`가 통과한다.
- [ ] UI/CSS 변경 시 실제 dev server URL에서 브라우저 검증을 수행한다.
