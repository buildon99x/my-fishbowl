# S-020 Prop Type Classification

## 상태

- 상태: done
- 구현 여부: done
- 검증 여부: tested

## 목표

- 사용자가 직접 추가하는 이미지 오브젝트를 내부 모델에서는 Prop으로 정의하고, Prop을 `fish`(물고기)와 `deco`(장식)로 구분한다.
- 사용자에게 보이는 UI 명칭은 `Prop`을 쓰지 않고 `오브젝트`를 사용한다.
- 기존 Add Fish Image, 물고기 목록, 물고기 속성 편집 패널 흐름을 유지하되, fish 전용 기능이 deco에 적용되지 않도록 타입 경계를 명확히 한다.
- 어린이 사용자가 등록 시 타입을 잘못 고를 수 있음을 전제로, 등록 이후에도 Prop 타입을 쉽게 바꿀 수 있게 한다.
- 향후 산호, 돌, 배경 장식 같은 사용자 추가 장식 오브젝트가 동일한 등록/목록/속성 패널 인프라를 재사용할 수 있게 한다.

## 범위

- 포함:
  - Add Fish Image 패널을 오브젝트 추가 패널로 바꾸고 타입 선택을 추가하는 설계
  - 등록 draft와 저장 모델에 `type: 'fish' | 'deco'`를 추가하는 설계
  - 기존 `aquarium.fishes` 배열을 사용자 추가 Prop 컬렉션으로 점진 확장하는 설계
  - 물고기 목록을 오브젝트 목록으로 확장하되 fish/deco를 시각적으로 구분하는 설계
  - prop-panel에서 fish 전용 편집기와 deco 전용 편집기를 분기하는 설계
  - 등록 이후 prop-panel에서 `fish`와 `deco` 타입을 전환하는 설계
  - movement, feeding, hunger 같은 fish 전용 루프가 deco를 무시하도록 필터링하는 설계
- 제외:
  - 기본 내장 수초/정원장어 같은 ambient decoration 관리 기능
  - 여러 Prop 타입의 세부 프리셋 시스템
  - 다중 선택 편집
  - 레이어 순서 편집
  - 서버 저장 또는 asset 업로드
  - 실제 런타임 구현

## 현재 기능 파악

### Add Fish Image

- 현재 진입점은 `renderActionCluster`의 `data-prop-add-fish` 버튼이고, 클릭 시 `fishInputState.isExpanded`를 토글한다.
- `src/features/fish-input/state.js`는 draft에 `name`, `spriteDataUrl`, `source`, `movementEnabled`를 저장한다.
- `src/features/fish-input/view.js`는 파일 업로드, 이름, Movement On/Off, drawing canvas, Register image 버튼을 렌더링한다.
- `src/features/fish-input/index.js`는 이미지를 240x160 PNG sprite로 리사이즈하고, Register image 클릭 시 `saveFishDraft(state)` 결과를 `options.onRegister(draft)`로 넘긴다.
- `src/main.js`의 `onRegister`는 `addFishToAquarium(aquarium, draft)`를 호출하고, 생성된 fish를 선택한 뒤 `appState.propPanel.editingTarget = { id: fish.id, type: 'fish' }`로 편집 패널을 연다.

### 물고기 목록

- `src/features/fish-list/view.js`는 `renderAquariumStatus(aquarium, appState)`에서 `aquarium.fishes.length`와 `renderFishList(aquarium.fishes, ...)`를 사용한다.
- 목록 항목은 썸네일, 이름, 등록 시각, 편집/감추기/삭제 버튼을 가진다.
- `src/features/fish-list/events.js`는 `data-edit-fish`, `data-toggle-fish-hidden`, `data-delete-fish` 같은 fish 전용 data attribute와 이벤트를 사용한다.
- collapse/expand 상태와 scroll 보존은 별도 상태(`isFishListCollapsed`, `fishListScrollTop`)로 유지된다.

### 물고기 속성 편집 패널

