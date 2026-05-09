# S-021 Default Objects 프리셋 갤러리

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- `docs/draft/extracted-fish/` 리소스를 정식 자산으로 옮기고, 사용자가 별도 이미지 업로드/그리기 없이도 어항을 채울 수 있도록 **기본 오브젝트(Default Objects) 프리셋 갤러리**를 제공한다.
- 프리셋은 `fish`(움직이는 물고기)와 `deco`(고정 장식)로 명확히 구분되어 노출된다.
- "기본 설정을 불러온다"는 개념을 UX의 1급 기능으로 두어, 프리셋 카드를 한 번 클릭하면 일반 Prop으로 복사 등록되어 어항에 즉시 등장한다.
- 등록 이후에는 사용자 직접 등록 Prop과 동일하게 prop-panel에서 수정/삭제/타입 전환이 가능하다.

## 범위

- 포함:
  - 자산 이전: `docs/draft/extracted-fish/*.png` → `src/assets/default-objects/fish/`, `src/assets/default-objects/deco/`로 분리 배치.
  - 카탈로그 manifest(`src/assets/default-objects/manifest.js`) 정의: `id`, `type`, `name`, `spriteUrl`, `defaultSize`, `defaultMovementEnabled` 등을 export.
  - 분류 규칙: 파일명이 `deco-`로 시작하면 `deco`, 그 외는 `fish`. manifest 빌드 시 검증한다.
  - 오브젝트 추가 패널(현 fish-input 또는 후속 prop-input)에 **"Default Objects"** 섹션 추가. 기존 업로드/그리기 영역 위에 배치한다.
  - 카드 그리드 UI: fish/deco 탭 또는 그룹 헤더로 시각적 분리, 각 카드에 썸네일 + 이름 + 타입 배지.
  - 카드 클릭 시 즉시 등록: manifest 항목을 일반 Prop으로 복사하여 `addFishToAquarium`(혹은 후속 `addPropToAquarium`)에 전달. 어항 위 임의 위치에 배치한다.
  - deco 등록 시 movement 루프, 배고픔/먹이 반응에서 제외(S-020 분류 결과 재사용).
  - 등록 후 prop-panel이 자동으로 열리지 않고 토스트성 안내(또는 fish-list 강조)로 등록 사실만 알린다(연속 등록 흐름 보장).
- 제외:
  - 신규 어항 자동 시드(별도 스펙으로 분리, S-022 후보).
  - 사용자가 만든 Prop을 다시 카탈로그로 저장하는 기능.
  - 카탈로그 다국어/태그/검색 필터.
  - 카탈로그 항목별 사이즈/속도 프리셋 조정 UI(현재는 manifest 고정값 사용).
  - 서버 동기화, asset 업로드.

## 사용자 흐름

1. 사용자가 하단 액션 클러스터에서 "오브젝트 추가" 버튼을 누른다.
2. 패널이 열리면 상단에 **Default Objects** 섹션이 보인다. fish 그룹과 deco 그룹이 가로 스크롤 카드 그리드로 나뉘어 있다.
3. 사용자가 원하는 카드를 클릭한다.
4. 해당 프리셋이 일반 Prop으로 복사되어 어항에 즉시 추가되고, fish-list 항목이 추가되며 잠깐 강조된다.
5. 사용자는 패널을 닫지 않고 다른 카드를 추가로 클릭해 연속 등록할 수 있다.
6. 등록된 오브젝트는 사용자가 직접 등록한 Prop과 똑같이 prop-panel에서 이름/이동 여부/타입(fish↔deco)을 변경하거나 삭제할 수 있다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - "Default Objects" 섹션 헤더, 짧은 설명 한 줄("기본 제공 오브젝트를 클릭해서 어항에 추가하세요").
  - fish 그룹: 6개 카드(blue-puffer-fish, long-blue-fish, nimo, orange-squid, red-round-fish, shark).
  - deco 그룹: 5개 카드(deco-1 ~ deco-5).
  - 카드 구조: 96px 정도의 정사각 썸네일, 이름, 타입 배지(`fish`/`deco`), hover/focus 상태.
  - 등록 직후 fish-list 해당 항목 1.2초 강조 애니메이션(또는 텍스트 토스트). 둘 중 하나로 결정한다.
