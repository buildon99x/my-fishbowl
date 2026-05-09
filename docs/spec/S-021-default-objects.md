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
