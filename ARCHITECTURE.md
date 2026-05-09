# Architecture

이 문서는 My Fishbowl 프로젝트의 현재 디렉터리 구조, 파일 책임, 기능 분리 기준, 레이어 규칙을 정의한다.

## 현재 디렉터리 구조

```text
.
├── README.md
├── AGENTS.md
├── Claude.md
├── ARCHITECTURE.md
├── SPEC.md
├── DESIGN.md
├── docs/
│   ├── spec-command-patterns.md
│   ├── kb/
│   │   ├── README.md
│   │   ├── adr/
│   │   │   ├── _template.md
│   │   │   └── ADR-*.md
│   │   ├── lrn/
│   │   │   ├── _template.md
│   │   │   └── LRN-*.md
│   │   └── harness-improvements/
│   │       ├── _template.md
│   │       └── HIP-*.md
│   └── spec/
│       ├── _template.md
│       └── S-*-*.md
├── index.html
├── package.json
├── package-lock.json
└── src/
    ├── main.js
    ├── features/
    │   ├── algae/
    │   │   ├── index.js
    │   │   ├── state.js
    │   │   ├── state.test.js
    │   │   ├── view.js
    │   │   └── view.test.js
    │   ├── aquarium/
    │   │   ├── decoration.js
    │   │   ├── fish-actions.js
    │   │   ├── fish-actions.test.js
    │   │   ├── model.js
    │   │   ├── model.test.js
    │   │   └── storage.js
    │   ├── bubbles/
    │   │   ├── index.js
    │   │   ├── state.js
    │   │   └── state.test.js
    │   ├── cleaning/
    │   │   ├── index.js
    │   │   ├── index.test.js
    │   │   └── view.js
    │   ├── feeding/
    │   │   ├── foodConfig.js
    │   │   ├── foodEffects.js
    │   │   ├── foodPhysics.js
    │   │   ├── index.js
    │   │   ├── state.js
    │   │   ├── state.test.js
    │   │   └── view.js
    │   ├── fish-edit/
    │   │   └── drag.js
    │   ├── fish-input/
    │   │   ├── index.js
    │   │   ├── state.js
    │   │   ├── state.test.js
    │   │   └── view.js
    │   ├── fish-list/
    │   │   ├── events.js
    │   │   ├── scroll.js
    │   │   ├── view.js
    │   │   └── view.test.js
    │   ├── fish-movement/
    │   │   ├── fishBehavior.js
    │   │   ├── fishPhysics.js
    │   │   ├── index.js
    │   │   ├── mouseInteraction.js
    │   │   ├── state.js
    │   │   └── state.test.js
    │   └── prop-panel/
    │       ├── events.js
    │       ├── fish-props.js
    │       ├── godmode-props.dev.js
    │       ├── index.js
    │       ├── state.js
    │       └── view.js
    ├── lib/
    │   ├── fishSpriteStyle.js
    │   ├── fishSpriteStyle.test.js
    │   ├── utils.js
    │   └── utils.test.js
    └── styles/
        ├── base.css
        ├── components/
        │   ├── aquarium.css
        │   ├── cleaning.css
        │   ├── fish.css
        │   └── panels.css
        ├── components.css
        ├── index.css
        ├── layout.css
        ├── tokens.css
        └── utilities.css
```

## 파일 책임

### 문서 지식 베이스

- `docs/kb/README.md`: ADR/LRN/HIP 지식 저장소의 역할과 `docs/learn`와의 관계를 설명한다.
- `docs/kb/adr/_template.md`: architecture/workflow decision record 템플릿.
- `docs/kb/lrn/_template.md`: failure learning과 prevention rule 기록 템플릿.
- `docs/kb/harness-improvements/_template.md`: 반복 ADR/LRN 패턴에서 도출한 하네스 개선 계획 템플릿.
- `.claude/skills/extract_knowledge/SKILL.md`: Claude와 Codex가 함께 읽을 수 있는 ADR/LRN 추출 절차.
- `.claude/commands/extract_knowledge.md`: Claude Code에서 `/extract_knowledge`로 skill을 호출하는 slash command 진입점.

### 진입점

