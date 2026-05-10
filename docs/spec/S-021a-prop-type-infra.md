# S-021a Prop 타입 인프라 실구현

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 데이터 모델/등록 파이프라인/렌더 루프에 `type: 'fish' | 'deco'` 분기를 실제 코드에 도입한다.
- 사용자 직접 등록 패널(현 fish-input)을 fish/deco 모두 다루는 "오브젝트 추가" 패널로 일반화한다.
- 후속 스펙 S-021b(Default Objects 갤러리)가 의존할 수 있는 단단한 타입 경계를 만든다.
- 기존 fish 동작과 데이터에 회귀가 없어야 한다(이미 등록된 어항/물고기는 그대로 동작).

## 범위

- 포함:
  - `aquarium.fishes` 항목에 `type: 'fish' | 'deco'` 필드 추가. 누락된 기존 데이터는 마이그레이션 시 `'fish'`로 보정.
  - `createFishFromDraft` → `createPropFromDraft(draft, type, index)`로 일반화. type별 필드 세트 분리:
    - fish: 기존 모든 필드.
    - deco: `{ id, type, name, imageUrl, x, y, size, rotation, scaleX, scaleY, flipped, flippedY, hidden, createdAt }` 만.
  - `addFishToAquarium` → `addPropToAquarium(aquarium, draft, type)`. 기존 호출부는 type='fish'로 고정 호출하는 얇은 wrapper로 일시 유지하거나 일괄 교체.
  - movement/feeding/hunger 루프에 `type === 'fish'` 필터링 추가:
    - `fish-movement/index.js`, `feeding/*`에서 deco는 무시.
    - 청소/이끼는 영향 없음(어항 단위).
  - fish-list가 fish/deco 모두를 노출하되 항목에 타입 배지를 붙인다. 편집/감추기/삭제 동작은 동일.
  - prop-panel에 deco 전용 최소 편집기(`deco-props.js`):
    - 이름, 크기, 위치(드래그는 기존 인프라 재사용), 반전 X/Y, 삭제만. 움직임/방향 토글 없음.
  - prop-panel 헤더의 type 토글 버튼: `fish ↔ deco` 즉시 전환(움직임 필드 등은 전환 시 보정).
  - fish-input 패널 일반화:
    - 헤더 명칭: `Add fish image` → `Add object`(한국어 UI는 `오브젝트 추가`).
    - 헤더 아이콘 🐠 → 중립 아이콘(예: 🧩).
    - 라벨: `Fish name` → `Object name`.
    - 타입 선택 라디오/세그먼트(`Fish` / `Decoration`) 추가. 기본 `Fish`.
    - `data-fish-*` 속성은 호환성 유지를 위해 한 번에 `data-prop-*`로 일괄 리네임 — 외부 연결은 `events.js`에서 함께 갱신.
- 제외:
  - Default Objects 카탈로그/갤러리 UI(S-021b).
  - 다중 선택 편집, 레이어 순서.
  - 산호/돌 등 추가 deco subtype.
  - 서버 저장.

## 사용자 흐름

1. 사용자가 `오브젝트 추가` 버튼을 누른다.
2. 패널 상단의 타입 세그먼트에서 `Fish`(기본) 또는 `Decoration`을 고른다.
3. 이미지 업로드/그리기 + 이름 입력 후 `Register`를 누른다.
4. 선택한 타입에 맞춰 어항에 등록되고 prop-panel이 열린다(기존 동작 유지). deco는 움직임 컨트롤이 없는 deco 편집기로, fish는 기존 fish 편집기로 분기된다.
5. fish-list 항목에는 이름 옆에 `fish` 또는 `deco` 배지가 표시된다.
6. prop-panel 헤더의 타입 토글로 등록 후에도 fish↔deco 전환 가능.

## UI/상태 요구사항

- 필요한 화면 요소:
  - fish-input 헤더 명칭/아이콘 변경, 타입 세그먼트 컨트롤.
  - fish-list 항목 타입 배지(텍스트 + 색상). fish=파랑 톤, deco=모래/녹색 톤.
  - prop-panel 헤더의 type 토글 버튼.
  - deco-props 폼: 이름/크기/반전/삭제만.
- 필요한 상태:
  - `appState.propPanel.editingTarget.type` 은 이미 존재. deco 분기만 추가.
  - `aquarium.fishes[i].type` 신규.
  - fish-input 패널 draft 상태에 `type: 'fish' | 'deco'` 추가. localStorage draft 키는 그대로 두되 schema에 type 추가.
- 오류 또는 빈 상태:
  - 마이그레이션 후에도 type이 없는 항목은 안전하게 `'fish'`로 채운다.
  - 알 수 없는 type은 fish로 폴백하고 콘솔 경고.

## 구현 메모

- 관련 파일(예상):
  - 수정: `src/features/aquarium/model.js`(타입 마이그레이션 + 필드 정규화), `src/features/aquarium/fish-actions.js`(이름 일반화), `src/features/fish-input/{state,view,index}.js`(타입 세그먼트, 라벨/아이콘), `src/features/fish-list/view.js`(배지), `src/features/fish-movement/index.js`(필터), `src/features/feeding/state.js`(필터), `src/features/prop-panel/{view,events,index}.js`(deco 분기 + 타입 토글), `src/main.js`(호출 명칭 갱신), `src/styles/components/fish.css` 또는 `panels.css`(배지 스타일).
  - 신규: `src/features/prop-panel/deco-props.js`.
  - 테스트: `model.test.js`/`fish-actions.test.js`에 deco 분기 케이스 추가, `fish-input/state.test.js`에 type 포함 케이스 추가, movement/feeding 필터링 단위 테스트.
- `ARCHITECTURE.md` 갱신: `src/features/prop-panel/deco-props.js` 항목 추가, fish-input의 책임 일반화 메모.
- 데이터 호환성:
  - localStorage `aquarium-v1` 등 기존 키는 유지. 로드 시 type 누락이면 `'fish'` 보정 후 저장하지 않고 메모리에서만 보정 → 다음 저장 시 자동 영속.
  - 사용자 직접 등록 draft 키도 유사 처리.
- 부수 정리(범위 밖이지만 함께 권장): `docs/spec/S-020-prop-type-classification.md` 의 ID 중복 → 별도 PR에서 리넘버링.

## 검증 기준

- [ ] 기존 어항/물고기 데이터로 앱을 켜도 회귀 없이 동작한다(fish 이동/먹이/청소).
- [ ] 사용자 직접 등록 흐름에서 fish/deco를 모두 등록할 수 있고, 등록 후 prop-panel이 타입에 맞게 분기된다.
- [ ] deco는 움직임/먹이/배고픔 루프에서 무시된다(deco 위치/회전이 변하지 않음).
- [ ] fish-list 항목에 타입 배지가 보이고, prop-panel 헤더의 타입 토글로 등록 후 전환할 수 있다.
- [ ] 마이그레이션: 저장된 데이터에 type 누락 시 fish로 자동 보정되며 콘솔 오류가 없다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 모두 통과한다.