- `src/features/prop-panel/view.js`는 이미 `PROP_RENDERERS = { fish: renderFishProps }` 구조와 `editingTarget.type` 분기를 가진다.
- `renderPropPanel(target, aquarium, propPanelState)`는 현재 `findEntityByTarget`에서 항상 `aquarium.fishes`를 검색한다.
- `src/features/prop-panel/fish-props.js`는 이름, 크기, 머리 방향, 움직임 On/Off, 좌우/상하 반전, 초기화, 회전, scale X/Y를 렌더링한다.
- `src/features/prop-panel/events.js`는 fish 전용 업데이트만 처리하며, DOM patch도 `[data-fish-sprite]`에 직접 적용한다.
- God Mode는 `type: 'godmode'`로 prop-panel에 이미 들어와 있어, `type` 기반 확장 패턴은 코드에 존재한다.

## 데이터 모델 요구사항

### 타입 정의

```ts
type UserPropType = 'fish' | 'deco';

type UserPropBase = {
  id: string;
  type: UserPropType;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  flipped: boolean;
  flippedY: boolean;
  hidden: boolean;
  createdAt: string;
};

type FishProp = UserPropBase & {
  type: 'fish';
  vx: number;
  vy: number;
  speed: number;
  movementStatus: string;
  behaviorStatus: string;
  headDirection: 'left' | 'right';
  movementEnabled: boolean;
  hunger: number;
  lastFedAt?: string;
};

type DecoProp = UserPropBase & {
  type: 'deco';
  movementEnabled: false;
};
```

### 명칭 원칙

- 내부 개발 타입과 저장 값은 `fish` / `deco`를 유지한다.
- 개발 문서에서는 내부 모델을 설명할 때 Prop이라는 용어를 사용할 수 있다.
- 사용자에게 보이는 UI에서는 `Prop`을 쓰지 않는다.
- 사용자 표시명:
  - `Prop` -> `오브젝트`
  - `Prop 추가` -> `오브젝트 추가`
  - `프롭 목록` -> `오브젝트 목록`
  - `deco` -> `장식`
- badge, label, aria-label, title, status message도 사용자 표시명 원칙을 따른다.

### 타입 변경 원칙

- `type`은 등록 후에도 변경 가능한 mutable field다.
- 타입 변경은 데이터를 지우는 변환이 아니라 행동 모드 전환으로 처리한다.
- 공통 필드는 타입 변경 시 항상 유지한다.
  - `name`, `imageUrl`, `x`, `y`, `size`, `rotation`, `scaleX`, `scaleY`, `flipped`, `flippedY`, `hidden`, `createdAt`
- fish 전용 필드는 deco로 변경하더라도 삭제하지 않는다.
  - `hunger`, `headDirection`, `movementEnabled`, `vx`, `vy`, `speed`, movement/behavior 상태값
  - deco 상태에서는 inactive로 취급하고, 다시 fish로 바꾸면 기존 설정을 복원한다.
- `deco -> fish` 전환 시 fish 전용 필드가 없으면 `normalizeAquarium` 또는 타입 전환 helper가 기본값을 보정한다.
- `fish -> deco` 전환 시 즉시 movement/feeding 대상에서 제외하고 eating class, `feedingState.fishEating`, movement pause 같은 임시 상태에서 해당 id를 제거한다.
- 타입 변경에는 확인 모달을 사용하지 않는다. 어린이 사용자를 고려해 즉시 바뀌고 다시 되돌릴 수 있는 컨트롤을 제공한다.
- 타입 변경 직후 prop-panel은 닫히지 않고 같은 오브젝트 편집을 계속한다.
- 타입 변경 직후 panel 내부에 짧은 상태 피드백을 표시한다.
  - fish -> deco: `장식으로 바뀌었어요. 이제 움직이지 않아요.`
  - deco -> fish: `물고기로 바뀌었어요. 다시 헤엄칠 수 있어요.`

### 저장 위치