- `index.html`: Vite 애플리케이션의 HTML 진입점. `#app` 마운트 노드만 유지하고 화면 로직은 `src/main.js`에서 관리한다.
- `src/main.js`: feature 모듈을 import해 화면을 조립하고 wiring한다. 도메인 로직은 직접 정의하지 않고 feature 모듈에서 가져온다.
  - `initApp`, `renderApp`: 앱 초기화와 전체 리렌더링.
  - `renderFishes`, `patchFishPositions`, `renderEmptyState`: 물고기 sprite와 빈 상태 렌더 helper.
  - `startFeedingAnimation`, `patchFoodLayer`: 먹이 애니메이션 루프와 food 레이어 surgical patch.

### 공용 라이브러리

- `src/lib/utils.js`: 프로젝트 전역에서 쓰는 작은 helper(`escapeHtml`, `clamp`). 모든 feature가 이곳에서 import한다.
- `src/lib/fishSpriteStyle.js`: 물고기 sprite의 CSS 변수 맵을 만드는 순수 helper(`getFishSpriteStyleVars`, `cssVarsToInlineStyle`).

### 어항 모델 / 영속화 / 장식

- `src/features/aquarium/model.js`: `DEFAULT_BOUNDS`, `createAquarium`, `normalizeAquarium`. 어항 객체의 모양과 기본값, 저장 데이터 보정을 담당한다.
- `src/features/aquarium/storage.js`: `STORAGE_KEY`, `loadAquarium`, `saveAquarium`. localStorage I/O와 로드 시 정규화를 담당한다.
- `src/features/aquarium/fish-actions.js`: 물고기 CRUD(`createFishFromDraft`, `addFishToAquarium`, `deleteFishFromAquarium`, `toggleFishHidden`, `updateFishAppearance`, `getFishById`). mutation 후 `saveAquarium`을 직접 호출해 영속화한다.
- `src/features/aquarium/decoration.js`: `renderDecoration`. 정적 어항 SVG 문자열을 반환하는 순수 함수.

### 물고기 목록 / 어항 상태 패널

- `src/features/fish-list/view.js`: `renderFishList`, `renderAquariumStatus`, `formatRegisteredTime`. 목록과 어항 상태 패널 view.
- `src/features/fish-list/events.js`: `bindFishListEvents`. 목록 접기/선택/숨기기/편집/삭제 이벤트를 묶는다.
- `src/features/fish-list/scroll.js`: `captureFishListScroll`, `restoreFishListScroll`. 리렌더 사이의 스크롤 위치 보존.

### 물고기 편집

- `src/features/fish-edit/drag.js`: `bindFishSpriteDrag`. 편집 모드에서 fish-sprite를 드래그해 위치를 옮기고 영속화한다.

### 물고기 입력 (등록)

- `src/features/fish-input/state.js`: 드래프트, 입력 패널 위치, 그리기 상태 등 순수 상태.
- `src/features/fish-input/view.js`: 입력 패널 HTML 생성.
- `src/features/fish-input/index.js`: 이벤트 바인딩과 외부 진입점.

### 물고기 자율 움직임

- `src/features/fish-movement/state.js`: 이동 상태 정규화, 프레임 단위 이동, 헤드 방향 계산, `shouldFlipFishForMovement`.
- `src/features/fish-movement/fishPhysics.js`, `fishBehavior.js`: 물리/행동 결정 로직.
- `src/features/fish-movement/mouseInteraction.js`: 마우스 회피 입력.
- `src/features/fish-movement/index.js`: 진입점, `normalizeAquariumFishMovement`, `startFishMovement`.

### 먹이

- `src/features/feeding/foodConfig.js`: 종류별 설정과 asset 경로.
- `src/features/feeding/foodPhysics.js`: 낙하/소멸 물리.
- `src/features/feeding/foodEffects.js`: 먹이 효과(배고픔 감소 등).
- `src/features/feeding/state.js`: feeding 상태 전이와 `tickFeeding`.
- `src/features/feeding/view.js`: 먹이 DOM 생성(`renderFoods`).
- `src/features/feeding/index.js`: 이벤트 바인딩과 진입점.

### 이끼

- `src/features/algae/state.js`: 시간 기반 이끼 레벨/청결도/상태명 계산, God Mode용 시간 역산.
- `src/features/algae/view.js`: Canvas 기반 이끼 렌더링.
- `src/features/algae/index.js`: 진입점(`drawAlgaeLayer`, `restoreAlgaeState`, `ALGAE_MAX_LEVEL`, `getAlgaeStateName`).

### 청소

