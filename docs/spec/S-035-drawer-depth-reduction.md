# S-035 Drawer 뎁스 축소 — 토글 제거 + 행 액션 단일화

## 상태

- 상태: ready
- 구현 여부: in-progress
- 검증 여부: not-tested

## 목표

- 현재 drawer 진입 후 사용자가 거쳐야 하는 "☰ → 목록 토글 → 행의 ✏️ → prop-panel"의 **4단계 의사결정**을 2단계로 줄인다.
- drawer는 "**보이지 않는 fish 찾기 + 부모 영역 진입점**"으로 역할을 좁히고, 일상적인 편집은 sprite 탭(S-030)으로 안내한다.
- fish-list 각 행의 액션 cluster(선택 / ✏️ 편집 / 감추기 / 삭제) 중복을 정리해 시각 무게를 절반으로 줄인다.

## 범위

- 포함할 것:
  - drawer 안 "오브젝트 목록" 접기/펼치기 토글(`[data-toggle-fish-list]`) 제거. drawer 열림 = 목록 펼침으로 1:1 매칭.
  - `appState.isFishListCollapsed` 상태 제거(또는 default true로 고정).
  - fish-list 행에서 `✏️ 편집` 버튼 제거. 행 자체 탭이 prop-panel 진입(S-030에서 이미 row 탭=편집 통합).
  - "감추기 / 삭제" 액션은 **행 우측 swipe 또는 long-press 메뉴**로 격리(또는 행 우측 inline 아이콘 2개로 축소). 본 스펙은 단순화: long-press 메뉴 + 우측 아이콘 2개 유지 안 중 **inline 2 icon** 채택.
  - 4세 어린이 오탭 보호: 🗑 탭 시 즉시 삭제하되 **5초 undo snackbar**("되돌리기")를 화면 하단에 표시. snackbar 영역은 dock 위 8px gap, `role="status"`.
  - inline icon 정량 기준: 각 아이콘 hit area 44×44px 이상, 두 아이콘 사이 간격 ≥ 12px(4세 어린이 손가락 평균 폭 대응).
  - drawer 닫힘 ↔ prop-panel 열림: 같은 duration(0.22s) **동시 진행**. 한쪽이 끝난 후 다른 쪽이 시작하지 않도록 동기화.
  - drawer footer에 "🐟 화면에 없는 친구 찾기" 헬프 라인 1줄 추가(옵션 — 사용자가 drawer 역할을 즉시 이해하도록).
  - fish 0개 empty state: 텍스트 + ➕ 아이콘 + 우하단(또는 dock) 방향 화살표 1개로 글 못 읽는 어린이도 행동을 유도.
- 제외할 것:
  - 부모 영역 게이트(S-026)는 별도 — 본 스펙은 drawer 단순화만.
  - drawer 자체를 bottom-sheet로 통합하는 안 → 후속 검토.
  - 행 액션을 swipe로 전환하는 안 → 본 스펙은 inline icon 유지(swipe는 별도 LRN 후 채택).

## 사용자 흐름

1. 사용자가 어항을 탭하다 화면 밖으로 나간 fish가 보고 싶어 좌상단 `☰`를 탭한다.
2. drawer가 슬라이드 인하고 곧바로 fish 목록이 펼쳐져 보인다(추가 토글 없음).
3. 사용자가 행을 한 번 탭 → drawer가 닫히고 sprite가 (필요 시) 화면 중앙으로 살짝 이동하며 prop-panel이 우측에서 열린다.
4. 행 우측의 🙈(감추기) / 🗑(삭제) 아이콘으로 부가 행위 가능. 두 아이콘 모두 hit target 44×44 이상.
5. 부모가 도움말 reset이 필요하면 drawer 하단 "❓ 도움말 다시 보기"로 진입(기존 위치 유지).

## UI/상태 요구사항

- 필요한 화면 요소:
  - drawer body 상단: fish 목록(접기/펼치기 토글 제거).
  - fish-list 행 마크업: thumb + name + meta + (🙈, 🗑) — `✏️` 제거.
  - drawer footer: 도움말 다시 보기 + 옵션 "화면 밖 친구 찾기" 헬프 텍스트.
- 필요한 상태:
  - `appState.isFishListCollapsed` 폐기 또는 항상 `false`로 고정.
- 오류 또는 빈 상태:
  - fish 0개: 기존 "오른쪽 아래 ➕ 버튼을 눌러…" 메시지 재사용. 단 "오른쪽 아래" 문구는 S-031/S-033 dock 위치 변경 가능성 감안해 "**➕ 버튼**"으로 단순화.

## 구현 메모

- 관련 파일:
  - `src/features/fish-list/view.js` — `renderAquariumStatus`의 toggle 버튼 제거. 행 마크업에서 `data-edit-fish` 버튼 제거.
  - `src/features/fish-list/events.js` — `[data-toggle-fish-list]` 핸들러 제거. `[data-edit-fish]` 바인딩 제거(이미 `data-select-fish` row 탭이 동일 동작 — S-030).
  - `src/features/fish-list/events.js` — row 탭 시 drawer가 함께 닫히도록 `appState.drawerOpen = false` 추가.
  - `src/main.js` — `appState.isFishListCollapsed` 필드 제거.
  - `src/styles/components.css` `.aquarium-status-toggle*` 룰 정리(또는 축소).
- `ARCHITECTURE.md` 변경 없음.

## 검증 기준

- [ ] drawer 열기 → fish 목록이 즉시 펼쳐진 상태로 보인다.
- [ ] 행 한 번 탭으로 drawer가 닫히고 prop-panel이 열린다.
- [ ] 행에 ✏️ 버튼이 없다. 🙈/🗑 두 액션은 인라인으로 노출.
- [ ] fish 0개 빈 상태에 텍스트 + ➕ 아이콘 + 화살표가 함께 표시된다.
- [ ] 🗑 탭 시 5초 undo snackbar가 뜨고, "되돌리기" 탭으로 fish가 복원된다. 5초 경과 후 영구 삭제.
- [ ] inline 아이콘 hit area ≥ 44×44px, 아이콘 간격 ≥ 12px.
- [ ] row 탭 시 drawer 닫힘과 prop-panel 열림이 동일 duration에 동시에 진행된다.
- [ ] drawer 재오픈 시 fish-list 스크롤 위치가 보존된다(S-011 회귀 없음).
- [ ] drawer 닫혀있을 때 `appState.drawerOpen === false`, 열려있을 때 fish-list가 항상 렌더.
- [ ] 콘솔 오류 없음, `npm run build`/`npm test` 통과.