- 1차 구현에서는 기존 `aquarium.fishes` 배열을 유지하고 각 항목에 `type`을 추가한다.
- 기존 저장 데이터에는 `type`이 없으므로 `normalizeAquarium`은 누락된 `type`을 `fish`로 보정해야 한다.
- 새 배열(`aquarium.props`)은 이번 스펙에서 만들지 않는다. 현재 movement, feeding, rendering, list, edit 경로가 모두 `aquarium.fishes`를 공유하므로 저장 배열 분리는 별도 마이그레이션 스펙으로 분리한다.

### draft 상태

- `fish-input` draft에 `type`을 추가한다.
- 기존 draft에 `type`이 없으면 `fish`로 간주한다.
- draft의 `movementEnabled`는 `type === 'fish'`일 때만 의미가 있다. `deco` 등록 시에는 저장 모델에서 항상 `movementEnabled: false`로 고정한다.

## UI 요구사항

### 오브젝트 추가 패널

- 패널과 action button의 사용자 표시 명칭은 fish 전용 표현을 피하고 "오브젝트 추가"로 확정한다.
- 기존 "Add Fish Image", "Fish name" 같은 텍스트는 선택된 타입과 맞지 않으므로 변경한다.
  - 패널 제목: `오브젝트 추가`
  - 이름 라벨: fish 선택 시 `물고기 이름`, deco 선택 시 `장식 이름`
  - action cluster tooltip/aria-label: `오브젝트 추가`
- 기존 파일 업로드, drawing canvas, preview, Register image 동작은 유지한다.
- 이름 입력 위 또는 preview 근처에 타입 선택 segmented control을 추가한다.
  - 선택지: `물고기`, `장식`
  - 기본값: `물고기`
  - data attribute 예시: `data-fish-prop-type`
- preview 영역에는 현재 등록될 타입 badge를 표시한다.
- 타입이 `fish`이면 기존 Movement On/Off 컨트롤을 표시한다.
- 타입이 `deco`이면 Movement 컨트롤은 숨긴다. disabled 상태로 남겨 두면 사용자가 왜 조작할 수 없는지 혼동할 수 있다.
- Register image 버튼 문구는 기존 버튼을 유지할 수 있으나, 상태 문구는 선택 타입을 반영해야 한다.
  - fish: `<name> is ready as a fish sprite.`
  - deco: `<name> is ready as a decoration object.`
- 등록 직후 새 오브젝트는 선택/편집 상태로 강조된다.
- 등록 직후 prop-panel이 열리고, 사용자가 바로 드래그해 위치를 조정할 수 있어야 한다.

### 오브젝트 목록

- 목록은 사용자 추가 오브젝트를 표시하는 목록으로 확장한다.
- 제목은 "오브젝트 목록"으로 변경한다. 장식을 추가할 수 있는데 계속 "물고기 목록"으로 표시하면 사용자가 잘못 등록됐다고 느낄 수 있다.
- 요약 카운트는 전체 개수와 타입별 개수를 함께 표시한다.
  - 예: `전체 5 · 물고기 3 · 장식 2`
- 각 항목은 타입 badge를 표시한다.
  - fish: `물고기`
  - deco: `장식`
- 기존 선택, 편집, 감추기, 삭제 버튼 동작은 두 타입 모두 지원한다.
- fish 전용 액션이 목록에 새로 생기면 deco에는 표시하지 않는다.
- 목록의 active/editing 상태는 `editingTarget.id === item.id`를 기준으로 한다. 현재처럼 `editingTarget.type === 'fish'`를 조건에 넣으면 deco 편집 시 목록 active 상태가 빠진다.
- 삭제 버튼의 accessible label 또는 title은 타입별로 구분한다.
  - fish: `물고기 삭제`
  - deco: `장식 삭제`

### 속성 편집 패널

- prop-panel은 `editingTarget.type`으로 renderer를 선택한다.
- 등록 직후와 목록 편집 진입 직후의 prop-panel 상단에는 종류 segmented control을 첫 번째 주요 컨트롤로 표시한다. 고급 설정 안에 넣지 않는다.
- fish는 기존 `renderFishProps`를 그대로 사용한다.
- 장식(`deco`)은 새 `renderDecoProps`를 사용한다.
- 장식 편집 패널은 다음 컨트롤만 제공한다.
  - 종류(`물고기 | 장식`)
  - 이름
  - 크기
  - 좌우 반전
  - 상하 반전
  - 초기화
  - 회전
  - scale X/Y
