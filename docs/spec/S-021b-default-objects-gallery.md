# S-021b Default Objects 프리셋 갤러리

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 전제

- **선행 스펙**: S-021a Prop 타입 인프라가 done이어야 한다. 본 스펙은 S-021a의 `addPropToAquarium`, type 분기, fish/deco 필터를 그대로 사용한다.

## 목표

- `docs/draft/extracted-fish/` 리소스를 정식 자산으로 옮기고, 사용자가 별도 업로드/그리기 없이 어항을 채울 수 있는 **Default Objects 프리셋 갤러리**를 제공한다.
- 갤러리는 fish/deco를 명확히 구분하여 노출하고, 카드 클릭 한 번으로 일반 Prop으로 복사 등록한다.
- 등록 흐름은 사용자 직접 등록 흐름과 분리하되, 등록 결과물은 동일한 prop 모델로 통합되어 이후 자유롭게 편집/삭제할 수 있다.

## 범위

- 포함:
  - 자산 이전: `docs/draft/extracted-fish/*.png` → `src/assets/default-objects/fish/`, `src/assets/default-objects/deco/`.
  - 카탈로그 manifest(`src/assets/default-objects/manifest.js`):
    - `id`, `type`, `name`, `spriteUrl`(Vite `?url`), `defaultSize`, `defaultMovementEnabled`(deco는 항상 false), 선택적 `defaultSpeedMultiplier`(fish 전용).
    - 분류 검증(단위 테스트): `deco-`로 시작하는 파일은 `type === 'deco'`, 그 외는 `'fish'`. id 중복 없음.
  - 액션 클러스터에 **별도 진입점**(예: 🎁 버튼) 추가 → 클릭 시 전용 갤러리 모달 오픈. fish-input 패널과 독립.
  - 갤러리 모달 UI:
    - 헤더: 제목 `Default Objects`, 한 줄 설명, 닫기 버튼.
    - fish 그룹 헤더 + 카드 그리드(6장).
    - deco 그룹 헤더 + 카드 그리드(5장).
    - 카드: 96px 정사각 썸네일 + 이름 + 타입 배지(fish=파랑, deco=모래/녹색).
  - 등록 파이프라인(카탈로그 전용, draft localStorage와 분리):
    - 카드 클릭 시 manifest 항목의 `spriteUrl`을 fetch → 240×160 PNG로 리사이즈(기존 fish-input 리사이즈 로직 재사용/공용화) → dataURL 1회 변환 → 메모리 캐시.
    - `addPropToAquarium(aquarium, { name, spriteDataUrl: cached, ...presetMeta }, type)` 호출.
    - **prop-panel 자동 오픈하지 않음**. 대신 fish-list의 새 항목에 1.2초 강조 애니메이션.
  - 위치 결정:
    - fish: 화면 안 랜덤 좌표(여백 12% 이상). lane 충돌 회피.
    - deco: x 랜덤, y는 75~92% 사이로 클램프(바닥 근처).
  - 이름 충돌 처리: 동일 base name이 이미 있으면 `Nimo (2)`, `Nimo (3)` 자동 suffix.
  - 동일 카드 연타 방지: 200ms 디바운스.
  - 접근성:
    - 모달 열기 시 첫 카드에 포커스. Esc로 닫기. 배경 스크롤 잠금.
    - 카드는 Tab 이동 + Enter/Space 등록. Enter 등록 후 같은 카드에 포커스 유지(연속 등록).
- 제외:
  - 신규 어항 자동 시드.
  - 사용자 Prop을 카탈로그로 저장.
  - 카탈로그 다국어/검색 필터/페이지네이션.
  - 카드별 사이즈 조정 UI(manifest 고정값 사용).
  - 카탈로그 항목별 사운드/애니메이션 프리뷰.
  - 빈 어항 onboarding 오버레이(future-hook으로 `#aquarium-empty-cta` 셀렉터만 예약 정의).

## 사용자 흐름

1. 사용자가 액션 클러스터의 🎁 `Default Objects` 버튼을 누른다.
2. 갤러리 모달이 열리고 fish 그룹/deco 그룹이 보인다. 첫 카드에 포커스가 잡힌다.
3. 사용자가 카드를 클릭(또는 Enter)한다.
4. 어항에 해당 오브젝트가 등장하고 fish-list에 항목이 추가되며 1.2초 강조된다. 모달은 닫히지 않는다.
5. 사용자는 다른 카드를 연속으로 클릭해 여러 마리를 추가할 수 있다.
6. 모달을 닫으면 prop-panel/일반 흐름으로 복귀한다. 등록된 오브젝트는 일반 Prop과 동일하게 prop-panel에서 편집/삭제 가능하다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 액션 클러스터 진입점 버튼(🎁, 라벨/툴팁 `Default Objects`).
  - 갤러리 모달 컨테이너(중앙 정렬, 둥근 모서리, 그림자, z-index는 prop-panel 위).
  - 그룹 헤더 2개(`Fish`, `Decoration`).
  - 카드 11개(fish 6 + deco 5).
  - 카드 hover/focus outline + 200ms 등록 펄스.
