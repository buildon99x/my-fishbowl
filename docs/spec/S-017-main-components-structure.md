# S-017 Main and Components Structure

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

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
2. **[1순위 helper 추출]** 이미 여러 파일에 복붙된 `escapeHtml`, `clamp`를 `src/lib/utils.js`로 이동하고 각 feature 파일에서 import하도록 교체한다. 현재 중복 현황:
   - `escapeHtml`: `src/main.js`, `src/features/fish-input/view.js`, `src/features/feeding/view.js`, `src/features/prop-panel/fish-props.js`, `src/features/prop-panel/view.js` (5곳)
   - `clamp`: `src/main.js`, `src/features/fish-input/index.js`, `src/features/feeding/state.js`, `src/features/prop-panel/events.js`, `src/features/fish-movement/` 3개 파일 (7곳)
3. 동작 변경 없이 `getFishSpriteStyleVars(fish)`, `shouldFlipFishForMovement` 같은 pure helper를 추출한다.
4. `renderFishes`는 helper가 만든 CSS 변수 문자열을 사용하도록 정리한다.
5. helper에 대한 Vitest 테스트를 추가한다 (`getFishSpriteStyleVars`, `shouldFlipFishForMovement` 포함).
6. 그 이후에도 파일이 크고 변경 충돌이 반복될 때만 feature 디렉터리 분리를 별도 스펙으로 진행한다.

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
3. 1차 분할 후보:
   - `src/styles/components/aquarium.css`
   - `src/styles/components/fish.css`
   - `src/styles/components/panels.css`
   - `src/styles/components/cleaning.css` — Cleaning 섹션은 `@keyframes`를 포함하고 독립성이 높아 1차 분리에 적합. aquarium/fish/panels와 함께 4개 중 3개 이하로 조합해 진행한다.
4. `src/styles/index.css`의 import 순서를 cascade 기준으로 고정한다.
5. 공통 `.button`과 form control 스타일은 중복 분리하지 않고, 실제 재사용 범위가 확인된 뒤 별도 파일로 분리한다.

## 검증 기준

- [ ] `src/main.js` 수정 위치 맵이 문서에 존재한다.
- [ ] `src/styles/components.css` 수정 위치 맵이 문서에 존재한다.
- [ ] `src/main.js` 대규모 분리 없이 함수 섹션 정리 계획이 명확하다.
- [ ] `getFishSpriteStyleVars(fish)` 또는 동등한 pure helper 추출 기준이 정의되어 있다.
- [ ] fish transform CSS 변수의 기존 의미와 render pipeline이 유지된다.
- [ ] CSS 분할은 한 번에 2~3개 파일 이하로 제한한다는 기준이 명시되어 있다.
- [ ] CSS import 순서와 selector ownership 기준이 명시되어 있다.
- [ ] 구현 시 `npm test`가 통과한다.
- [ ] 구현 시 `npm run build`가 통과한다.
- [ ] UI/CSS 변경 시 실제 dev server URL에서 브라우저 검증을 수행한다.