- 장식 편집 패널에는 다음 fish 전용 컨트롤을 표시하지 않는다.
  - 머리 방향
  - 움직임 On/Off
  - hunger/feeding 관련 컨트롤
- panel header badge는 사용자 표시명인 `물고기` 또는 `장식`을 표시한다.
- fish 편집 패널에도 동일한 `종류` segmented control을 표시한다.
- 종류 컨트롤 변경 시 prop-panel은 닫히지 않고 같은 id의 새 타입 편집 패널로 즉시 전환한다.
- 타입 변경은 확인 모달 없이 적용한다. 잘못 바꿨을 때 같은 컨트롤로 바로 되돌릴 수 있어야 한다.
- 타입 변경 직후 panel 내부 status 영역에 짧은 피드백을 표시한다.
- 장식 편집 패널에서는 fish 전용 컨트롤이 사라지는 대신 `장식은 움직이지 않아요.` 같은 짧은 상태 문구로 현재 행동을 설명한다.

## 처리 요구사항

### 등록

- `saveFishDraft`는 선택된 `type`을 draft에 저장한다.
- `addFishToAquarium` 또는 새 이름의 등록 함수는 draft 타입에 따라 fish/deco 객체를 생성한다.
- 함수명은 구현 시 다음 중 하나로 정리한다.
  - 최소 변경: `createFishFromDraft`, `addFishToAquarium` 이름은 유지하고 내부에서 `type`을 처리한다.
  - 권장 변경: `createUserPropFromDraft`, `addUserPropToAquarium`을 새로 만들고 기존 fish 함수는 compatibility wrapper로 둔다.
- 등록 직후 `editingTarget`은 `{ id: prop.id, type: prop.type }`으로 설정한다.
- 장식(`deco`) 생성 기본값은 fish와 다르게 둔다.
  - 기본 위치: 바닥권 또는 장식이 자연스러운 위치. 예: `x: 50`, `y: 78`
  - 기본 크기: fish와 별도 기본값. 예: `size: 110`
  - `movementEnabled: false`
  - `hunger`는 생성하지 않거나, 존재하더라도 fish 전용 inactive 필드로만 취급한다.

### 타입 전환

- prop-panel의 종류 컨트롤은 현재 Prop의 `type`을 즉시 업데이트하고 저장한다.
- `fish -> deco`:
  - 공통 appearance/position 필드는 그대로 유지한다.
  - fish 전용 필드는 삭제하지 않는다.
  - `movementEnabled`는 런타임에서 false처럼 취급한다.
  - 해당 id가 `feedingState.fishEating`이면 즉시 null로 정리한다.
  - 해당 DOM sprite의 eating/movement 관련 class 또는 data state는 다음 render/patch에서 제거된다.
  - panel status에 `장식으로 바뀌었어요. 이제 움직이지 않아요.`를 표시한다.
- `deco -> fish`:
  - 공통 appearance/position 필드는 그대로 유지한다.
  - 누락된 fish 전용 필드를 기본값으로 채운다.
  - 기본 `movementEnabled`는 true로 복원하되, 이전 fish 상태에서 사용자가 꺼 둔 값이 남아 있으면 그 값을 유지한다.
  - 다음 movement tick부터 fish 후보에 포함된다.
  - panel status에 `물고기로 바뀌었어요. 다시 헤엄칠 수 있어요.`를 표시한다.
- 타입 전환 helper는 `src/features/aquarium/fish-actions.js` 또는 후속 `prop-actions.js`에 둔다.
  - 예: `updatePropType(aquarium, propId, nextType, runtimeState?)`
  - 런타임 임시 상태 정리는 main wiring에서 콜백으로 처리해도 된다.

### 렌더링

