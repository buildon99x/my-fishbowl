# S-037 직접 만들기(드로잉) 진입·캔버스 UX 완성도 — 1탭 진입 + 전용 비-스크롤 캔버스

## 상태

- 상태: draft (4단계 sub-agent 리뷰 대기)
- 구현 여부: not-started
- 검증 여부: not-tested

## 배경

- 리서치: `docs/draft/2026-06-08-drawing-entry-canvas-research.md` (deep-research 단계1+2)
- 타겟: **6~9세**. 핵심 피처 = **직접 그려서** 어항에 물고기/데코 추가. 일관·직관·쉬움 최우선.
- 두 가지 알려진 불편을 정면으로 해결한다:
  1. **진입이 깊다**: ➕ → 카탈로그 탭(peek) → "만들기" 탭 → 확장 → 스크롤 → 그리기.
  2. **스크롤이 캔버스 조작을 방해**: 720×480 캔버스가 `overflow-y:auto` 시트 본문 안에서 폼과 세로 공간을 다툼 → peek에서 잘리고 스크롤 의존.

## 의존성 / 회귀 보호

- S-029 바텀시트, S-031 탭(카탈로그/만들기), S-003 캔버스·도구, S-036 대칭·스탬프, S-004/S-021 등록 흐름 — **전부 유지(회귀 0)**.
- 기존 242 테스트 그린 유지. 뷰 테스트가 의존하는 `data-*`(도구/색/도형/대칭/캔버스/이름/움직임/파일) 마크업과 활성 마커는 보존한다.

## 목표

- **첫 획까지 1탭**: ➕ 한 번으로 그릴 수 있는 캔버스가 즉시 보인다(추가 탭/스크롤 없이).
- **전용 비-스크롤 드로잉 면**: 캔버스가 스크롤 폼에서 분리되어 가용 높이를 채우고 종횡비를 유지하며 한 화면에 전부 보인다.
- **그리기 먼저, 설정 나중**: 이름/움직임/이미지 업로드는 그리기를 가로막지 않는다(기본값으로 즉시 등록 가능, 옵션은 접이식).
- 출시 수준: 일관된 시각·즉각 피드백·실패 없는 보정.

## 범위

- 포함할 것:
  1. **진입 변경**: ➕(`data-prop-add-fish`)가 `activeTab='create'` + `sheetStage='full'`로 연다(직접 그리기 우선). 카탈로그는 탭 한 번 거리로 유지.
  2. **만들기 탭 레이아웃 재구성**: 만들기 탭에서 시트 본문을 **비-스크롤 flex 컬럼**으로, 캔버스가 남은 공간을 채우게(`1fr`/`flex:1; min-height:0`). 카탈로그 탭은 기존대로 스크롤 유지.
  3. **메타데이터 보조화(그리기 먼저)**: 이름·움직임·이미지 업로드를 접이식 **"옵션"**(`<details data-create-options>`)으로 이동, 기본 접힘. 물고기/데코 토글은 캔버스 위 컴팩트 행으로 유지(1탭·의미 큼). 상태줄은 캔버스 높이를 빼앗지 않는 얇은 1줄.
  4. **캔버스 사이징**: `.draw-canvas-wrap`가 가용 높이를 채우고, 캔버스는 종횡비(3:2) 유지하며 `max-width/height:100%`로 전부 보이게(`object-fit`/`aspect-ratio`). 백킹 해상도는 720×480 유지(기존 드로잉/스탬프/대칭/플러드필 좌표계 불변 → 회귀 0).
  5. **스크롤 격리 강화**: 만들기 본문/캔버스 영역 `overscroll-behavior: contain`, 캔버스 `touch-action:none`(기존) 유지. 캔버스가 더 이상 스크롤 컨테이너 안에 갇히지 않게.
  6. **키즈 터치 타깃 폴리시(소폭)**: 색 스와치 가시 크기 36→40px(히트 영역 ≥56px 유지), 핵심 도구 버튼 시각 강조 유지. (전역 토큰 변경 없음 — 회귀 최소화.)
  7. i18n 키 추가(옵션 disclosure 라벨 등) ko/en.