- 필요한 상태:
  - `appState.galleryOpen: boolean`.
  - 카탈로그 dataURL 캐시는 모듈 스코프 Map(앱 라이프사이클). 영속 X.
  - 카탈로그 등록은 fish-input draft localStorage에 영향을 주지 않는다.
- 오류 또는 빈 상태:
  - manifest가 비면 모달은 "표시할 항목이 없습니다" 안내 후 닫기만 가능.
  - 카드 이미지 로드 실패 시 placeholder + 카드 비활성화. 클릭 시 사용자에게 짧은 오류 토스트.

## 구현 메모

- 관련 파일(예상):
  - 신규: `src/assets/default-objects/{fish,deco}/*.png`, `src/assets/default-objects/manifest.js`, `src/features/default-objects/{index.js,view.js,events.js,catalog.js,catalog.test.js}`, `src/styles/components/default-objects.css`.
  - 수정: `src/features/action-cluster/*` 또는 해당 진입점(🎁 버튼 추가), `src/main.js`(모달 wiring), `src/styles/index.css`(새 CSS import), `ARCHITECTURE.md`(default-objects feature/assets 디렉터리 추가), `SPEC.md`(완료 기록).
  - 공용화: fish-input의 240×160 리사이즈 로직을 `src/lib/spriteResize.js`로 추출하여 fish-input과 default-objects 모두에서 재사용.
- 캐시 전략: `Map<id, dataURL>`. 첫 등록 시 fetch + 리사이즈 + 변환, 이후는 즉시 사용.
- fish-list 강조 애니메이션: 항목 DOM에 `.fish-list-item--just-added` 1200ms 토글. 기존 강조 클래스가 있으면 재사용.
- 위치 계산: 어항 경계의 px → % 좌표 변환을 `aquarium/decoration.js` 또는 신규 헬퍼에서 통일.
- 디바운스: 카드 핸들러에서 `lastClickAt` 비교(요소 단위).

## UX/UI 설계 노트

- 진입점을 fish-input과 분리하는 이유: 카탈로그는 "기본 설정 불러오기" 의도이고, fish-input은 "사용자 자작" 의도다. 의도가 다르면 진입점도 다른 편이 직관적이고, fish-input 패널이 길어지지 않는다.
- 카드 그리드: 데스크톱 4열 wrap, 좁은 폭 2열, 모바일 가로 스크롤 1행. 그룹 헤더 사이 여백으로 fish/deco 경계를 명확히.
- 카드 배지: fish는 파랑 톤(`--color-brand-blue` 등 기존 토큰 우선), deco는 모래/녹색 톤. 색만이 아니라 텍스트(`fish`/`deco`)도 함께 둬서 색약 사용자도 구분 가능.
- 등록 피드백: 모달 내 카드에 200ms 펄스 + 어항 fish-list 항목 1.2초 강조. 토스트는 도입하지 않음(중복 신호).
- 모달 동작: Esc 닫기, 배경 클릭 닫기, 닫기 버튼. 연속 등록 동안 모달은 열린 상태 유지.
- 키보드 흐름: 화살표로 그리드 내 이동(선택), Tab 이동(필수), Enter/Space 등록, Enter 후 포커스 유지.

## 검증 기준

- [ ] `src/assets/default-objects/` 아래 fish 6개, deco 5개 PNG가 존재한다.
- [ ] manifest 단위 테스트가 분류 규칙과 id 중복 없음을 통과한다.
- [ ] 액션 클러스터의 🎁 버튼으로 갤러리 모달이 열린다.
- [ ] fish 카드 클릭 시 어항에 움직이는 물고기가 등장하고 fish-list 항목이 1.2초 강조된다.
- [ ] deco 카드 클릭 시 어항 바닥 근처에 고정 장식이 등장하고 movement/feeding 루프에서 무시된다.
- [ ] 동일 카드 연타 시 200ms 디바운스가 동작하고, 동일 base name 추가 등록은 `(2)`, `(3)` suffix가 붙는다.
- [ ] 카탈로그 등록은 fish-input draft localStorage를 변경하지 않는다.
- [ ] 등록 후 prop-panel은 자동으로 열리지 않는다. prop-panel에서 등록된 오브젝트는 일반 Prop과 동일하게 편집/삭제/타입 전환된다.
- [ ] 카드 이미지 로드 실패 시 placeholder + 클릭 비활성화 + 오류 토스트가 표시된다.
- [ ] 키보드만으로 모달 열기→카드 등록→연속 등록→닫기가 가능하다.
- [ ] 브라우저 콘솔 오류가 없고 `npm test`, `npm run lint`, `npm run build`가 통과한다.