- `renderFishes`는 이름을 `renderUserProps` 또는 유사한 이름으로 바꾸는 것이 권장된다.
- DOM class는 1차 구현에서 `.fish-sprite`를 재사용해도 되지만, data attribute는 타입 중립형으로 확장하는 것이 권장된다.
  - 현재: `data-fish-sprite`
  - 권장: `data-user-prop`
- 최소 구현에서는 기존 `data-fish-sprite`를 유지하되 deco에도 같은 sprite 스타일을 적용하고, 별도 class modifier `.is-deco`를 추가한다.
- `renderEmptyState`는 fish 수가 아니라 사용자 추가 오브젝트 수를 기준으로 표시 여부를 결정한다.
- 장식(`deco`)은 fish와 같은 이미지 렌더링 파이프라인을 사용하되 `data-prop-type="deco"` 또는 `.is-deco`를 부여해 스타일/테스트에서 구분할 수 있어야 한다.

### movement

- `normalizeAquariumFishMovement`, `startFishMovement`, `stepFishesMovement`는 `type !== 'deco'`인 항목만 이동 상태를 만들거나 갱신해야 한다.
- 기존 저장 데이터는 type 누락 시 fish로 보정되므로 기존 물고기 동작은 유지되어야 한다.
- 장식(`deco`)은 `x`, `y`, transform 값만 유지하고 자동 이동/bob/tilt를 받지 않는다.

### feeding

- `tickFeeding`은 먹이에 반응할 후보를 `type !== 'deco' && !fish.hidden`으로 필터링한다.
- 장식(`deco`)은 food attract, eating animation, hunger 변경 대상이 아니다.
- `feedingState.fishEating`에는 deco id가 들어가면 안 된다.

### drag/edit

- 기존 fish drag는 `bindUserPropDrag`로 확장하고, `editingTarget.type`이 `fish` 또는 `deco`일 때 공통 위치 업데이트를 수행한다.
- 장식(`deco`)도 편집 중 위치 이동을 지원한다.
- 새로 등록된 오브젝트는 즉시 editing/selected 상태가 되어 드래그 가능하다는 시각 신호를 준다.
- fish drag 중 movement pause 정책은 fish에만 적용한다. deco는 movement 루프 대상이 아니므로 pause set에 포함할 필요가 없다.

## 구현 메모

### 관련 파일

- `src/features/fish-input/state.js`
  - draft type 저장/복원
  - 기본 type `fish`
- `src/features/fish-input/view.js`
  - type 선택 UI 추가
  - deco 선택 시 Movement 컨트롤 숨김
  - 패널/라벨/tooltip의 fish 전용 명칭 제거
  - 사용자 표시명은 `오브젝트 추가`, `물고기`, `장식`으로 통일
- `src/features/fish-input/index.js`
  - type 선택 이벤트 바인딩
  - register 메시지 타입별 분기
- `src/features/aquarium/model.js`
  - 누락된 `type`을 `fish`로 normalize
  - `deco` 기본 필드 보정
- `src/features/aquarium/fish-actions.js`
  - Prop 생성 함수 도입 또는 기존 함수 확장
  - `type === 'deco'` 기본값 분기
  - 등록 이후 타입 변경 helper 추가
- `src/main.js`
  - 등록 직후 `editingTarget.type`을 draft type으로 설정
  - rendering/empty state/feeding/movement 호출부에서 타입 필터 적용
- `src/features/fish-list/view.js`
  - "오브젝트 목록" 제목, 전체/fish/deco 카운트, 항목 badge 표시
  - active/editing 상태를 id 기준으로 계산
- `src/features/fish-list/events.js`
  - data attribute 명명 정리 또는 compatibility 유지
- `src/features/prop-panel/view.js`
  - `PROP_RENDERERS.deco = renderDecoProps`
  - `findEntityByTarget`에서 타입별 lookup
- `src/features/prop-panel/deco-props.js`
  - 새 파일. deco 전용 편집 컨트롤
- `src/features/prop-panel/events.js`
  - `bindDecoPropsEvents`
  - type segmented control 이벤트 처리
  - fish/deco 공통 transform update helper 추출
  - 타입 변경 직후 panel status 피드백 상태 갱신
