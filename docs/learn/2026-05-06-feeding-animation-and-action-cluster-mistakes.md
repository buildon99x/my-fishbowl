# 2026-05-06 Feeding 애니메이션 / Action Cluster 연결 실수 기록

S-013 후속 작업에서 prop-panel 액션 버튼과 feeding 애니메이션을 손보다가 같은 종류의 실수를 반복했다. 향후 harness/검증 자동화에 반영할 수 있도록 정리한다.

---

## 1. 두 개의 동명 상태가 분리되어 동작하지 않은 `청소 모드` 버튼

### 현상

prop-panel 우측 액션 버튼 중 `청소 모드`(🧽)를 눌러도 실제 청소 모드(헤더의 `청소하기`가 트리거하는 기능)가 시작되지 않았다. 버튼은 시각적으로 활성/비활성만 토글되었다.

### 원인

`cleaningMode`라는 동일한 이름의 필드가 두 곳에 존재했다.

- `appState.cleaningState.cleaningMode` — main.js의 청소 엔진(브러시, 진행률, overlay)이 읽는 진짜 상태
- `propPanelState.cleaningMode` — prop-panel이 자체적으로 가진 토글 플래그

prop-panel의 click 핸들러는 `propPanelState.cleaningMode`만 토글했고, 어디에서도 `cleaningState`로 전파하지 않았다. 이름이 같아서 "이미 연결되어 있는 것 같은" 착각을 줬다.

### 수정

- `renderActionCluster`의 active 표시는 `cleaningState.cleaningMode`를 받아서 결정
- 클릭 핸들러는 `onCleaningToggle` 콜백으로 위임, main.js에서 실제 cleaning 진입/취소 로직 실행
- 중복되던 `propPanelState.cleaningMode` 필드 제거

### 교훈

같은 도메인 개념을 두 모듈이 각자 들고 있으면 "양쪽 다 있는데 동작은 한쪽만"의 침묵 버그가 생긴다. 새 UI를 만들 때 기존에 같은 이름의 상태가 있으면 **새로 만들지 말고 기존 상태를 받도록 위임**한다.

### Harness 시사점

- 같은 식별자(`cleaningMode`, `editingTarget` 등)가 서로 다른 모듈/state factory에서 둘 이상 정의되면 lint 단계에서 경고
- view 함수가 prop으로 받는 boolean이 click 핸들러로 어떤 state를 mutate하는지 추적해, "버튼이 토글하는 상태"와 "실제 동작 분기에 쓰이는 상태"가 같은 객체인지 확인할 수 있는 정적 분석

---

## 2. 매 프레임 `root.innerHTML` 재할당으로 버튼이 동작하지 않은 feeding 애니메이션

### 현상

`먹이 주기` 모드에서 먹이를 떨군 후, 먹이가 떨어지는 애니메이션이 끝나기 전까지는 `청소 모드`, `물고기 추가` 등 모든 액션 버튼 클릭이 무시됐다.

### 원인

`startFeedingAnimation`의 rAF 루프가 매 프레임 `renderApp(...)`을 호출했고, `renderApp`은 `root.innerHTML = ...`로 전체 DOM을 통째로 교체한다. 60fps로 모든 버튼 노드가 파괴/재생성되므로, `pointerdown`이 발생한 버튼 요소가 다음 프레임에 사라져 `pointerup`/`click` 페어가 끊겼다.

### 수정

애니메이션 루프에서 `renderApp` 호출 제거. 대신 두 개의 surgical patch 함수로 교체:

- `patchFoodLayer(root, foods)` — food id 집합이 동일하면 `--food-y` CSS 변수만 갱신, 다르면 food layer만 innerHTML 재할당
- `patchFishPositions(root, fishes, fishEatingId)` — `--fish-x`, `--fish-y`, `--fish-flip`과 `is-eating` 클래스만 직접 변경

### 교훈

