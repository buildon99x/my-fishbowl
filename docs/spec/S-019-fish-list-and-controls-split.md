# S-019 Fish List and Aquarium Controls Split

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- `src/main.js`에 남아 있는 fish-list/aquarium-status view와 `bindAquariumControls`를 책임 단위로 분해해 features 디렉터리로 이동한다.
- view ↔ event binding ↔ aquarium model 사이의 결합을 끊고, 각 모듈이 자기 DOM 계약만 책임지도록 한다.
- S-017의 단계 6("feature 디렉터리 대규모 분리")의 후속이며, S-017과 동일하게 단계별 독립 commit으로 분할한다.

## 범위

- 포함:
  - aquarium 모델/영속화/fish CRUD를 책임별 3분할로 features/aquarium 하위에 이동:
    - `storage.js` ← `STORAGE_KEY`, `loadAquarium`, `saveAquarium`
    - `model.js` ← `DEFAULT_BOUNDS`, `createAquarium`, `normalizeAquarium`
    - `fish-actions.js` ← `createFishFromDraft`, `addFishToAquarium`, `deleteFishFromAquarium`, `toggleFishHidden`, `updateFishAppearance`, `getFishById`
  - `renderFishList`, `renderAquariumStatus`, `formatRegisteredTime`을 신규 feature 모듈로 이동.
  - `bindAquariumControls`를 책임별로 분해:
    1. fish-list/collapse 관련 이벤트(`data-toggle-fish-list`, `data-select-fish`, `data-toggle-fish-hidden`, `data-edit-fish`, `data-delete-fish`)
    2. fish-sprite 드래그-이동 이벤트(`data-fish-sprite` pointer drag while editing)
  - 분리 후 main.js의 호출부를 import + 얇은 wiring만 남긴다.
  - 변경 없는 동작을 보장하기 위한 회귀 테스트 항목 정의.
- 제외:
  - 새로운 UI 요소나 상호작용 추가.
  - localStorage 저장 형식 변경.
  - prop-panel, feeding, cleaning, bubbles, algae feature 모듈 수정.
  - CSS 분할(이미 S-017에서 처리됨).
  - fish-sprite 렌더 helper(`getFishSpriteStyleVars`, `cssVarsToInlineStyle`) 변경.

## 사용자 흐름

1. 사용자는 기존과 동일하게 어항 화면에서 물고기 목록 패널을 펼치고 접을 수 있다.
2. 목록의 각 항목에서 선택/편집/숨기기/삭제 버튼이 동일하게 동작한다.
3. 편집 모드에서 fish-sprite를 드래그해 위치를 옮기면 좌표가 즉시 반영되고 저장된다.
4. 어항 상태(청결도, 물고기 수, 이끼 단계)가 동일한 형식으로 표시된다.
5. 페이지 새로고침 후 접힘 상태(`isFishListCollapsed`)와 스크롤 위치(`fishListScrollTop`)가 유지된다.

## UI/상태 요구사항

- 필요한 화면 요소: 새 요소 없음. 기존 `aquarium-status`, `fish-list`, `fish-list-item`, `fish-action-button`, `fish-action-danger`의 DOM 구조와 클래스명을 그대로 유지한다.
- 필요한 상태:
  - `appState.isFishListCollapsed`, `appState.fishListScrollTop`, `appState.selectedFishId`, `appState.propPanel.editingTarget`의 의미와 위치를 유지.
  - aquarium 모델 필드(`fishes`, `cleanliness`, `algaeLevel`)의 의미를 유지.
- 오류/빈 상태:
  - 물고기 0마리일 때 기존 빈 상태 문구(`등록된 물고기가 없습니다.`)를 그대로 노출한다.
  - 편집 대상이 없을 때 fish-sprite 드래그 이벤트가 발동하지 않아야 한다.

## 구현 메모

### 현재 위치 맵 (분리 전)

- `src/main.js`
  - `renderFishList` (list view)
  - `renderAquariumStatus` (status + list wrapper)
  - `formatRegisteredTime` (list view 전용)
  - `captureFishListScroll`, `restoreFishListScroll` (스크롤 보존)
  - `bindAquariumControls` (혼합: collapse + list 액션 + fish-sprite 드래그)
  - `toggleFishHidden`, `deleteFishFromAquarium`, `updateFishAppearance`, `getFishById`, `addFishToAquarium`, `createFishFromDraft` (fish 모델)
  - `createAquarium`, `normalizeAquarium`, `loadAquarium`, `saveAquarium` (aquarium persistence)

### 목표 디렉터리 구조

```
src/features/
  aquarium/
    decoration.js          # 이미 분리됨(S-017 후속)
    storage.js             # 신규: STORAGE_KEY, loadAquarium, saveAquarium
    model.js               # 신규: DEFAULT_BOUNDS, createAquarium, normalizeAquarium
    fish-actions.js        # 신규: createFishFromDraft, addFishToAquarium,
                           #       deleteFishFromAquarium, toggleFishHidden,
                           #       updateFishAppearance, getFishById
    model.test.js
    fish-actions.test.js
  fish-list/
    view.js                # renderFishList, renderAquariumStatus, formatRegisteredTime
    events.js              # bindFishListEvents (collapse + list 액션)
    scroll.js              # captureFishListScroll, restoreFishListScroll
    index.js               # 외부 진입점
  fish-edit/
    drag.js                # bindFishSpriteDrag (편집 중 드래그-이동)
    index.js
```