- 필요한 상태:
  - 카탈로그 manifest는 정적(런타임 변경 없음). 모듈 로드시 1회 import.
  - 패널 상태에 카탈로그 관련 추가 상태는 두지 않는다(클릭 즉시 등록 후 끝).
  - 기존 draft(사용자 업로드/그리기) 상태와 카탈로그 등록 흐름은 서로 영향 없음.
- 오류 또는 빈 상태:
  - manifest가 비어 있으면 섹션 자체를 숨긴다.
  - 카드 이미지 로드 실패 시 placeholder(회색 박스 + 이름)로 대체하고 클릭은 비활성화한다.

## 구현 메모

- 자산 이전:
  - 새 위치: `src/assets/default-objects/fish/*.png`, `src/assets/default-objects/deco/*.png`.
  - 기존 `docs/draft/extracted-fish/` 안의 PNG는 본 스펙 구현 시 새 위치로 이동(또는 복사 후 정리)한다. draft 폴더 자체는 다른 자료가 있을 수 있으므로 폴더 단위 삭제는 하지 않는다.
- manifest 형식 예시(JS, Vite `?url` import):
  - `export const DEFAULT_OBJECTS = [{ id: 'nimo', type: 'fish', name: 'Nimo', spriteUrl, defaultSize: 120, defaultMovementEnabled: true }, ...]`
  - deco 항목은 `defaultMovementEnabled: false` 고정.
- 분류 검증: manifest 작성 시 단위 테스트 1개로 "deco-로 시작하면 type === 'deco'", "그 외 type === 'fish'", "id 중복 없음"을 검사한다.
- 카드 → Prop 변환:
  - 카드 클릭 시 manifest 항목 + 새 id + 위치(랜덤) + draft 메타데이터를 합쳐 기존 draft 등록 함수를 그대로 호출한다.
  - sprite 데이터는 PNG URL을 그대로 사용하거나, 일관성을 위해 fetch → dataURL 변환 후 사용. 둘 중 하나를 결정해 구현 메모를 좁힌다(권장: 첫 등록 시 dataURL 변환 후 캐시, 이후는 캐시 사용).
- 관련 파일(예상):
  - 신규: `src/assets/default-objects/manifest.js`, `src/features/default-objects/catalog.js`(카드 → Prop 변환), `src/features/default-objects/view.js`(카드 그리드 렌더), `src/styles/components/default-objects.css`.
  - 수정: `src/features/fish-input/view.js`(섹션 mount), `src/features/fish-input/index.js`(연속 등록 시 패널 열림 유지), `src/main.js`(필요 시 wiring), `src/styles/index.css`(새 CSS import), `ARCHITECTURE.md`(default-objects feature 추가), `SPEC.md`(본 스펙 등록).
- `ARCHITECTURE.md` 기준으로 새 디렉터리: `src/features/default-objects/`, `src/assets/default-objects/`.

## UX/UI 설계 노트

- 섹션 배치 우선순위(상→하): Default Objects → Image Upload → Draw Canvas → Name/Movement/Register.
  - 근거: "기본 설정을 불러오는" 흐름이 가장 빠른 onboarding이므로 최상단.
- 카드 그리드:
  - 모바일/좁은 폭: 가로 스크롤 1행. 데스크톱: 2~3행 wrap.
  - fish/deco 그룹은 작은 헤더(`Fish`, `Decoration`)로 분리. 탭 전환은 도입하지 않음(11개 정도라 스크롤이 단순).
- 인터랙션:
  - hover/focus 시 카드 가장자리에 outline + 살짝 들어올림.
  - 클릭 직후 카드에 200ms 펄스 애니메이션으로 등록 완료 피드백.
  - 키보드: Tab 이동 + Enter/Space 등록 가능.
- 시각적 구분(타입 경계):
  - fish 카드 배지: 푸른 톤. deco 카드 배지: 모래/녹색 톤.
  - deco 썸네일 배경에 약한 모래 그라데이션을 깔아 "바닥 장식"임을 시사.
- 빈 어항 빈 상태(추가 제안):
  - 어항이 비어 있고 fish-list가 비어 있을 때 어항 위에 옅은 안내 오버레이 "Default Objects에서 시작해보세요"를 띄우고, 클릭 시 패널이 열린다(별도 스펙 가능, 본 스펙에서는 hook 지점만 기록).

