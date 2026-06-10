# S-038 직접 만들기 풀스크린 창 전면 개편

## 상태

- 상태: ready
- 구현 여부: in-progress
- 검증 여부: not-tested

## 목표

- `직접 만들기`(fish-input)를 bottom-sheet(peek/full)에서 **풀스크린 창**으로 전환하고, **6~9세가 직접 그려서** 어항에 물고기·데코를 추가하는 경험을 최우선으로 UI/UX를 전면 개편한다.
- 기존 기능을 **하나도 빠짐없이** 유지하면서 기성 제품 수준의 완성도(캔버스 우선 레이아웃, 큰 터치 타겟, 즉각 피드백, 발견성)를 달성한다.
- 근거: [`docs/draft/2026-06-09-drawing-fullscreen-ux-research.md`](../draft/2026-06-09-drawing-fullscreen-ux-research.md) (deep-research 1단계).

## 범위

- 포함할 것:
  - `.fish-input-widget`를 `position: fixed; inset: 0` **풀스크린 창**으로 전환(새 `components/create-window.css`).
  - **캔버스 우선 레이아웃**: 넓은 화면(가로/태블릿)은 `좌측 도구 레일 · 중앙 대형 캔버스 · 우측 색/굵기 레일` 3열, 좁은 세로 화면은 `상단 도구 · 캔버스 · 하단 색` 스택(반응형). 캔버스는 가용 공간을 최대한 채운다.
  - **터치 타겟 확대**: 색 스와치 시각 크기 36→48px(탭 영역 ≥60px), 도구/모양/대칭 버튼 child-recommended 유지·강화. 1차 도구는 캔버스에서 1탭 도달.
  - **고DPI 캔버스**: 표시 면적 확대 시 `devicePixelRatio` 백버퍼로 선명도 확보. **단 export 계약(내부 렌더 720×480 → sprite 480×320) 보존**.
  - **발견성/온보딩**: 첫 진입 1회 코치마크(펜·색·캔버스 펄스 힌트), `localStorage` 1회성 플래그.
  - **피드백 강화**: 모든 도구/색/모양/대칭/굵기 탭에 `playHaptic` 유지, 등록 시 magic moment 유지.
  - 기존 기능 전부 보존: 펜·지우개·채우기·도장(원/하트/별/눈/물방울/세모)·대칭(쌍둥이)·undo/redo·전체지우기(2탭 확인)·8색·3굵기·물고기/장식 세그먼트·이름·움직임·이미지 업로드·언어 토글·자동저장(draft)·등록.
  - 상호배제 불변식 유지(카탈로그·prop-panel·청소 모드와 한 번에 하나만).
- 제외할 것:
  - 카탈로그(`default-objects-sheet`)는 bottom-sheet 그대로 유지.
  - 레이어, 100+ 브러시, 압력 커브 편집, HSL 색상환, 핀치 줌/회전, 멀티터치 단축, perfect-freehand 도입(후속 검토), 그림→AI 애니메이션.
  - 스프라이트 export 해상도 변경.

## 사용자 흐름

1. dock에서 **✏️ 직접 만들기** 탭 → 풀스크린 창이 열린다(카탈로그·prop-panel 닫힘, dock 숨김).
2. 큰 캔버스가 화면 중앙을 채우고, 도구(펜/지우개/채우기/도장/쌍둥이)는 한쪽 가장자리, 색·굵기는 반대쪽 가장자리에 항상 보인다.
3. 종류(물고기/장식)·이름은 보조 영역에서 설정, 그리기는 1탭 도구 선택 + 한 손가락 스트로크.
4. 첫 진입이면 코치마크가 "색을 고르고 그려 보세요" 펄스로 안내(1회).
5. **추가** 버튼 → 기존 등록 흐름(물고기: magic moment 후 prop-panel, 장식: 즉시 prop-panel), 창은 닫힌다.
6. **×** 또는 ESC → 창 닫힘.

## UI/상태 요구사항

- 필요한 화면 요소: 풀스크린 컨테이너, 상단 바(제목 ✏️ + 종류 세그먼트 + 🌐 + ×), 도구 레일, 색/굵기 레일, 대형 캔버스(대칭 가이드 오버레이), 하단 액션 바(undo/redo/전체지우기 + 이름/움직임/업로드 + 추가), 1회 코치마크.
- 필요한 상태: 기존 `fishInputState` 유지(`isExpanded`로 열림 제어). `sheetStage`는 호환 위해 남기되 레이아웃에 미사용. 신규 `localStorage` 키 `my-fishbowl:create-coachmark-seen`.
- 오류/빈 상태: 빈 캔버스 시 등록 비활성(기존 `canRegister`), 업로드 실패 메시지(기존), 저장공간 부족 경고(기존).

## 구현 메모

- 관련 파일:
  - `src/features/fish-input/view.js` — `renderFishInputPanel` 마크업을 풀스크린 창 구조로 재작성(모든 `data-*` 훅·버튼 헬퍼·`data-touch-area="child"` 보존, grabber/backdrop 제거).
  - `src/styles/components/create-window.css` — **신규** 풀스크린 레이아웃·반응형·확대 타겟·코치마크.
  - `src/styles/components.css` / `components/bottom-sheet.css` — fish-input 전용 규칙 분리(캔버스 표시 크기 규칙 이전). 카탈로그용 bottom-sheet 규칙·`.bottom-sheet-grabber`는 유지.
  - `src/features/fish-input/index.js` — 캔버스 DPR 설정, 코치마크 1회 표시, grabber/backdrop 바인딩 정리(no-op 허용). 그리기 로직(스트로크/undo/스탬프/대칭/채우기)·export 계약 불변.
  - `src/main.js` `styles/main.css` — 신규 CSS import, `data-sheet-open` 플래그 유지.
  - `public/locales/ko.json`·`en.json` — 코치마크/레일 라벨 키 추가.
  - 테스트: `view.test.js`·`drawing.test.js`·`touch-target.test.js`를 새 마크업·스와치 크기에 맞게 갱신. `draw-logic.test.js`는 무변경(순수 로직 보존).
- `ARCHITECTURE.md` 기준: 새 CSS 파일은 `src/styles/components/` 규칙에 부합. 공유 상호작용 헬퍼는 `src/lib` 유지.

## 검증 기준

- [ ] 풀스크린 창이 열리고 캔버스가 화면을 지배한다(넓은/좁은 화면 모두 반응형).
- [ ] 펜·지우개·채우기·도장(6모양)·대칭·undo/redo·전체지우기(2탭)·8색·3굵기·물고기/장식·이름·움직임·업로드·언어·자동저장·등록이 모두 동작한다.
- [ ] 스프라이트 export 계약(480×320)과 magic moment 등록이 보존된다.
- [ ] 색 스와치/도구/모양 버튼이 확대된 터치 타겟을 만족한다.
- [ ] 첫 진입 코치마크가 1회만 표시된다.
- [ ] `npm run lint`·`npm test`(243+)·`npm run build`가 통과한다.
- [ ] 브라우저 콘솔 오류가 없다.
