# S-033 Dock을 hero에서 grid dock area로 강등

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 현재 `position: fixed`로 어항(hero) 위에 떠 있는 `.prop-action-panel`(dock)이 항상 어항 하단 ~80px를 가리는 문제를 해결한다.
- 어항이 dock 영역만큼 가시 면적을 양보하더라도, **"보이는 영역 100% = 어항"** 원칙을 회복해 fish/이끼/먹이가 dock에 가려지지 않게 한다.
- chrome idle fade(S-032)와 결합했을 때 fade 단계에서 dock이 터치 캡처 자체를 양보하도록 한다.

## 범위

- 포함할 것:
  - `.fishbowl-page` grid에서 `dock` row가 실제 dock 높이를 차지하도록 `.prop-action-panel`을 `position: fixed` → grid `grid-area: dock`로 강등.
  - 어항(hero) 영역의 `max-height`가 자동으로 `100svh - dock - safe area`만큼 줄어들도록 layout 정리.
  - dock idle fade 단계(`body[data-activity="idle"] .prop-action-panel`)에 `pointer-events: none` 추가해 어항 탭이 잘못 dock에 captured되지 않게.
  - ➕ bottom-sheet가 열렸을 때 dock을 함께 hide(또는 시트 안 sticky로 흡수)해 한 번에 한 chrome만 노출.
- 제외할 것:
  - dock을 우측 vertical로 옮기는 안 → 별도 옵션, 본 스펙은 grid area 강등 단일 안만 다룬다.
  - prop-panel 위치 변경 → **S-034** 별도.
  - drawer 단순화 → **S-035** 별도.

## 사용자 흐름

1. 사용자가 앱을 열면 어항은 dock 위 영역에 완전히 들어가고, fish/이끼/먹이가 dock에 가려지지 않는다.
2. dock은 항상 화면 하단에 자기 자리(56–68px)를 가지며 어항과 겹치지 않는다.
3. ➕ 버튼 탭 → bottom-sheet가 peek 단계로 올라올 때 dock은 함께 숨고, 시트 닫힘 시 다시 등장한다.
4. 3초간 입력이 없으면 dock이 페이드(S-032)되며, fade 단계에서는 dock이 터치를 받지 않아 어항 탭이 잘 동작한다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - `.fishbowl-page` grid의 `dock` row에 실제로 자리 잡은 `.prop-action-panel`.
- 필요한 상태:
  - 기존 `fishInputState.sheetStage`만 재사용. 시트 열림 여부에 따라 dock visibility를 CSS attribute selector로 토글.
- 오류 또는 빈 상태:
  - 해당 없음(레이아웃 변경).

## 구현 메모

- 관련 파일:
  - `src/styles/layout.css` — `.fishbowl-page` grid 정의는 이미 `"hero" / "dock"` 2-row. dock row가 0이 아닌 `auto`이고 dock 요소가 실제로 들어가도록.
  - `src/styles/components/panels.css` — `.prop-action-panel` `position: fixed` 제거, `grid-area: dock`, justify-self: center, padding-bottom: `var(--safe-bottom)`.
  - `src/styles/components/polish.css` — `body[data-activity="idle"] .prop-action-panel { pointer-events: none; }` 추가.
  - `src/features/prop-panel/view.js` — `<main class="fishbowl-page"> ... ${renderActionCluster(...)}` 위치가 grid 안에 자연스럽게 들어가도록 정리(이미 안에 있으므로 marker만 확인).
  - `src/main.js`의 `bottom-sheet` 렌더 분기 — 시트 열림 시 `body[data-sheet-open="true"]` data attribute를 toggle하고 CSS에서 `.prop-action-panel { opacity: 0; pointer-events: none; }` 처리.
- 신규 디렉터리 불필요.

## 검증 기준

- [ ] iPad 가로/세로에서 dock 아래 픽셀에 fish/이끼가 그려진 적이 없다(어항 region이 dock 위까지만).
- [ ] dock 영역 자체는 항상 어항과 겹치지 않고 화면 하단에 자기 자리를 차지한다.
- [ ] 3초 idle 시 dock이 페이드되고, 그 상태에서 어항 하단 영역을 탭하면 dock 버튼이 아닌 어항이 받는다.
- [ ] ➕ 시트 peek 시 dock이 사라지고, 시트 닫힘 시 다시 등장한다.
- [ ] `prefers-reduced-motion: reduce` 환경에서 dock visibility 전환이 즉시 발생(transition 0).
- [ ] 콘솔 오류 없음, `npm run build`/`npm test` 통과.