- 제외할 것(별도 스펙/Phase 2, 본 스펙 비목표):
  - **고DPI 백킹 스케일(devicePixelRatio)**: 좌표계·스탬프/대칭/플러드필 상수 전반을 건드려 회귀 위험 큼 → 별도 스펙. 720×480 백킹은 폰 표시 크기(≤~360css)에서 다운스케일되어 충분히 선명.
  - 풀스크린(시트 밖) 드로잉 모드, 플로팅 오버레이 툴바, 전역 터치타깃 토큰 상향, 새 도구.

## 사용자 흐름

### A. 1탭 진입 → 즉시 그리기
1. 아이가 액션 도크의 **➕**(오브젝트 추가)를 탭한다.
2. 바텀시트가 **"만들기" 탭 + 전체 높이**로 열리며 **캔버스가 즉시 화면에 전부 보인다**(스크롤·추가 탭 없음). 상단엔 얇은 안내줄 + 🐟/🪨 토글 + 도구 툴바, 가운데 큰 캔버스, 하단 고정 **추가** 버튼.
3. 아이가 바로 캔버스에 그린다(펜 기본 선택). 손가락이 캔버스를 살짝 벗어나도 획이 끊기지 않고(capture), 시트는 밀리지 않는다.

### B. 그리기 먼저, 이름은 나중
1. 다 그리면 하단 **추가**를 탭 → 기본 이름(`이름 없는 친구`)으로 즉시 어항에 합류(S-021 매직모먼트).
2. 이름/움직임을 정하고 싶으면 캔버스 아래 **"옵션 ▸"**를 펼쳐 이름 입력·움직임 선택·이미지 업로드를 사용한다(접이식, 캔버스 높이를 빼앗지 않음).

### C. 다른 만들기 방법(업로드) / 카탈로그
1. **옵션**을 펼치면 이미지 업로드가 보인다(업로드 시 기존 미리보기 흐름 유지).
2. 미리 만든 오브젝트는 상단 **카탈로그** 탭으로 한 번에 전환(기존 유지).

## UI/상태 요구사항

### 진입 (`prop-panel`)
- `src/features/prop-panel/index.js` `data-prop-add-fish` 핸들러: 열 때 `fishInputState.activeTab = 'create'`, `fishInputState.sheetStage = 'full'`(기존 `'catalog'`/`'peek'` 대체). 닫기 토글 동작은 유지. `editingTarget=null`(기존) 유지.
- (참고) `fish-input/index.js`의 toggleButton(헤더 ×)·탭 클릭은 기존 유지. 만들기 탭으로의 전환이 `sheetStage='full'`을 보장하는 기존 로직(`index.js:603`)과 일관.

### 만들기 탭 레이아웃 (`renderCreateTab` + CSS)
- 만들기 본문은 위→아래 고정 순서: **(1) 얇은 상태줄**(`.fish-input-status`, 1줄), **(2) 🐟/🪨 세그먼트 토글 + 힌트(컴팩트)**, **(3) `.draw-toolbar`**(도구/색/도형 행 — 기존), **(4) `.draw-canvas-wrap`(캔버스, `flex:1; min-height:0`)**, **(5) `<details data-create-options>` "옵션"**(이름·움직임·업로드, 기본 접힘).
- 캔버스를 그리드 맨 위로 올리던 `.draw-area { order:-1 }`는 새 컬럼 순서로 대체(또는 무력화). 업로드용 `.preview-area`는 옵션 내부에서만(업로드 흐름) 노출 — 기존 `state.source==='upload'` 조건 유지(preview-visibility 테스트 보존).
- CSS 스코프:
  - `.fish-input-widget[data-active-tab="create"] .bottom-sheet-body { overflow:hidden; display:flex; flex-direction:column; min-height:0; overscroll-behavior:contain; }`
  - `.draw-canvas-wrap { flex:1 1 auto; min-height:0; display:flex; align-items:center; justify-content:center; }`
  - `.fish-drawing-canvas { max-width:100%; max-height:100%; width:auto; height:auto; aspect-ratio:3/2; }`(기존 `touch-action:none` 유지)
  - 카탈로그 탭은 스코프 밖 → 기존 스크롤 동작 유지.
- 마크업 보존: `data-fish-canvas`, `data-fish-name`, `data-fish-movement`, `data-fish-file`, 도구/색/도형/대칭 `data-*`와 활성 마커는 그대로 유지(뷰 테스트 보존).