## 직관성/충돌 점검 및 개선안

### 발견된 충돌

1. **Prop 타입 인프라 미구현 (Blocker)**
   - SPEC 문서상 S-020 prop-type-classification은 done처럼 보이지만, 실제 코드(`src/features/aquarium/fish-actions.js`, `model.js`)에는 `type` 필드가 없고 movement/feeding 루프에 deco 분기도 없다. `aquarium.fishes` 배열 단일.
   - S-021의 "deco는 movement/feeding 루프에서 무시" 요구는 인프라 없이 충족 불가.
   - **개선**: 본 스펙을 두 단계로 분할한다.
     - **S-021a (선행, 인프라)**: model에 `type: 'fish' | 'deco'` 추가, `addPropToAquarium(aquarium, draft, type)`, fish-list/movement/feeding이 type으로 필터링, prop-panel의 deco 편집기 최소 폼(이름/위치/크기/삭제만).
     - **S-021b (본 스펙)**: 카탈로그 manifest + 갤러리 UI. S-021a 완료 전제.
2. **fish-input 패널 명칭/아이콘이 fish 전용**
   - 현재 `Add fish image`, 🐠 아이콘, "Fish name" 라벨. 같은 패널에서 deco를 등록하면 명백히 어색.
   - **개선**: S-021a에서 `Add object`(또는 `오브젝트 추가`) + 중립 아이콘으로 변경. "Fish name" → "Object name". 사용자 직접 등록 흐름에 fish/deco 타입 토글을 추가하여 일관성을 맞춘다.
3. **등록 후 자동 prop-panel 열림 동작 충돌**
   - `main.js:214` 의 `onRegister`는 등록 즉시 prop-panel을 연다. 본 스펙은 카탈로그에서 "연속 등록"을 권장.
   - **개선**: 카탈로그 클릭 등록은 prop-panel을 열지 않고 fish-list 항목 강조(1.2초)만 한다. 직접 업로드/그리기는 기존 동작 유지(한 번에 한 마리 등록 흐름이 자연스러움).
4. **fish-input draft localStorage 오염 위험**
   - 카탈로그 등록 흐름이 같은 `onRegister` 콜백을 그대로 쓰면 `saveFishDraft`가 호출되어 사용자가 작업 중이던 draft가 카탈로그 항목으로 덮인다.
   - **개선**: 카탈로그용 별도 등록 경로(`registerCatalogProp`)를 둔다. draft 저장 단계 생략, 바로 `addPropToAquarium`만 호출.
5. **카드 그리드를 fish-input 패널 내부에 두면 화면이 길어짐**
   - fish-input은 드래그 가능한 부동 패널이고 이미 업로드/그리기/이름/움직임/미리보기가 들어있다. 카드 11장 + 그룹 헤더가 더해지면 패널이 화면을 가린다.
   - **개선(권장)**: 액션 클러스터에 "Default Objects" 별도 진입점(예: 🎁 버튼)을 추가하고, 클릭 시 전용 갤러리 모달/패널을 연다. 직관성↑, 코드 결합도↓. fish-input과는 독립.
   - 대안: fish-input 패널 내부 collapsible 섹션(기본 접힘). 진입은 한 번에 모이지만 패널이 무거워진다.
6. **위치 결정: 같은 카드 빠르게 두 번 클릭 시 동일 lane에 겹침**
   - `createFishFromDraft`는 `index % 5` 로 lane 계산. 카탈로그 연속 클릭은 사고로 발생할 가능성도 큼.
   - **개선**: 등록 직전 200ms 디바운스 또는 동일 카드 연타 방지. 위치는 화면 안 랜덤 좌표(여백 고려)로 분산. deco는 y 좌표를 바닥 근처(예: 75~92%)로 클램핑.
7. **이름 중복**
   - 같은 카드를 두 번 등록하면 `Nimo` 두 마리. 어린이 사용자가 fish-list에서 구분 어려움.
   - **개선**: 두 번째부터 자동 suffix `Nimo (2)`. 단순 카운트는 fish-list에서 동일 base name 개수로 결정.