`requestAnimationFrame` 안에서 부모 컨테이너의 `innerHTML`을 통째로 바꾸는 패턴은 사실상 **모든 자식 요소의 진행 중인 포인터 인터랙션을 매 프레임 깨뜨린다**. 애니메이션 갱신은 항상 변경 범위를 최소화한 surgical 업데이트로 한정한다.

### Harness 시사점

- `requestAnimationFrame` 콜백 안에서 (직간접적으로) 도달하는 함수가 `root.innerHTML = ` 또는 큰 컨테이너의 innerHTML 재할당을 수행하면 빌드 시 경고
- e2e 시나리오 중 "애니메이션 진행 중에 다른 버튼을 클릭"하는 smoke 테스트를 추가해, 버튼 click 이벤트가 실제로 실행되는지 검증
- 렌더 함수의 호출 빈도(특히 호출 스택의 rAF 여부)를 dev mode에서 카운트해 임계치 초과 시 경고

---

## 3. surgical patch 도입 후 두 애니메이션 루프가 같은 상태를 동시 갱신한 경합

### 현상

위 2번 수정 직후 feeding 애니메이션 자체가 깨졌다. 먹이를 떨궈도 물고기가 먹이 쪽으로 다가가지 않고 평소 swim 경로로 그대로 흘렀다.

### 원인

항상 도는 `startFishMovement`(물고기 이동 컨트롤러)와 feeding 루프가 둘 다 매 프레임 다음을 갱신했다.

- `aquarium.fishes = stepFishesMovement(...)` (이동 컨트롤러)
- `aquarium.fishes = result.fishes` (feeding 루프)
- `--fish-x`, `--fish-y` CSS 변수도 두 루프가 동시에 set

이전에는 매 프레임 `renderApp`이 movementController를 stop하고 새로 start해서 사실상 feeding이 우선했고, 이 충돌이 가려져 있었다. surgical patch로 바꾸면서 충돌이 표면에 드러났다.

### 수정

`getPausedFishIds` 콜백에서 `feedingState.foods.length > 0`이면 모든 물고기 id를 paused 집합에 추가. 음식이 화면에 떠 있는 동안에는 이동 컨트롤러가 위치를 건드리지 않고, 음식이 모두 사라지면 자동으로 swim 동작 복귀.

### 교훈

"늘 돌고 있는 background loop"가 있는 상태에서 새로운 foreground loop를 추가하면 **두 루프가 같은 mutable state를 두고 경쟁**한다. 이전 구현이 실수로 한쪽을 죽이고 있던 덕분에 동작했다면, 그 부수효과를 명시적인 일시정지/우선순위 정책으로 옮겨야 한다.

### Harness 시사점

- 같은 객체 필드(`aquarium.fishes`)나 같은 DOM 속성(`--fish-x`)을 여러 rAF 루프가 모두 write할 때 dev 빌드에서 last-writer 경합을 감지해 경고
- "이전에 우연히 잘 돌던" 동작이 리팩터로 깨지지 않도록, 각 background loop가 어떤 상태에 대해 ownership을 갖는지 docs/architecture 수준에서 명시

---

## 4. `data-` 속성 누락으로 surgical patch 함수가 침묵 실패

### 현상

위 2번 수정에서 도입한 `patchFoodLayer`는 lint도 test도 모두 통과했지만, 실제로 먹이가 화면에서 떨어지지 않았다.

### 원인

```js
const foodLayer = root.querySelector('[data-food-layer]');
if (!foodLayer) return; // 조용히 종료
```

DOM에는 `<div class="food-layer">`만 있고 `data-food-layer` 속성이 없었다. `querySelector`가 `null`을 반환했고, 가드 분기로 함수가 매 프레임 그냥 종료되었다. 에러도 콘솔 경고도 발생하지 않았다.

### 수정

`<div class="food-layer" data-food-layer aria-hidden="true">`로 속성 추가.

### 교훈