- `src/features/cleaning/index.js`: 상태 생성, Canvas 스냅샷, 브러시 적용, 진행률 계산, `bindCleaningEvents`, `exitCleaningMode`.
- `src/features/cleaning/view.js`: `renderCleaningProgressBar`, `renderCleaningOverlay`.

### 거품

- `src/features/bubbles/`: 거품 상태와 SVG 진입점.

### Prop Panel / God Mode / Action Cluster

- `src/features/prop-panel/view.js`: 패널과 액션 클러스터 view, `renderPropPanel`, `renderActionCluster`.
- `src/features/prop-panel/fish-props.js`: 물고기 속성 컨트롤.
- `src/features/prop-panel/godmode-props.dev.js`: 개발 환경 전용 God Mode 속성 컨트롤.
- `src/features/prop-panel/events.js`: 패널 이벤트 바인딩.
- `src/features/prop-panel/state.js`: 패널 위치 등 영속 상태.
- `src/features/prop-panel/index.js`: 진입점과 `bindActionClusterEvents`, `bindPropPanelEvents`.

### 스타일

- `src/styles/index.css`: 스타일 진입점. 역할별 CSS만 import.
- `src/styles/tokens.css`: 디자인 토큰(색/간격/타이포 등).
- `src/styles/base.css`: 리셋과 typography 기본값.
- `src/styles/layout.css`: 페이지 단위 배치.
- `src/styles/components.css`: 분리되지 않은 컴포넌트 스타일(목록/편집, 입력, 공용 버튼/폼 컨트롤, fish-input 관련 미디어쿼리 등).
- `src/styles/components/aquarium.css`: 어항 셸/아트/ground/sand/sway-plant/garden-eel과 layer 셀렉터(`.bubble-layer`, `.algae-layer`, `.fish-layer`, `.food-layer`, `.aquarium-empty`), `.food-pellet` base.
- `src/styles/components/fish.css`: `.fish-sprite` 변종과 `@keyframes fish-eat`.
- `src/styles/components/cleaning.css`: 청소 UI(`.clean-*`, `.cleaning-*`)와 keyframes.
- `src/styles/components/panels.css`: prop panel, action cluster, food modifier(`.food-pellet--*`), God Mode.
- `src/styles/utilities.css`: 작은 재사용 유틸리티.

CSS import 순서는 `tokens → base → layout → components → components/aquarium → components/fish → components/cleaning → components/panels → utilities`로 고정한다(cascade 기준).

## 기능 모듈 경계

- 시간 기반 이끼 계산은 `features/algae/state.js`에 둔다.
- 이끼 Canvas 렌더링은 `features/algae/view.js`에 둔다.
- 청소 입력과 진행률 계산은 `features/cleaning/index.js`에 둔다.
- 청소 view는 `features/cleaning/view.js`에 둔다.
- 어항 영속화(`load`/`save`)는 `features/aquarium/storage.js`에만 둔다. 다른 feature는 import로만 사용한다.
- 어항 객체 모양(`createAquarium`, `normalizeAquarium`)은 `features/aquarium/model.js`에 둔다.
- 물고기 CRUD는 `features/aquarium/fish-actions.js`에만 두고, 호출자는 `saveAquarium`을 직접 주입하지 않는다(모듈 내부에서 호출).
- 물고기 자율 시뮬레이션은 `features/fish-movement/`에, 사용자 드래그-이동은 `features/fish-edit/`에 둔다(시뮬레이션과 사용자 입력 책임 분리).
- 목록 view, 이벤트, 스크롤 보존은 `features/fish-list/` 안에서 파일별로 분리한다.
- DOM 구조 생성과 화면 전체 리렌더링은 `main.js`에서 조립한다.
- feature 모듈은 DOM에 직접 의존하지 않는 순수 계산을 우선 제공하고, DOM 접근이 필요한 코드는 같은 feature의 `view.js`/`index.js`/이벤트 바인딩 모듈에 둔다.

## 상태와 저장소

- 어항 데이터는 브라우저 localStorage(`STORAGE_KEY = 'my-fishbowl:aquarium'`)에 저장한다.
- 주요 어항 상태:
  - `id`, `name`
  - `fishes`
  - `cleanliness`
  - `algaeLevel`
  - `lastCleanedAt`
  - `bounds`
  - `createdAt`, `updatedAt`
