# S-011 속성 패널(prop-panel) 분리 및 신설

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 물고기 목록 아이템 내부에 인라인으로 표시되던 편집 패널(`fish-editor`)을, 별도의 **속성 패널(`prop-panel`)** 로 분리한다.
- 향후 산호, 돌 등 배경 오브젝트(prop)도 동일 패널로 편집할 수 있도록 **타입 확장 가능한 구조**를 갖춘다.
- 저령층 사용자도 직관적으로 조작할 수 있는 **대형 터치 타겟 + 아이콘 중심 UI** 를 적용한다.
- 이슈 #14의 **둥근 이모지 버튼 + 툴팁** 디자인 언어와 일관성을 유지한다.

## 범위

- 포함할 것:
  - `src/features/prop-panel/` 피처 모듈 신설 (state / view / events / index)
  - 물고기 목록(`renderFishList`)에서 인라인 편집 패널 제거
  - `appState.editingFishId` → `appState.editingTarget = { id, type }` 로 확장
  - 물고기(`type: 'fish'`)에 대한 속성 편집 폼 (`fish-props.js`) 구현
  - 저령층 친화 UI: 대형 슬라이더 핸들, 토글 버튼, 이모지 레이블, 실시간 미리보기
  - 액션 버튼(반전 X/Y, 초기화, 닫기) 둥근 이모지 버튼 + 툴팁 적용
  - 고급 설정(회전, 스케일 X/Y) 아코디언 접기 처리
- 제외할 것:
  - 산호/돌 등 신규 prop 타입 자체의 신설 (구조만 준비, 실제 prop은 별도 스펙)
  - 이슈 #14의 우측 하단 버튼 위젯 클러스터 구현 (별도 스펙에서 다룸)
  - 다중 선택 편집
  - 키보드 단축키

## 사용자 흐름

1. 사용자는 우측 상단 `aquarium-status` 패널의 물고기 목록에서 편집 대상 물고기의 **편집 버튼(✏️)** 을 누른다.
2. 화면 좌하단(또는 편집 대상 근처)에 **`prop-panel`** 이 등장한다.
   - 패널 헤더에는 대상 물고기의 미리보기 썸네일과 이름이 표시된다.
   - 닫기 버튼(❌)이 우상단에 표시된다.
3. 사용자는 패널 내부에서 다음을 조작한다:
   - **이름** 입력
   - **크기** 슬라이더 (🐠 ──●── 🐳)
   - **방향** 토글 (◀ 왼쪽 / 오른쪽 ▶)
   - **움직임** 체크박스 토글 (켜짐 ✅ / 꺼짐 ⬜)
   - **반전 X / 반전 Y / 초기화** 액션 버튼
   - **▼ 고급 설정** 펼치면 회전/스케일 X/Y 슬라이더
4. 모든 변경은 즉시 캔버스에 반영되고 `localStorage`에 저장된다.
5. 사용자가 닫기 버튼을 누르거나 다른 물고기의 편집 버튼을 누르면 패널이 닫히거나 대상이 전환된다.

## UI/상태 요구사항

### 필요한 화면 요소

#### 패널 컨테이너 `.prop-panel`

- 위치: `bottom: 18px; left: max(18px, calc((100vw - 1120px) / 2 + 18px))`
  - 이슈 #14의 우측 하단 버튼 위젯 클러스터와 충돌 회피
- 너비: `min(320px, calc(100vw - 32px))`
- 배경: `var(--color-surface-soft)`
- 라운드: `var(--radius-xl)` (24px)
- 그림자: `0 12px 32px rgba(10, 10, 10, 0.06)`
- z-index: 10

#### 패널 헤더 `.prop-panel-header`

- 좌측: 대상 미리보기 썸네일(48×36px) + 대상 이름(body 사이즈, semi-bold) + 타입 배지(`fish` / `coral` / `rock`)
- 우측: 닫기 버튼 (둥근 44×44px, ❌ 이모지, 툴팁 "닫기")

#### 컨트롤 그룹

| 그룹 | 컨트롤 | 데이터 속성 |
|------|--------|------------|
| 이름 | text input (maxlength 40) | `data-edit-prop-name` |
| 크기 | range slider (60–220, step 5), 양 끝 🐠/🐳 아이콘, 현재값 표시 | `data-edit-prop-size` |
| 방향 | 2-column 토글 버튼 (44px 높이) | `data-edit-prop-head-direction` |
| 움직임 | 체크박스 + 라벨 형태 토글 | `data-edit-prop-movement` |
| 액션 | 둥근 이모지 버튼 3종 (44×44px) | `data-flip-prop`, `data-flip-prop-y`, `data-reset-prop-transform` |
| 고급 설정 | `<details>` 아코디언 (기본 접힘) 내부 회전/스케일 X/스케일 Y 슬라이더 | `data-edit-prop-rotation`, `data-edit-prop-scale-x`, `data-edit-prop-scale-y` |

#### 디자인 토큰 준수 사항

