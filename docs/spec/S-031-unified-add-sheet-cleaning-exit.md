# S-031 ➕ 추가 시트 통합 + 청소 모드 끝내기 버튼

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- "🎁 기본 오브젝트"와 "➕ 오브젝트 추가" 두 dock 진입점을 단일 ➕ 시트의 **탭 구조("카탈로그" / "직접 만들기")**로 통합한다.
- 청소 모드 종료 키(현재 ESC)를 화면 내 sticky **"끝내기" 버튼**으로 노출해 키보드 없는 iPad에서도 종료가 가능하게 한다.

## 범위

- 포함할 것:
  - dock에서 🎁 버튼 제거, ➕ 버튼 하나로 단일화.
  - 시트(S-029 결과물 재사용) 상단에 두 탭 — "카탈로그" / "직접 만들기".
  - 기존 `default-objects-modal` 내용을 "카탈로그" 탭 본문으로 이식.
  - 기존 `fish-input-widget` 폼을 "직접 만들기" 탭 본문으로 이식.
  - 청소 모드 진입 시 화면 상단 중앙(`top: calc(var(--safe-top) + 12px)`)에 sticky "끝내기" 버튼 노출.
- 제외할 것:
  - 시트 자체 구조 — **S-029** 선행 의존.
  - 색상/타이포 토큰 정리 → **S-032**.

## 사용자 흐름

1. dock의 ➕ 탭 → 시트 peek 노출, 기본 탭은 "카탈로그".
2. 사용자가 카탈로그에서 항목 선택 → 기존 등록 흐름(magic moment 포함) 그대로.
3. 또는 "직접 만들기" 탭으로 전환 → 이미지/그리기 + 이름 + 등록 흐름.
4. 청소 모드 진입 시 우측 상단(또는 dock 위) sticky "끝내기" 버튼이 표시되어, 사용자가 탭으로 모드를 종료할 수 있다.
5. 청소 완료 시 자동 종료(기존 동작 유지) + sticky 버튼 사라짐.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 시트 상단 segmented tabs(2개).
  - 청소 sticky 버튼(라운드 pill, "🧽 끝내기", `--z-overlay`).
- 필요한 상태:
  - `fishInputState.activeTab: 'catalog' | 'create'` (시트 열림 시 기본 'catalog').
  - 청소 모드 상태는 기존 `cleaningState.cleaningMode` 재사용.
- 오류 또는 빈 상태:
  - 카탈로그 비어있는 경우(현재는 정적 카탈로그라 해당 없음).

## 구현 메모

- 관련 파일:
  - `src/features/prop-panel/view.js` `renderActionCluster` — 🎁 버튼 제거.
  - `src/features/default-objects/view.js`, `events.js`, `index.js` — modal → 시트 탭 본문으로 이전.
  - `src/features/fish-input/view.js` — 탭 컨테이너 도입.
  - `src/features/cleaning/view.js` 또는 `index.js` — sticky 끝내기 버튼 추가.
  - 신규: `src/features/fish-input/tabs.js` 또는 view 분리.
- `bindActionClusterEvents`에서 `data-prop-default-objects` 처리 제거.

## 검증 기준

- [ ] dock에 ➕만 남고 🎁가 없다.
- [ ] ➕ 시트에서 "카탈로그"/"직접 만들기" 탭 전환이 자연스럽게 동작한다.
- [ ] 카탈로그에서 항목 등록 시 기존 magic moment/햅틱 그대로 발생.
- [ ] 청소 모드에서 "끝내기" sticky 버튼 탭으로 모드 종료가 된다.
- [ ] 키보드 ESC 단축키도 여전히 동작한다(병행 유지).
- [ ] 콘솔 오류 없음, `npm run build`/`npm test` 통과.