- `src/features/feeding/state.js`
  - feeding 후보에서 deco 제외
- `src/features/fish-movement/index.js`, `src/features/fish-movement/state.js`
  - movement 후보에서 deco 제외
- `src/lib/fishSpriteStyle.js`
  - deco에도 재사용 가능한 이름으로 유지하거나 후속 스펙에서 `propSpriteStyle`로 변경

### 권장 구현 순서

1. 모델 보정: `type` normalize, draft type 저장, 기존 테스트 추가.
2. 등록 흐름: Add Fish Image 패널을 오브젝트 추가 패널로 명칭 정리, 타입 선택, fish/deco 생성 분기.
3. 렌더링/목록: 오브젝트 목록 제목, 타입 badge, 타입별 카운트, 빈 상태 기준 변경.
4. prop-panel: `deco-props.js`, 종류 segmented control, panel status feedback, event binding 추가.
5. 타입 전환: fish/deco 전환 helper와 런타임 임시 상태 정리.
6. fish 전용 루프 보호: movement/feeding이 deco를 무시하도록 필터링.
7. drag 위치 편집: fish/deco 공통 위치 이동 지원.

## 검증 기준

- [ ] 기존 저장 데이터에 `type`이 없어도 모든 기존 물고기가 `fish`로 복원된다.
- [ ] 오브젝트 추가 패널에서 `물고기`를 선택하고 등록하면 기존과 동일하게 움직임/먹이 반응/속성 편집이 동작한다.
- [ ] 오브젝트 추가 패널에서 `장식`을 선택하고 등록하면 목록에 `장식` badge가 표시된다.
- [ ] 장식 등록 직후 prop-panel이 `{ type: 'deco' }` 편집 패널로 열린다.
- [ ] 오브젝트 추가 패널과 action button이 fish 전용 명칭만 사용하지 않는다.
- [ ] 사용자 UI에는 `Prop`이라는 단어를 표시하지 않는다.
- [ ] 오브젝트 목록은 전체/fish/deco 카운트를 표시한다.
- [ ] 장식 편집 패널에는 이름/크기/반전/회전/scale 컨트롤만 표시되고, 머리 방향/움직임 On/Off는 표시되지 않는다.
- [ ] prop-panel 상단 첫 번째 주요 컨트롤로 종류(`물고기 | 장식`) segmented control이 표시된다.
- [ ] 장식은 자동 이동하지 않고 먹이에 반응하지 않으며 hunger 값이 변경되지 않는다.
- [ ] 장식은 기본적으로 바닥권 위치에 생성된다.
- [ ] 장식 감추기/보이기/삭제가 목록에서 정상 동작한다.
- [ ] 장식 편집 중에도 목록 active/editing 상태가 표시된다.
- [ ] 장식을 편집 중 드래그하면 위치가 변경되고 저장된다.
- [ ] 새로 등록된 오브젝트는 선택/편집 상태로 강조되고 바로 드래그할 수 있다.
- [ ] prop-panel에서 fish를 deco로 바꾸면 위치/크기/회전/반전은 유지되고 movement/feeding 대상에서 즉시 제외된다.
- [ ] prop-panel에서 deco를 fish로 바꾸면 위치/크기/회전/반전은 유지되고 fish 전용 필드가 기본값으로 보정된다.
- [ ] 타입 변경 직후 prop-panel이 닫히지 않고 같은 오브젝트 편집을 계속한다.
- [ ] 타입 변경 직후 panel 내부에 바뀐 행동을 알려주는 짧은 피드백이 표시된다.
- [ ] 타입 변경 후 새로고침해도 변경된 타입과 정적/동적 행동이 유지된다.
- [ ] 기존 fish 목록 collapse/expand와 scroll 보존이 유지된다.
- [ ] 기존 fish 등록, fish 편집, feeding, movement 테스트가 회귀하지 않는다.
- [ ] `npm test`가 통과한다.
- [ ] `npm run build`가 통과한다.