- aquarium 모델은 단일 `model.js` 대신 책임별 3분할(옵션 B)을 채택한다.
  - `storage.js`: localStorage I/O만 책임. `STORAGE_KEY`, `loadAquarium`, `saveAquarium`.
  - `model.js`: aquarium 객체의 모양/기본값/정규화. `DEFAULT_BOUNDS`, `createAquarium`, `normalizeAquarium`.
  - `fish-actions.js`: aquarium에 작용하는 fish CRUD. `saveAquarium`을 직접 import해 영속화한다.
- `src/features/fish-edit/`는 기존 `fish-movement`(자율 움직임)와 책임이 다르므로 별도 디렉터리로 둔다. 추후 합칠 수 있음을 본 스펙 메모에만 남긴다.
- `fish-actions.js`로 묶는 이유: 6개 함수가 모두 aquarium을 인자로 받고 mutation 후 `saveAquarium`을 호출하는 동일 패턴이며 한 호출 사이클에서 함께 변경되는 경우가 많다. fish 도메인 디렉터리(`features/fish/model.js`)로 빼는 옵션은 보류한다.

### 분리 순서 (각각 독립 commit)

1. **aquarium storage 분리** (가장 선행)
   - `STORAGE_KEY`, `loadAquarium`, `saveAquarium`을 `src/features/aquarium/storage.js`로 이동.
   - `loadAquarium`은 `normalizeAquarium`을 호출하므로 단계 1-b 후에 import 경로를 갱신해도 되고, 본 단계에서 `normalizeAquarium`을 함께 옮겨도 된다. 본 스펙은 1-a → 1-b 순서로 분리.
   - 동작 변경 금지. main.js는 import만 한다.

   1-b. **aquarium model 분리**
   - `DEFAULT_BOUNDS`, `createAquarium`, `normalizeAquarium`을 `src/features/aquarium/model.js`로 이동.
   - `normalizeAquarium`의 인라인 behavior 상태 enum은 본 단계에서 그대로 유지(별도 commit으로 정리).
   - 단위 테스트 신규 작성: `normalizeAquarium`이 누락 필드를 채우는지, `bounds` 병합이 정상인지, `createAquarium`의 기본값이 일치하는지.

   1-c. **fish-actions 분리**
   - `createFishFromDraft`, `addFishToAquarium`, `deleteFishFromAquarium`, `toggleFishHidden`, `updateFishAppearance`, `getFishById`를 `src/features/aquarium/fish-actions.js`로 이동.
   - `saveAquarium`은 storage에서, fish 초기 상태는 본 모듈에서 직접 import.
   - 단위 테스트: `addFishToAquarium`/`deleteFishFromAquarium`이 `updatedAt`을 갱신하는지, `toggleFishHidden`이 hidden을 토글하는지, `updateFishAppearance`가 patch만 적용하는지, `getFishById`가 missing id에 대해 undefined를 반환하는지.
2. **fish-list view 분리**
   - `renderFishList`, `renderAquariumStatus`, `formatRegisteredTime`을 `src/features/fish-list/view.js`로 이동.
   - `escapeHtml`은 `src/lib/utils.js`에서 import. `ALGAE_MAX_LEVEL`/`getAlgaeStateName`은 `features/algae`에서 import.
   - DOM 출력 결과의 스냅샷 테스트(빈 상태, 1마리, 편집 중)를 추가한다.
3. **fish-list scroll 분리**
   - `captureFishListScroll`, `restoreFishListScroll`을 `src/features/fish-list/scroll.js`로 이동.
   - 동작 변경 금지.
4. **bindAquariumControls 분해 — fish-sprite 드래그 추출**
   - 기존 `bindAquariumControls`의 `data-fish-sprite` pointer 핸들러 블록을 `src/features/fish-edit/drag.js`의 `bindFishSpriteDrag(root, aquarium, appState, { render })`로 이동.
   - 콜백 시그니처: `bindFishSpriteDrag`는 aquarium 모델 함수(`getFishById`, `updateFishAppearance`)와 `clamp`를 직접 import한다. 호출자는 `root`, `aquarium`, `appState`, `{ render }`만 전달.
   - 편집 대상이 아닐 때(early return) 동작이 동일한지 확인하는 회귀 테스트.
5. **bindAquariumControls 분해 — fish-list 이벤트 추출**
   - 잔여 핸들러(`data-toggle-fish-list`, `data-select-fish`, `data-toggle-fish-hidden`, `data-edit-fish`, `data-delete-fish`)를 `src/features/fish-list/events.js`의 `bindFishListEvents(root, aquarium, appState, { render })`로 이동.
   - 모델 의존성은 `features/aquarium/fish-actions.js`에서 import.