8. **localStorage / 번들 크기**
   - PNG 11개를 dataURL로 저장하면 사용자가 모두 등록 시 수 MB 차지. localStorage 5~10MB 한도에 영향.
   - **개선**:
     - 카탈로그 PNG는 `import.meta.glob('./fish/*.png', { query: '?url', eager: true })`로 URL만 보유.
     - 사용자가 카드 클릭 시점에만 fetch → 240×160 PNG로 리사이즈(기존 fish-input 파이프라인 재사용) → dataURL 1회 변환 → 메모리 캐시(같은 카드 재등록 시 캐시 재사용). 어항에는 dataURL 저장(기존과 동일).
9. **deco에 부여되는 fish 전용 필드 다수**
   - `createFishFromDraft`는 `movementStatus`, `wavingFrequency`, `preferredDepth` 등 fish 전용 필드를 채움. deco에 그대로 들어가면 의미 없는 데이터가 storage에 누적된다.
   - **개선**: S-021a에서 `createPropFromDraft(draft, type, index)`로 통합하고 type별로 필드 세트를 분리. deco는 `{ id, type, name, imageUrl, x, y, size, rotation, scaleX, scaleY, hidden, createdAt }` 만.
10. **manifest의 `defaultMovementEnabled` 고정값 의도**
    - shark, squid 같은 큰 fish는 등장 직후 너무 빨라 보일 수 있음.
    - **개선**: manifest 항목별 `defaultSize`, `defaultSpeedMultiplier`(선택)을 둬서 항목별 톤 차이를 둔다. deco는 `defaultMovementEnabled: false` 고정.
11. **빈 어항 hook 지점 표현 모호**
    - 본 스펙은 "별도 스펙 가능" 으로만 적었다.
    - **개선**: 빈 상태 onboarding은 본 스펙에서 명시적 out-of-scope로 두고, 진입점만 `#aquarium-empty-cta`처럼 future-hook 셀렉터를 예약 정의.
12. **접근성/연속 등록 키보드 흐름**
    - Tab → Enter 등록은 좋지만, Enter 후 포커스가 사라지면 다음 카드로 이동 어렵다.
    - **개선**: Enter 등록 직후 같은 카드에 포커스 유지. Esc로 패널/모달 닫기.
13. **SPEC ID 중복(부수 발견)**
    - `docs/spec/S-020-adr-lrn-kb-harness.md`와 `docs/spec/S-020-prop-type-classification.md` 가 동일 ID를 가진다. 인덱스에는 전자만 등록.
    - **개선(범위 밖)**: prop-type-classification 문서는 새 ID(예: S-014 또는 S-022)로 리넘버링. 본 스펙과 별도 PR.

### 개선안 요약 (의사결정 필요 항목)

| 항목 | 권장안 | 대안 |
| --- | --- | --- |
| 분할 | S-021a 인프라 + S-021b 갤러리 | 단일 스펙 유지 |
| 진입점 | 액션 클러스터에 별도 🎁 버튼 → 갤러리 모달 | fish-input 내부 collapsible 섹션 |
| 등록 후 동작 | prop-panel 자동 오픈 X, fish-list 항목 강조만 | 토스트 메시지만 |
| 이미지 처리 | 클릭 시 fetch → 리사이즈 → 메모리 캐시 | eager dataURL 사전 변환 |
| 이름 충돌 | 자동 `(2)` suffix | 무처리 |
| deco 위치 | 바닥 75~92% y 클램프 | 사용자 수동 배치만 |

## 검증 기준

- [ ] `src/assets/default-objects/` 아래 fish 6개, deco 5개 PNG가 존재한다.
- [ ] manifest 단위 테스트가 분류 규칙(deco prefix → deco)과 id 중복 없음을 통과한다.
- [ ] 오브젝트 추가 패널에 Default Objects 섹션이 보이고, fish 그룹과 deco 그룹이 시각적으로 구분된다.
- [ ] fish 카드 클릭 시 어항에 움직이는 물고기가 등장하고 fish-list에 항목이 생긴다.
- [ ] deco 카드 클릭 시 어항에 고정 장식이 등장하고, movement/feeding 루프에서 무시된다.
- [ ] 등록 후에도 패널이 열려 있어 연속 등록이 가능하다.
- [ ] 등록된 오브젝트는 prop-panel에서 일반 Prop과 동일하게 수정/삭제/타입 전환이 가능하다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 모두 통과한다.