- 모든 인터랙티브 요소는 **최소 44×44px** 터치 타겟.
- 슬라이더 핸들: 28×28px 원형, `var(--color-brand-pink)`.
- 토글 버튼 선택 상태: `var(--color-brand-pink)` 배경 + 흰 텍스트.
- 모든 액션 버튼은 둥근 형태 + 이모지 + `title` 속성 툴팁 (이슈 #14 패턴).

### 필요한 상태

`appState` 확장:

```js
appState.editingTarget = null;
// 예시: { id: 'uuid-123', type: 'fish' }
// 향후: { id: 'uuid-456', type: 'coral' }

appState.isPropPanelExpanded = true;
// 고급 설정 접힘 여부는 패널 내부에서 <details> open 속성으로 관리
```

기존 `appState.editingFishId` 는 제거하고 `editingTarget` 으로 일원화한다.

### 오류 또는 빈 상태

- `editingTarget` 이 `null` 일 때 패널 자체를 렌더링하지 않는다.
- `editingTarget.id` 에 해당하는 대상이 사라진 경우(삭제 등) 자동으로 `editingTarget = null` 처리하고 패널을 닫는다.
- 대상 타입에 해당하는 렌더러가 없을 경우 "지원되지 않는 타입입니다" 메시지를 표시한다.

## 구현 메모

### 관련 파일

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `src/features/prop-panel/index.js` | 신규 | 내보내기 + `bindPropPanelEvents` |
| `src/features/prop-panel/state.js` | 신규 | 패널 관련 헬퍼 (`createInitialPropPanelState`, `setEditingTarget` 등) |
| `src/features/prop-panel/view.js` | 신규 | `renderPropPanel(target, aquarium)` — 타입별 분기 |
| `src/features/prop-panel/fish-props.js` | 신규 | `renderFishProps(fish)` — 기존 `renderFishEditor` 이전 |
| `src/features/prop-panel/events.js` | 신규 | 편집 이벤트 바인딩 (현재 `main.js:589-722` 추출) |
| `src/main.js` | 수정 | `renderFishEditor` 제거, `renderFishList` 에서 인라인 편집 패널 제거, `prop-panel` 렌더링 추가, `editingFishId` → `editingTarget` 마이그레이션 |
| `src/styles/components.css` | 수정 | `.prop-panel`, `.prop-panel-header`, `.prop-panel-body`, `.prop-toggle`, `.prop-action-btn` 스타일 추가. 기존 `.fish-editor` 스타일은 prop-panel 내부 컨텍스트로 이전 |
| `src/styles/components.css` | 수정 | 물고기 목록 아이템에서 `.fish-editor` 슬롯 제거 후 정리 |

### `ARCHITECTURE.md` 기준

- `src/features/` 하위 신규 피처 디렉토리 추가는 기존 컨벤션과 일치한다(예: `fish-input/`, `feeding/`).
- `state.js` / `view.js` / `events.js` / `index.js` 4-파일 패턴 유지.
- 신규 prop 타입 추가 시 `<type>-props.js` 파일을 추가하고 `view.js` 의 분기 테이블에 등록하는 방식으로 확장한다.

### 확장성 설계

`renderPropPanel` 내부 분기:

```js
const PROP_RENDERERS = {
  fish: renderFishProps,
  // coral: renderCoralProps,  // 향후
  // rock:  renderRockProps,   // 향후
};

function renderPropPanel(target, aquarium) {
  const renderer = PROP_RENDERERS[target.type];
  if (!renderer) return renderUnsupportedProp(target);
  const entity = findEntityByTarget(aquarium, target);
  return renderPanelShell(entity, target.type, renderer(entity));
}
```

이벤트 바인딩도 동일한 분기 구조로 작성한다.

### 이슈 #14 와의 관계

- 이슈 #14 의 우측 하단 버튼 위젯 클러스터(Feed / Add Fish / Cleaning / GodMode)는 별도 스펙에서 다룬다.
- 본 스펙은 그 위젯 클러스터의 **둥근 이모지 버튼 + 툴팁** 디자인 언어를 prop-panel 내부 액션 버튼에 선제 적용하여 시각적 일관성을 확보한다.
- prop-panel 의 화면 위치(좌하단)는 우측 하단 클러스터와 충돌하지 않으며, 향후 좌하단에 별도 위젯이 추가될 경우 재배치한다.

## 검증 기준

- [ ] 물고기 목록의 편집 버튼(✏️) 을 누르면 좌하단에 `prop-panel` 이 나타난다.
- [ ] 패널의 닫기 버튼(❌) 을 누르면 패널이 닫히고 `appState.editingTarget` 이 `null` 이 된다.
- [ ] 다른 물고기의 편집 버튼을 누르면 패널이 새 대상으로 전환된다.
- [ ] 이름/크기/방향/움직임/회전/스케일 변경이 캔버스에 즉시 반영되고 `localStorage` 에 저장된다.
- [ ] 반전 X / 반전 Y / 초기화 버튼이 정상 동작한다.
- [ ] 모든 인터랙티브 요소는 최소 44×44px 터치 타겟을 만족한다.
- [ ] 모든 액션 버튼에 `title` 속성 툴팁이 있다.
- [ ] 고급 설정 아코디언이 기본 접힘 상태이며 펼치기/접기가 동작한다.
- [ ] 편집 중인 물고기를 삭제해도 콘솔 오류 없이 패널이 자동으로 닫힌다.
- [ ] 모바일 폭(≤ 760px)에서 패널이 화면을 벗어나지 않는다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm run lint` 와 `npm run test` 가 통과한다.
- [ ] `npm run build` 가 통과한다.
