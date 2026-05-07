# 스펙 명령 패턴

`Claude.md`에서 분리한 스펙 작성/검토/구현/완료 기록 명령 패턴과 작업 전 체크리스트를 모은다.
이 문서는 Claude가 같은 작업 흐름을 반복 가능하게 따르도록 단일 출처(single source) 역할을 한다.

## 작업 전 공통 확인

각 명령 패턴을 실행하기 전에 아래 항목을 먼저 확인한다.

- `SPEC.md`에서 현재 작업 ID와 상태(`ready` 여부)를 확인한다.
- `ARCHITECTURE.md`에서 디렉터리 규칙과 분리 기준을 확인한다.
- 작업 내용과 관련된 `docs/learn/*.md` 기록을 훑어 같은 실수를 반복하지 않는다.
  - UI 진입점 변경 → `docs/learn/2026-05-06-bottom-button-panel-mistakes.md`
  - dev server URL/포트 → `docs/learn/2026-05-06-dev-server-port-confusion.md`
  - 애니메이션 루프, 상태 충돌, surgical patch → `docs/learn/2026-05-06-feeding-animation-and-action-cluster-mistakes.md`
  - 린트/cleanup 분리 실수 → `docs/learn/2026-05-07-lint-cleanup-gap.md`

## 명령 패턴

### 1. 새 스펙 조각 작성

```text
다음 요구사항을 바탕으로 새 스펙 조각을 설계한다.
- `SPEC.md`에 새 ID와 상세 문서 경로를 추가한다.
- `docs/spec/_template.md`를 기준으로 `docs/spec/<ID>-<short-title>.md`를 만든다.
- 상태는 `draft`, 구현 여부는 `not-started`, 검증 여부는 `not-tested`로 둔다.
- 목표, 범위, 사용자 흐름, UI/상태 요구사항, 구현 메모, 검증 기준을 작성한다.
- 구현 파일은 수정하지 않는다.
```

### 2. 스펙 검토

```text
현재 스펙 상세 문서를 검토한다.
- 모호한 요구사항
- 구현 범위가 큰 항목
- 빠진 검증 기준
- 별도 스펙 조각으로 나눠야 할 항목
을 찾아 제안한다.
- 구현 파일은 수정하지 않는다.
```

### 3. 스펙 구현