6. **main.js 정리**
   - `bindAquariumControls`는 단계 4·5 완료 후 단순 위임 함수가 되거나 삭제한다. main.js는 두 bind 함수를 직접 호출하는 형태로 정리.
   - main.js에서 더 이상 사용되지 않는 helper(`formatRegisteredTime` 등) import가 없는지 확인.
7. **(선택) prop-panel `saveAquarium` 콜백 인자 제거**
   - `bindPropPanelEvents`, `bindFishPropsEvents`, `bindGodModePropsEvents`의 5번째 인자(`saveAquarium`)를 제거하고 `features/aquarium/storage.js`에서 직접 import한다.
   - 호출부 5곳 변경. 단계 1-a 이후 어느 시점이든 가능하지만 본 스펙에서는 마지막 정리 commit으로 둔다.
8. **(선택) `normalizeAquarium`의 behavior 상태 enum 통합**
   - 인라인 `['cruising', 'idle', 'dart', 'wander', 'turning']`을 `features/fish-movement/fishBehavior.js`의 `BEHAVIOR_STATUSES` import로 교체.

각 단계는 독립 commit으로 분리해 부분 롤백을 허용한다. 단계 1(a/b/c) → 2 → 3 → 4 → 5 → 6 순서로 진행하며, 단계 7·8은 옵션이며 후속 PR로 미뤄도 무방하다.

### bindFishSpriteDrag 책임 경계

- 입력: `appState.propPanel.editingTarget`이 `{ type: 'fish', id }`인 경우에만 드래그 시작.
- 출력: `fish.x`, `fish.y` 직접 갱신 + 종료 시 `updateFishAppearance`로 영속화 + `render()` 호출.
- 미포함: 자율 움직임(`fish-movement`), 선택/편집 토글(이는 `fish-list/events.js`에 남김).
- 미래 합병 후보: 기존 `features/fish-movement`로 합치는 옵션은 본 스펙에 결정하지 않음. fish-movement는 시뮬레이션 책임, fish-edit는 사용자 입력 책임이므로 현재는 분리 유지.

### DOM 계약 정리

- `data-fish-list` (fish-list/events.js의 querySelector 대상)
- `data-toggle-fish-list` (fish-list/events.js)
- `data-select-fish`, `data-toggle-fish-hidden`, `data-edit-fish`, `data-delete-fish` (fish-list/view.js 발행 → fish-list/events.js 소비)
- `data-fish-sprite` (fish 렌더 view 발행 → fish-edit/drag.js 소비)
- `data-fish-layer` (메인 어항 컨테이너 — drag bounds 계산용)

각 모듈은 자신이 발행하지 않는 DOM 계약을 직접 querySelector로 잡지 않도록 한다(예: fish-edit/drag.js는 `data-fish-list`를 참조하지 않는다).

## 검증 기준

- [ ] `src/features/aquarium/storage.js`에 `STORAGE_KEY`, `loadAquarium`, `saveAquarium`이 모인다.
- [ ] `src/features/aquarium/model.js`에 `DEFAULT_BOUNDS`, `createAquarium`, `normalizeAquarium`이 모인다.
- [ ] `src/features/aquarium/fish-actions.js`에 fish CRUD 6개 함수가 모이고, 영속화는 `storage.saveAquarium`을 import해 호출한다.
- [ ] `src/features/fish-list/view.js`에 `renderFishList`, `renderAquariumStatus`, `formatRegisteredTime`이 모인다.
- [ ] `src/features/fish-list/events.js`에 collapse + list 액션 핸들러가 모이고, fish-sprite 드래그 핸들러는 포함되지 않는다.
- [ ] `src/features/fish-edit/drag.js`가 fish-sprite 드래그-이동 책임을 단독으로 가진다.
- [ ] main.js가 위 모듈을 import만 하고 동일 책임의 함수 정의를 가지지 않는다.
- [ ] aquarium 모듈 함수에 대한 Vitest 단위 테스트가 추가된다(`normalizeAquarium`, `toggleFishHidden`, `addFishToAquarium`, `deleteFishFromAquarium`, `updateFishAppearance`, `getFishById` 최소 1건씩).
- [ ] 분리 단계 1-a·1-b·1-c·2·3·4·5·6은 각각 독립 commit으로 분리된다(단계 7·8은 옵션).
- [ ] 빈 상태/1마리/편집 중 fish-list 렌더 결과의 DOM 구조가 분리 전과 동일하다(스냅샷 또는 문자열 동등성).
- [ ] 편집 모드 진입 후 fish-sprite 드래그가 좌표를 갱신하고 저장한다.
- [ ] 페이지 새로고침 후 접힘 상태와 스크롤 위치가 보존된다.
- [ ] `npm test`가 통과한다.
- [ ] `npm run build`가 통과한다.
- [ ] UI/CSS 변경 없음을 실제 dev server URL에서 브라우저 검증한다.