### 옵션 disclosure
- `<details>` 기반(JS 없이 동작), 요약 라벨 i18n `create.options`(예: "옵션 · 이름·움직임"). 펼침 상태는 캔버스 영역을 줄이되, 본문이 비-스크롤이라 옵션이 길어지면 옵션 내부만 스크롤(`max-height` + `overflow:auto`)하여 캔버스가 사라지지 않게.
- 이름 input/움직임 select/파일 input은 옵션 내부로 이동(접근성 라벨 유지). 물고기일 때만 움직임 노출(기존 조건).

### 상태
- 신규 영구 상태 없음. 진입 기본값만 `activeTab='catalog'→'create'` 흐름으로 바뀜(➕ 경로). `createFishInputState`의 기본 `activeTab`은 유지(앱 부팅 시 시트는 닫힘).

### 오류/빈 상태
- 빈 캔버스에서 **추가**는 비활성(기존 `canRegister`). 업로드 실패 메시지(기존) 유지.
- 옵션 접힘 상태에서도 추가는 동작(기본 이름).

## 구현 메모

- 관련 파일:
  - `src/features/prop-panel/index.js` — ➕ 진입을 create+full로.
  - `src/features/fish-input/view.js` — 만들기 탭 컬럼 순서 재구성, 옵션 `<details>`로 이름/움직임/업로드 이동, 상태줄/타입토글 컴팩트화.
  - `src/styles/components.css` / `src/styles/components/bottom-sheet.css` — 만들기 탭 비-스크롤 flex 컬럼, 캔버스 flex/aspect, overscroll, 스와치 40px.
  - `public/locales/ko.json`, `public/locales/en.json` — `create.options` 등 신규 키.
  - 테스트: 필요 시 `view.test.js`에 "옵션 내부에 이름/움직임/파일 존재" + "진입 기본 create" 보강. 기존 preview-visibility/locale-completeness/state 테스트 그린 유지.
- `ARCHITECTURE.md` 기준 새 파일/디렉터리: **불필요**(기존 모듈 확장).
- 회귀 주의:
  - 백킹 720×480 불변 → `mirrorX`/`stampSizeFor`/`floodFill`/`getCanvasPoint` 좌표계 그대로.
  - per-stroke 리렌더 생존 패턴(도구/색/대칭/스탬프 state 보관) 그대로.
  - 카탈로그 탭 스크롤은 절대 깨지지 않게 CSS를 `[data-active-tab="create"]`로 스코프.

## 검증 기준 (출시 합격선)

- [ ] ➕ 한 번으로 **만들기 탭 + 전체 높이**가 열리고 **캔버스가 추가 탭/스크롤 없이 전부 보인다**.
- [ ] 캔버스가 더 이상 스크롤되는 본문 안에 갇히지 않는다: 만들기 본문 `overflow:hidden` flex 컬럼, 캔버스 `flex:1`.
- [ ] 폰/좁은 화면에서 캔버스가 종횡비(3:2)를 유지하며 잘림 없이 한 화면에 보인다.
- [ ] 캔버스 위 드로잉 중 시트가 밀리지 않고, 가장자리에서도 의도치 않은 스크롤이 없다(`touch-action:none` + `overscroll-behavior:contain`).
- [ ] 이름/움직임/이미지 업로드가 접이식 "옵션"으로 이동했고, 접힌 상태에서도 **추가**가 기본 이름으로 동작한다.
- [ ] 카탈로그 탭은 기존대로 정상 스크롤된다(회귀 없음).
- [ ] 업로드 흐름 미리보기(`.preview-area`)는 업로드 시에만 노출(preview-visibility 회귀 없음).
- [ ] 펜/지우개/채우기/색/굵기/되돌리기·다시/전체지우기/대칭/스탬프/등록(S-003~S-036) 전부 유지.
- [ ] 색 스와치 가시 40px·히트 ≥56px, 도구 버튼 활성 강조 유지.
- [ ] 손가락/펜/마우스 동일 동작(Pointer Events), `pointercancel` 정리 유지.
- [ ] ko/en 신규 라벨 존재, locale-completeness 테스트 통과.
- [ ] 브라우저 콘솔 오류 없음.
- [ ] `npm run lint`, `npm test`, `npm run build` 모두 통과(242 테스트 + 신규).
