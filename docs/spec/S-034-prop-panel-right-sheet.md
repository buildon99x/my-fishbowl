# S-034 prop-panel을 우측 사이드 시트로 이전

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 현재 좌상단 `position: fixed`로 떠 있는 `.prop-panel`이 drawer(좌측)와 충돌하고, 어항을 위에서 가려 편집 중인 fish가 보이지 않는 문제를 해결한다.
- prop-panel을 **우측 사이드 시트**로 이전해 좌측 drawer와 zone을 명확히 분리하고, 어항이 좌측 절반 이상은 항상 보이도록 한다.
- 시트 패턴(➕ bottom-sheet, drawer)과 동일한 시각 언어(grabber 없는 슬라이드, backdrop 없음, 외부 탭으로 닫기)를 채택해 인지 비용을 낮춘다.

## 범위

- 포함할 것:
  - `.prop-panel`을 `position: fixed; top: var(--safe-top); right: var(--safe-right); width: min(360px, 92vw); max-height: calc(100svh - var(--safe-top) - var(--dock-height) - var(--dock-bottom) - 24px);` 형태로 우측 고정. 토큰은 S-033에서 정의된 것을 사용.
  - 진입/이탈 transition: `transform: translateX(...)` slide-in 0.22s.
  - `prefers-reduced-motion: reduce` 시 즉시 전환.
  - 좁은 폭(< 600px)에서는 bottom-sheet의 stage로 통합(`.prop-panel`이 시트 컨테이너의 추가 stage로 렌더). 단일 화면에 두 시트가 공존하지 않도록 ➕ 시트와 prop-panel은 **서로 배타**.
  - **선택된 sprite 가시성 보장**: prop-panel이 열렸을 때 편집 대상 sprite가 panel 영역(우측 360px) 뒤로 숨지 않도록 (a) 어항의 fish 이동 가능 영역을 panel 폭만큼 축소하거나 (b) 선택 직후 sprite를 panel 영역 밖으로 1회 nudge한다. 본 스펙은 (b) 채택.
  - **선택 시각 표시**: 선택된 sprite 둘레에 `outline`(`color-mix(in srgb, var(--color-primary) 60%, transparent)`) halo를 추가해 panel과 sprite의 연결을 명확히 한다.
  - **drawer ↔ prop-panel 정책**: 동시 열림 금지. prop-panel을 열 때 drawer가 열려 있으면 drawer를 닫는다(S-035의 row 탭은 이미 drawer를 닫는다).
  - **청소 모드 중**: sprite 탭은 무시(기존 동작 유지). 청소 모드 진입 시 열려 있던 prop-panel은 자동 닫힘.
  - `max-height`를 토큰 기반(`--dock-height`/`--dock-bottom`/`--safe-*`) 계산으로 통일.
- 제외할 것:
  - dock의 grid area 강등 → **S-033** 별도.
  - drawer 안 list 단순화 → **S-035** 별도.
  - prop-panel 내부 컨트롤 재배치(슬라이더 그룹화 등) → 후속.
  - 온보딩(S-023) 포인터의 좌→우 위치 갱신 → 본 스펙 구현 후 S-023 후속 패치로 분리.

## 사용자 흐름

1. 사용자가 어항 안 fish를 탭한다.
2. 화면 우측에서 prop-panel이 슬라이드 인(0.22s)하며, 어항 좌측 절반은 그대로 보인다.
3. 사용자가 size/속도 슬라이더를 움직이면 어항 좌측에 보이는 fish가 실시간으로 반응한다.
4. 다른 fish를 탭하면 prop-panel은 그대로 두고 내용만 교체된다.
5. 어항 빈 곳 탭 또는 prop-panel의 `×` 탭으로 시트가 우측으로 슬라이드 아웃된다.
6. 폭 600px 이하(iPhone, Split View)에서는 prop-panel이 우측 시트가 아닌 bottom-sheet stage로 표시된다. ➕ 시트가 열려있을 때 prop-panel은 열리지 않고, 시트 닫힌 뒤 자연스럽게 열린다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 우측 시트 컨테이너(grabber 없음, 헤더 + body + close 버튼).
  - 좁은 폭에서는 bottom-sheet의 stage 변형(`data-prop-stage`).
- 필요한 상태:
  - 기존 `appState.propPanel.editingTarget` 그대로 사용. 위치/노출은 CSS와 viewport width 분기로 결정.
  - ➕ 시트와의 배타: `fishInputState.isExpanded === true && editingTarget !== null` 동시 발생 시 prop-panel은 보류 또는 ➕ 시트가 자동 닫힘.
- 오류 또는 빈 상태:
  - 편집 대상이 없는 경우 시트 자체가 렌더되지 않음(기존 `if (!target) return ''`).

## 구현 메모

- 관련 파일:
  - `src/styles/components/panels.css` — `.prop-panel` left → right로 변경, max-height 토큰화, transition + transform 추가.
  - `src/styles/components/panels.css` `@media (max-width: 600px)` — `.prop-panel`을 `position: fixed; left: 0; right: 0; bottom: 0;` bottom-sheet 변형으로 전환.
  - `src/features/prop-panel/view.js` — 마크업은 그대로 유지하되 `position` 인라인 style(`positionStyle(pos)`)을 제거. 드래그 이동 기능은 사이드 시트에서 의미 없으므로 deprecate.
  - `src/main.js` — ➕ 시트와 prop-panel의 배타 처리 (sprite 탭 시 `fishInputState.isExpanded === true`면 시트 닫고 prop-panel 열기).
  - `src/features/prop-panel/index.js` — 드래그 기반 위치 저장 코드 정리.
- `ARCHITECTURE.md` 변경 없음.

## 검증 기준

- [ ] iPad 가로에서 prop-panel 오픈 시 어항 좌측 50% 이상이 그대로 보인다.
- [ ] drawer 열림 ↔ prop-panel 열림: drawer가 열려 있으면 prop-panel 열기 시 drawer가 자동 닫힌다.
- [ ] 폭 600px 이하에서 prop-panel이 bottom-sheet stage로 표시된다.
- [ ] sprite 탭으로 prop-panel 열기 → 다른 sprite 탭 → 시트 그대로, 내용만 교체.
- [ ] 우측 panel 뒤에 있던 sprite를 탭해 panel을 열면, sprite가 panel 영역 밖으로 nudge되어 보인다.
- [ ] 선택된 sprite 둘레에 halo가 표시되고 panel 닫힘과 함께 사라진다.
- [ ] 청소 모드 진입 시 열려있던 prop-panel이 자동 닫히고, 청소 모드 중 sprite 탭은 prop-panel을 열지 않는다.
- [ ] `prop-panel` 좌표/`max-height`에 하드코딩된 픽셀이 없다(모두 토큰 기반).
- [ ] `prefers-reduced-motion: reduce`에서 slide transition 비활성.
- [ ] 콘솔 오류 없음, `npm run build`/`npm test` 통과.
