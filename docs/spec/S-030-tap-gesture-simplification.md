# S-030 단일 탭 → prop-panel 자동 + Long-press 드래그

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 현재 분리된 "선택(select)"과 "편집(edit)" 두 상태를 통합한다 — 터치 사용자가 한 번의 탭으로 prop-panel을 열 수 있다.
- 드래그(현재 마우스/터치 즉시 드래그) 발견성을 long-press + 햅틱으로 명확히 한다.
- pinch(두 손가락)로 크기 조절을 지원해 prop-panel slider와 동기화한다.

## 범위

- 포함할 것:
  - `is-selected` 상태 폐기. 단일 탭 → `editingTarget` 설정 + prop-panel 자동 렌더.
  - 어항 빈 영역 탭 → `editingTarget = null` + prop-panel 닫기.
  - 스프라이트 long-press(500ms) → 드래그 모드 진입, 햅틱 medium 발화.
  - 두 손가락 pinch → `size` 업데이트, prop-panel slider 실시간 반영.
  - 첫 탭 후 4초 토스트 "꾹 눌러 옮기기" (1회만, localStorage flag).
- 제외할 것:
  - Swipe down으로 prop-panel 닫기 → **S-029**의 sheet 변경 후 별도 작업.
  - prop-panel을 sheet화 → **S-029**와 별도 후속.

## 사용자 흐름

1. 사용자가 어항 안 물고기를 탭한다.
2. 물고기 outline 표시 + 좌측 prop-panel 열림.
3. 첫 사용 시 4초 토스트 "꾹 눌러 옮길 수 있어요" 노출.
4. 사용자가 같은 물고기를 0.5초 이상 누르면 햅틱과 함께 드래그 모드 진입, 손을 떼면 그 위치에 고정.
5. 사용자가 두 손가락으로 물고기를 잡고 벌리면 크기가 증가, 좁히면 감소, prop-panel slider도 같이 움직임.
6. 어항 빈 곳을 탭하면 outline·prop-panel 모두 사라짐.

## UI/상태 요구사항

- 필요한 화면 요소:
  - long-press 토스트(상단 또는 sprite 근처).
  - 드래그 활성 시 cursor 변경(`grabbing`).
- 필요한 상태:
  - `appState.selectedFishId` 폐기(또는 `editingTarget.id`로 통합).
  - `appState.longPressHintShown: boolean` (localStorage 동기화).
  - drag/pinch 임시 상태(release 시 commit).
- 오류 또는 빈 상태:
  - 드래그가 어항 경계를 벗어나면 기존 boundary clamp 재사용.

## 구현 메모

- 관련 파일:
  - `src/features/fish-edit/drag.js` — long-press 게이트 추가, pinch handler 신설.
  - `src/features/aquarium/fish-actions.js` 또는 신규 `src/features/fish-edit/pinch.js`.
  - `src/main.js` — 빈 영역 탭 핸들러, `selectedFishId` 제거.
  - `src/features/fish-list/events.js` — list 항목 탭도 동일 흐름으로 정렬.
  - `src/features/sound/haptic.js` — long-press 진입 시 medium 호출.
- pointer event 사용(`pointerdown`/`pointerup`/`pointercancel`) — Pencil 호환.

## 검증 기준

- [ ] 단일 탭으로 prop-panel이 즉시 열린다.
- [ ] long-press 0.5초 후 햅틱과 함께 드래그 가능 상태가 된다.
- [ ] 두 손가락 pinch가 크기 slider와 동기화된다.
- [ ] 어항 빈 곳 탭으로 panel이 닫힌다.
- [ ] "꾹 눌러 옮기기" 힌트는 첫 사용 후 다시 보이지 않는다.
- [ ] 콘솔 오류 없음, `npm run build`/`npm test` 통과.
