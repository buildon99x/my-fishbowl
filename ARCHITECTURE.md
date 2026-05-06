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
│   └── spec/
│       ├── _template.md
│       ├── S-001-initial-spec.md
│       ├── S-002-aquarium-creation.md
│       ├── S-003-fish-image-input.md
│       ├── S-004-fish-creation.md
│       ├── S-005-fish-movement.md
│       ├── S-006-feeding.md
│       ├── S-007-algae-system.md
│       ├── S-008-aquarium-cleaning.md
│       ├── S-009-fish-liveliness.md
│       ├── S-010-food-types.md
│       └── S-011-fish-list-scroll-preservation.md
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
    │   ├── cleaning/
    │   │   ├── index.js
    │   │   └── index.test.js
    │   ├── feeding/
    │   ├── fish-input/
    │   └── fish-movement/
    └── styles/
        ├── index.css
        ├── base.css
        ├── layout.css
        ├── components.css
        ├── tokens.css
        └── utilities.css
```

## 파일 책임

- `index.html`: Vite 애플리케이션의 HTML 진입점이다. `#app` 마운트 노드만 유지하고 화면 로직은 `src/main.js`에서 관리한다.
- `src/main.js`: 애플리케이션 조립, 렌더링, 이벤트 바인딩, 로컬 저장소 저장 호출, feature 모듈 연결을 담당한다.
- `src/features/algae/state.js`: 이끼 레벨, 청결도, 상태명, God Mode 저장용 시간 역산 같은 순수 상태 계산을 담당한다.
- `src/features/algae/view.js`: Canvas 기반 이끼 패치 렌더링과 레벨별 렌더 강도 보간을 담당한다.
- `src/features/cleaning/index.js`: 청소 모드 상태 생성, Canvas 스냅샷, 브러시 적용, 진행률 계산, 완료 시 Canvas 비우기를 담당한다.
- `src/features/feeding/`: 먹이 생성, 먹이 이동, 물고기 먹이 반응을 담당한다.
- `src/features/fish-input/`: 이미지 업로드, 직접 그리기, 물고기 초안 저장과 입력 UI를 담당한다.
- `src/features/fish-movement/`: 물고기 이동 상태 정규화, 프레임 단위 이동, 방향 반전 계산을 담당한다.
- `src/styles/index.css`: 스타일 진입점이다. 역할별 CSS 파일만 import한다.
- `src/styles/components.css`: 어항, 물고기 목록, 청소 UI, God Mode 등 컴포넌트 스타일을 담당한다.

## 기능 모듈 경계

- 시간 기반 이끼 계산은 `features/algae/state.js`에 둔다.
- 이끼 Canvas 렌더링은 `features/algae/view.js`에 둔다.
- 청소 입력과 진행률 계산은 `features/cleaning/index.js`에 둔다.
- DOM 구조 생성, 화면 전체 리렌더링, 이벤트 바인딩은 `main.js`에 둔다.
- feature 모듈은 DOM에 직접 의존하지 않는 순수 계산을 우선 제공하고, DOM 접근이 필요한 코드는 `main.js`에서 연결한다.

## 상태와 저장소

- 어항 데이터는 브라우저 로컬 저장소에 저장한다.
- 주요 어항 상태:
  - `fishes`
  - `cleanliness`
  - `algaeLevel`
  - `lastCleanedAt`
  - `bounds`
- UI 전용 상태는 `appState`에 둔다.
  - `selectedFishId`
  - `editingFishId`
  - `isFishListCollapsed`
  - `fishListScrollTop`
  - `cleaningState`
  - `godModeState`
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

- `main.js`는 화면 조립과 feature 연결에 집중한다.
- 기능 로직이 순수 계산으로 분리 가능하면 `src/features/<feature>/state.js` 또는 `index.js`로 이동한다.
- 렌더링 알고리즘이 독립적으로 커지면 `src/features/<feature>/view.js`로 이동한다.
- 새 feature는 `index.js`를 통해 외부 공개 API를 명시한다.
- 테스트 가능한 계산은 feature 디렉터리 안에 `*.test.js`로 함께 둔다.

## CSS 분리 기준

- 전역 토큰은 `tokens.css`에 둔다.
- 기본 reset과 typography는 `base.css`에 둔다.
- 페이지 배치는 `layout.css`에 둔다.
- 컴포넌트 스타일은 `components.css`에 둔다.
- 작은 재사용 유틸리티는 `utilities.css`에 둔다.

## 구현 원칙

1. `index.html`에는 마운트 지점과 문서 메타 정보만 둔다.
2. 상태 변경 로직과 DOM 렌더링 로직은 함수 단위로 분리한다.
3. feature 모듈은 가능한 한 순수 함수 중심으로 작성한다.
4. Canvas 기반 기능은 상태 계산과 렌더링을 분리한다.
5. 문서의 요구사항이 바뀌면 `SPEC.md`, 관련 `docs/spec/*.md`, 이 문서를 함께 갱신한다.