```text
`SPEC.md`의 현재 작업 ID를 확인하고 해당 `docs/spec/*.md` 상세 문서를 읽는다.
- 상세 스펙이 `ready` 상태일 때만 구현한다.
- 구현 전 `ARCHITECTURE.md`와 관련 `docs/learn/*.md`를 확인한다.
- 코드 수정 위치는 본 문서의 "코드 수정 위치 맵"을 우선 참조한다.
- 구현 후 상세 스펙의 검증 기준을 기준으로 테스트한다.
- 브라우저 검증이 필요한 경우 본 문서의 "dev server URL 확인 체크리스트"를 따른다.
- UI 진입점이 바뀌는 경우 본 문서의 "UI 진입점 변경 체크리스트"를 따른다.
- 푸시 전에 `npm run cleanup`(lint + knip + depcheck)을 통과시킨다. `pre-push` 훅이 같은 검사를 자동으로 실행한다.
- 검증 결과를 스펙 문서나 완료 기록에 반영한다.
```

### 4. 스펙 완료 기록

```text
구현과 검증이 끝난 스펙 조각을 마무리한다.
- 상세 문서의 상태/구현 여부/검증 여부를 갱신한다.
- `SPEC.md` 표의 상태/구현 여부/검증 여부를 갱신한다.
- `SPEC.md`의 "완료 기록" 표에 ID, 완료 내용, 검증 결과를 한 줄로 추가한다.
- 구현 중 새로 발견한 실행착오가 있으면 `docs/learn/<YYYY-MM-DD>-<topic>.md`로 기록한다.
  - `docs/learn/_template.md`를 기준으로 작성한다.
```

## dev server URL 확인 체크리스트

브라우저 검증 전에 반드시 다음 순서로 확인한다.
이미 열려 있는 브라우저 탭의 URL을 그대로 신뢰하지 않는다.

1. 현재 worktree에서 `npm run dev`로 직접 띄운 Vite 서버의 stdout 마지막 URL을 확인한다.
2. Vite가 포트 충돌로 다음 포트(`5174`, `5175` 등)로 자동 이동했는지 확인한다.
3. 브라우저 in-app browser/탭의 URL이 1번에서 확인한 URL과 정확히 일치하는지 확인한다.
4. 같은 포트 범위에 여러 dev server가 떠 있을 수 있다면 현재 worktree에만 존재하는 코드 fingerprint(예: 새로 추가한 셀렉터, 문자열)를 응답 HTML/소스에서 찾아 매칭한다.
5. 위 4단계 중 하나라도 어긋나면 "화면에 반영됐다"고 단정하지 않는다. 올바른 URL을 사용자에게 명시한 뒤 다시 확인한다.

## UI 진입점 변경 체크리스트

새 버튼/패널/메뉴 등으로 기존 기능의 진입점을 바꿀 때 반드시 다음을 확인한다.

- [ ] 새 진입점이 동작한다.
- [ ] **기존 진입점을 함께 제거**했다. (추가와 제거는 항상 쌍으로 검토한다.)
- [ ] 같은 동작을 트리거하는 중복 컨트롤이 화면에 남아 있지 않다.
- [ ] 새 진입점이 기존 도메인 상태(예: `cleaningMode`, `editingTarget`)를 그대로 받는다. 같은 이름의 별도 상태를 새로 만들지 않는다.
- [ ] 상태 전환(예: feed 서브메뉴 펼침, 패널 열림/닫힘) 중 다른 컨트롤의 위치가 시각적으로 이동하지 않는다.
  - 가변 폭 자식이 있는 flex 컨테이너는 `align-items: center` 대신 `flex-start`/`flex-end`를 사용해 한쪽 끝 기준 정렬을 유지한다.
- [ ] 진입점이 surgical patch 또는 부분 갱신을 사용하는 경우, 같은 mutation을 일으키는 다른 진입점(클릭, 드래그, 키보드 등)도 같은 갱신 모델을 따르는지 일괄 점검했다.

## 코드 수정 위치 맵

Claude가 자주 수정하는 영역의 진입 함수/파일을 모은다.
구조가 바뀌면 이 맵을 함께 갱신한다.

### 어항 모델과 영속화

- 신규 어항 객체와 정규화: `src/features/aquarium/model.js` (`createAquarium`, `normalizeAquarium`, `DEFAULT_BOUNDS`)
- localStorage 로드/저장: `src/features/aquarium/storage.js` (`loadAquarium`, `saveAquarium`, `STORAGE_KEY`)
- 물고기 CRUD: `src/features/aquarium/fish-actions.js` (`createFishFromDraft`, `addFishToAquarium`, `deleteFishFromAquarium`, `toggleFishHidden`, `updateFishAppearance`, `getFishById`)
- 어항 장식 SVG: `src/features/aquarium/decoration.js` (`renderDecoration`)

### 물고기 표시 / transform

- 물고기 sprite 렌더: `src/main.js`의 `renderFishes`, `patchFishPositions`
- CSS 변수 helper: `src/lib/fishSpriteStyle.js` (`getFishSpriteStyleVars`, `cssVarsToInlineStyle`)
- 물고기 sprite 스타일: `src/styles/components/fish.css` (`.fish-sprite`, `@keyframes fish-eat`)
- 자율 움직임 시뮬레이션: `src/features/fish-movement/`
- 편집 모드 드래그-이동: `src/features/fish-edit/drag.js` (`bindFishSpriteDrag`)

### 물고기 목록 / 편집

- 목록과 어항 상태 패널 view: `src/features/fish-list/view.js` (`renderFishList`, `renderAquariumStatus`, `formatRegisteredTime`)
- 목록 이벤트(접기/선택/숨기기/편집/삭제): `src/features/fish-list/events.js` (`bindFishListEvents`)
- 목록 스크롤 보존: `src/features/fish-list/scroll.js` (`captureFishListScroll`, `restoreFishListScroll`)
- 목록/편집 스타일: `src/styles/components.css` (`.aquarium-status`, `.status-list`, `.fish-list*`, `.fish-action-button`, `.fish-editor`)

### 물고기 입력 (등록 패널)

- view와 이벤트: `src/features/fish-input/`
- 스타일: `src/styles/components.css` (`.fish-input-*`, `.draw-*`, `.preview-*`)

### 청소

- 진행률/오버레이 view: `src/features/cleaning/view.js` (`renderCleaningProgressBar`, `renderCleaningOverlay`)
- 상태/계산/이벤트: `src/features/cleaning/index.js` (`createCleaningState`, `applyBrush`, `clearAlgaeCanvas`, `snapshotCanvas`, `bindCleaningEvents`, `exitCleaningMode`)
- 스타일과 keyframes: `src/styles/components/cleaning.css` (`.clean-*`, `.cleaning-*`, `@keyframes cleaning-ripple`/`cleaning-complete-in`)

### 먹이

- 상태 전이 / 물리 / 효과: `src/features/feeding/state.js`, `foodPhysics.js`, `foodEffects.js`, `foodConfig.js`
- view: `src/features/feeding/view.js` (`renderFoods`)
- 이벤트와 진입점: `src/features/feeding/index.js` (`bindFeedingEvents`)
- main.js 측 연결: `startFeedingAnimation`, `patchFoodLayer`
- food 베이스 스타일: `src/styles/components/aquarium.css` (`.food-pellet`, `.food-layer`)
- food 종류별 modifier: `src/styles/components/panels.css` (`.food-pellet--flake/--pellet/--bloodworm`)

### 이끼

- 상태/계산: `src/features/algae/state.js`
- 캔버스 view: `src/features/algae/view.js`
- 진입점: `src/features/algae/index.js` (`drawAlgaeLayer`, `restoreAlgaeState`, `ALGAE_MAX_LEVEL`, `getAlgaeStateName`)

### 거품

- 상태와 진입점: `src/features/bubbles/`

### Prop Panel / God Mode / Action Cluster

- 컴포넌트와 이벤트: `src/features/prop-panel/`
- 스타일: `src/styles/components/panels.css` (`.prop-action-panel`, `.prop-panel`, `.prop-control-*`, `.prop-btn-*`, `.prop-feed-submenu`, `.prop-godmode-*`, `.god-mode-*`)

### 어항 시각 레이어와 장식 스타일

- 셸/그라운드/플랜트/장어/물 레이어: `src/styles/components/aquarium.css` (`.aquarium-bowl`, `.aquarium-art`, `.aquarium-ground`, `.sand-*`, `.sway-plant`, `.garden-eel`, `.bubble-layer`, `.algae-layer`, `.fish-layer`, `.food-layer`, `.aquarium-empty`, `@keyframes aquatic-sway`/`eel-sway`)

### 공용 유틸 / 공통 컨트롤

- 문자열·수치 helper: `src/lib/utils.js` (`escapeHtml`, `clamp`)
- 공용 버튼/입력 스타일: `src/styles/components.css` (`.button`, `.button-primary`, `.button-secondary`, `.text-input`, `.file-input`, `.select-input`)

### main.js 잔여 책임

- 앱 초기화와 화면 조립: `initApp`, `renderApp`
- 물고기 렌더 helper: `renderFishes`, `patchFishPositions`, `renderEmptyState`
- feeding 애니메이션 / food 레이어 패치: `startFeedingAnimation`, `patchFoodLayer`
- 빈 상태 메시지: `renderEmptyState`
- 외부 모듈을 import해 wiring하는 역할 위주(직접 정의된 도메인 로직 없음).