`querySelector(...)?.` 또는 `if (!el) return;` 패턴은 "없으면 안전하게 패스"가 의도일 때만 써야 한다. surgical patch처럼 **그 요소가 반드시 있어야만 의미가 있는** 코드에서는, 디자인 시점에 셀렉터 - 마크업 짝이 동시에 등장하도록 같은 모듈에 두거나 dev에서 throw 해야 한다.

### Harness 시사점

- 함수 안에서 사용된 `[data-...]` 셀렉터 리스트와 `renderXxx` 출력 HTML의 `data-...` 속성 리스트를 빌드 시 cross-check해 미스매치 경고
- dev mode에서는 `if (!foodLayer) return` 같은 silent return 자리를 `console.warn` 또는 throw로 wrapping할 수 있는 유틸 (`dev-required-element('[data-food-layer]')` 등)
- 새로 추가한 surgical patch 함수마다 "필요한 DOM이 비었을 때 어떻게 해야 하는지"를 명시적으로 문서화하도록 PR 템플릿에 항목 추가

---

## 5. surgical update를 도입했지만 트리거 함수에 `render()`가 그대로 남아 있던 문제

### 현상

2번에서 애니메이션 루프 안의 `renderApp`은 제거했는데, 사용자가 다시 "먹이 떨어지는 동안 다른 버튼이 안 눌린다"고 보고했다.

### 원인

`dropFood()`가 마지막에 `options.render?.()`를 호출하고 있었고, 이는 곧 `renderApp` 전체 재렌더였다. `feeding mode`에서 사용자가 드래그하면 120ms 간격으로 `dropFood`가 호출되며 매번 전체 DOM이 파괴/재생성됐다.

수정의 초점이 "rAF 루프"에만 있어서, 같은 데이터 흐름의 다른 진입점(`pointerdown`/`pointermove` → `dropFood`)을 놓쳤다.

### 수정

`dropFood`에서 `render()` 호출 제거. 새 음식은 다음 rAF 프레임의 `patchFoodLayer`가 새 id를 감지해 food layer만 surgical 재구성하므로 ~16ms 내 표시된다.

### 교훈

"전체 재렌더 → surgical patch" 마이그레이션은 단순히 애니메이션 루프 한 곳만 바꿔서 끝나지 않는다. 같은 도메인의 모든 mutation 진입점(클릭, 드래그, 키보드, 외부 이벤트)이 같은 갱신 모델을 따르도록 일괄 점검해야 한다.

### Harness 시사점

- 특정 콜백(`render`, `forceUpdate`)이 한 모듈에서 호출되는 모든 위치를 grep/AST로 나열하는 dev script
- 전체 재렌더 함수에 deprecation 경고를 박아두고, 호출 시 stack을 dev 콘솔에 찍어 미처 마이그레이션되지 않은 진입점이 드러나도록 함
- 새 패턴(surgical patch) 도입 시 PR 체크리스트에 "기존 trigger 경로 N개 중 M개를 마이그레이션함" 식의 명시적 카운트 요구

---

## 종합

이번 세션의 다섯 건 중 네 건은 **"이전 구현의 부수효과에 무의식적으로 의존"** 한 결과였다.

- 1번: prop-panel 자체 `cleaningMode`가 동작한다고 착각 → 사실은 cleaning 엔진이 별도 상태를 봄
- 2번: 매 프레임 `renderApp`이 멀쩡히 동작한다고 가정 → 사실은 인터랙션을 깨뜨리고 있었음
- 3번: 두 루프 공존이 안전하다고 가정 → 사실은 한쪽이 stop/restart로 다른 쪽을 죽이고 있었음
- 5번: 하나의 진입점만 고치면 끝이라고 가정 → 사실은 같은 갱신을 일으키는 다른 진입점이 남아있었음

공통 시사점: 각 모듈이 "내가 owning하는 상태/DOM 영역"과 "내가 의존하는 다른 모듈의 갱신 빈도"를 **명시적으로 선언**하게 만들고, 그 선언을 빌드/test에서 검증할 수 있는 형태로 가져갈 가치가 있다.