- UI 전용 상태는 `appState`에 둔다.
  - `selectedFishId`
  - `isFishListCollapsed`
  - `fishListScrollTop`
  - `cleaningState`
  - `propPanel.editingTarget`
  - `feedingAnimationId`, `movementController`, `bubbleController` 등 런타임 핸들
- `fishListScrollTop`은 물고기 목록 리렌더링 중 스크롤 위치를 보존하기 위한 UI 상태이며 저장소에는 저장하지 않는다.

## 이끼와 청소 레이어 규칙

어항 내부 레이어는 `z-index`로 명확하게 분리한다.

- 장식, 물고기, 먹이, 빈 상태 메시지는 이끼보다 아래에 둔다.
- `.algae-layer`는 물고기와 먹이보다 위에 둔다.
- 청소 모드의 진행률, 브러시 오버레이, 완료 메시지는 이끼보다 위에 둘 수 있다.
- `.algae-layer`는 `pointer-events: none`을 유지해 물고기 편집과 청소 오버레이 입력을 막지 않는다.

현재 주요 레이어 순서:

| 레이어 | 목적 |
| --- | --- |
| 장식/수조 배경 | 어항 배경 표현 |
| `.fish-layer` | 물고기와 먹이 표현 및 물고기 편집 입력 |
| `.aquarium-empty` | 빈 어항 안내 |
| `.algae-layer` | 이끼 오염 표현 |
| `.cleaning-overlay` | 청소 모드 입력 |
| `.cleaning-progress-bar`, `.cleaning-complete-message` | 청소 상태 표시 |

## God Mode

- God Mode는 개발 환경에서만 표시한다.
- God Mode는 현재 `algaeLevel` 직접 설정을 제공한다.
- 직접 설정 시 `algaeLevel`, `cleanliness`, `lastCleanedAt`, `updatedAt`을 함께 갱신한다.
- `lastCleanedAt`은 새로고침 후에도 같은 이끼 레벨이 복원되도록 `calcLastCleanedAtForAlgaeLevel()`로 역산한다.

## JavaScript 분리 기준

- `main.js`는 화면 조립과 feature 연결에 집중한다. 새 도메인 로직을 main.js에 추가하지 않는다.
- 기능 로직이 순수 계산으로 분리 가능하면 `src/features/<feature>/state.js` 또는 `index.js`로 이동한다.
- 렌더링 알고리즘이 독립적으로 커지면 `src/features/<feature>/view.js`로 이동한다.
- 같은 feature 안에서도 view / events / state / scroll 등 책임이 명확하면 파일을 더 쪼갠다(예: `fish-list/`).
- 프로젝트 전역에서 재사용되는 작은 helper는 `src/lib/`에 둔다.
- 새 feature는 `index.js`(또는 단일 모듈)를 통해 외부 공개 API를 명시한다.
- 테스트 가능한 계산은 feature 디렉터리 안에 `*.test.js`로 함께 둔다(`vitest run`).

## CSS 분리 기준

- 전역 토큰은 `tokens.css`에 둔다.
- 기본 reset과 typography는 `base.css`에 둔다.
- 페이지 배치는 `layout.css`에 둔다.
- 컴포넌트 스타일은 `components.css`에 두며, 한 영역이 명확히 독립되면 `components/<area>.css`로 분리한다.
- layer cascade에 영향을 주는 selector(예: `.food-layer`와 `.food-pellet` base)는 같은 파일에 둔다.
- 새 컴포넌트 파일을 만들면 `index.css`의 import 순서를 cascade 기준으로 조정한다.
- 작은 재사용 유틸리티는 `utilities.css`에 둔다.

## 구현 원칙

1. `index.html`에는 마운트 지점과 문서 메타 정보만 둔다.
2. 상태 변경 로직과 DOM 렌더링 로직은 함수 단위로 분리한다.
3. feature 모듈은 가능한 한 순수 함수 중심으로 작성한다.
4. Canvas 기반 기능은 상태 계산과 렌더링을 분리한다.
5. main.js는 wiring 위주를 유지하고, 새 도메인 로직은 features/ 하위 적절한 위치에 추가한다.
6. 영속화는 `features/aquarium/storage.js` 한 곳에서만 일어난다. 다른 feature가 직접 localStorage를 호출하지 않는다.
7. 문서의 요구사항이 바뀌면 `SPEC.md`, 관련 `docs/spec/*.md`, 이 문서, `docs/spec-command-patterns.md`의 코드 수정 위치 맵을 함께 갱신한다.
