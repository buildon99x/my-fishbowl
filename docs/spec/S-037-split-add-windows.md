# S-037 오브젝트 추가 카탈로그 / 직접 만들기 개별창 분리

## 상태

- 상태: ready
- 구현 여부: in-progress
- 검증 여부: not-tested

## 목표

- S-031에서 하나의 ➕ 시트 안 **탭 구조(카탈로그 / 직접 만들기)**로 통합했던 두 흐름을, 각각 **독립된 dock 진입점 + 독립된 창(bottom-sheet)**으로 분리한다.
- 한 화면에서 두 흐름이 탭으로 얽히지 않게 만들어, 어린이 사용자가 "고르기(카탈로그)"와 "만들기(그리기/업로드)"를 각각 단순한 단일 목적 화면으로 경험하게 한다.
- 기존 기능(카탈로그 등록 + magic moment, 직접 그리기 S-036 도구, 업로드, prop-panel 연계, 청소 모드 상호배제, 온보딩)을 **훼손 없이** 보존한다.

## 범위

- 포함할 것:
  - dock의 단일 ➕ 버튼을 **🎁 카탈로그** / **✏️ 직접 만들기** 두 버튼으로 분리.
  - 카탈로그 전용 bottom-sheet 창 신설(기존 `renderDefaultObjectsCatalog()` 본문 재사용).
  - 직접 만들기 전용 bottom-sheet 창(기존 `fish-input-widget`에서 탭 strip 제거 → 항상 만들기 본문 + 등록 버튼).
  - 두 창 + prop-panel + 청소 모드 사이의 **상호 배제(한 번에 하나만 열림)** 불변식 유지.
  - bottom-sheet 공통 상호작용(grabber 드래그 / backdrop 닫기 / 키보드 inset)을 공유 헬퍼로 추출해 두 창이 재사용.
  - 온보딩 seq1 CTA가 카탈로그 창을 열도록 연결, dock CTA 펄스를 🎁 카탈로그 버튼으로 이동.
  - i18n 키 정리(탭 전용 키 제거, 창/버튼 키 추가)와 빈 상태 안내 문구 갱신.
- 제외할 것:
  - 시트 자체의 시각 토큰/타이포 정리 → S-032.
  - prop-panel을 우측 사이드 시트로 옮기는 작업 → S-034.
  - 카탈로그 항목 추가/분류 변경(정적 manifest 유지).
  - 진입 방식 대안(➕ → 선택 시트, 부모-자식 창)은 채택하지 않음(사용자 확정: dock 버튼 2개).

## 사용자 흐름

### A. 카탈로그로 추가
1. dock에서 **🎁 카탈로그** 탭 → 카탈로그 창이 peek로 열린다(직접 만들기 창·prop-panel은 닫힘).
2. 사용자가 카드를 탭 → 기존 등록 흐름(이름 자동 부여, magic moment(짧은 버전), 햅틱/사운드, 목록 하이라이트) 그대로.
3. 카탈로그 창은 열린 채 유지되어 연속으로 더 담을 수 있다(기존 동작).
4. 🎁 버튼 다시 탭 또는 backdrop/grabber 아래로 드래그/× → 닫힘.

### B. 직접 만들기로 추가
1. dock에서 **✏️ 직접 만들기** 탭 → 직접 만들기 창이 peek로 열린다(카탈로그·prop-panel은 닫힘).
2. 종류(물고기/장식) 선택 → 업로드 또는 그리기(펜/지우개/채우기/도장/대칭, undo/redo) → 이름 입력 → **등록**.
3. 등록 시 기존 동작 유지: 물고기는 magic moment 후 prop-panel 열림, 장식은 즉시 prop-panel 열림. 두 경우 모두 직접 만들기 창은 닫힌다.
4. ✏️ 버튼 다시 탭 또는 backdrop/grabber/× → 닫힘.

### C. 상호 배제 / 모드 전환
1. 한 창이 열린 상태에서 다른 dock 진입점을 탭하면, 먼저 열려 있던 창은 닫히고 새 창만 열린다.
2. 청소 모드 진입 시 두 창과 prop-panel 모두 닫힌다(기존 청소-우선 규칙 확장).
3. prop-panel(편집)이 열리면 두 창은 닫힌다(narrow 화면 하단 겹침 방지, S-034 규칙 확장).

### D. 온보딩
1. 첫 진입 seq1 CTA(어항 중앙 "+") 탭 → **카탈로그 창**이 peek로 열리고 seq2로 진행한다.
2. dock CTA 펄스는 🎁 카탈로그 버튼에 표시된다(빈 어항 + 미열람 시).

## UI/상태 요구사항

- 필요한 화면 요소:
  - dock 버튼 2개: `🎁`(`data-prop-catalog`), `✏️`(`data-prop-create`). 각 `aria-label`/`aria-pressed`/툴팁.
  - 카탈로그 창: `.default-objects-sheet.bottom-sheet` — grabber, header(🎁 + 제목 + 닫기), body(카탈로그 그리드), footer 힌트(`catalog.hint`). `data-touch-area="child"`, `role="dialog"`.
  - 직접 만들기 창: 기존 `.fish-input-widget.bottom-sheet` — grabber, header(✏️ + 제목 + 언어토글 + 닫기), body(만들기 본문), footer 등록 버튼. 탭 strip 제거.
- 필요한 상태:
  - 카탈로그 창 가시성: `defaultObjectsState.isExpanded: boolean`, `defaultObjectsState.sheetStage: 'peek' | 'full' | 'closed'`(`createDefaultObjectsState()`에 추가). 디바운스/CTA 상태는 기존 유지.
  - 직접 만들기 창: 기존 `fishInputState.isExpanded` / `sheetStage` 유지, `activeTab` 제거.
  - 불변식: `fishInputState.isExpanded`와 `defaultObjectsState.isExpanded`는 동시에 true가 될 수 없다. `editingTarget` 또는 `cleaningMode`가 활성이면 둘 다 false.
  - `document.body.dataset.sheetOpen`은 둘 중 하나라도 열리면 `'true'`.
- 오류 또는 빈 상태:
  - 카탈로그 manifest가 비면 기존 빈 상태 카드(현재 해당 없음).
  - 빈 어항 안내 문구는 ➕ 단일 버튼 표현을 🎁/✏️ 두 버튼 표현으로 갱신.

## 구현 메모

- 신규 파일:
  - `src/lib/bottomSheet.js` — 공유 헬퍼: `bindSheetGrabber(panel, state, render)`, `bindSheetBackdrop(root, state, render, backdropSelector)`, `bindKeyboardInset()`. fish-input의 기존 `bindBottomSheetGrabber`/`bindBackdrop`/`bindVisualViewportInset` 로직을 일반화해 이전. (도메인 비종속 UI 헬퍼이므로 `src/lib/` 배치 — `ARCHITECTURE.md`/`Claude.md` 디렉터리 규칙 준수.)
- 관련 파일:
  - `src/features/prop-panel/view.js` `renderActionCluster` — ➕ 단일 버튼 → 🎁/✏️ 두 버튼. CTA 펄스를 🎁 버튼으로 이동. `defaultObjectsState` 인자 추가.
  - `src/features/prop-panel/index.js` `bindActionClusterEvents` — `data-prop-add-fish` 제거, `data-prop-catalog`/`data-prop-create` 핸들러 추가(상호 배제 포함). `defaultObjectsState` 주입.
  - `src/features/fish-input/state.js` — `activeTab` 제거.
  - `src/features/fish-input/view.js` — 탭 strip 제거, 항상 만들기 본문 + 등록 버튼, 헤더 제목 `create.title`/✏️, `renderDefaultObjectsCatalog` import 제거.
  - `src/features/fish-input/index.js` — 탭 이벤트 제거, grabber/backdrop/inset를 공유 헬퍼로 교체.
  - `src/features/default-objects/state.js` — `isExpanded`/`sheetStage` 추가.
  - `src/features/default-objects/view.js` — `renderDefaultObjectsSheet(uiState)` 추가(셸 래핑).
  - `src/features/default-objects/index.js` — `renderDefaultObjectsSheet` export.
  - `src/features/default-objects/events.js` — grabber/backdrop/닫기 바인딩 추가(카탈로그 창 열렸을 때만, 카드 클릭 로직 불변).
  - `src/main.js` — 두 시트 렌더, 카탈로그 창 wiring, 상호배제 normalization, `body.dataset.sheetOpen` 합집합, 온보딩에 카탈로그 상태 전달, 빈 상태 문구 갱신.
  - `src/features/onboarding/index.js` — seq1 CTA가 카탈로그 창을 열도록(`catalogState`) 변경.
  - `public/locales/ko.json`, `public/locales/en.json` — `add.object`/`tab.catalog`/`tab.create`/`tab.group.label` 제거, `create.title`/`catalog.title`/`dock.catalog`/`dock.create` 추가. ko/en 키 집합 동일 유지.
  - 스타일: `src/styles/components/bottom-sheet.css` — `.fish-input-tabs`/`.fish-input-tab*` 제거, 시트 기본 규칙을 `.fish-input-widget.bottom-sheet, .default-objects-sheet.bottom-sheet`로 그룹화, `.fish-input-footer-hint` → `.bottom-sheet-footer-hint` 일반화.
  - 테스트: `src/styles/touch-target.test.js` `.fish-input-tab` 단언을 dock 버튼(`.prop-btn` 68px)으로 교체. 필요한 신규 단언 추가.
- UI 진입점 변경 체크리스트(`docs/spec-command-patterns.md`) 적용: 새 진입점 동작 + 기존 ➕ 진입점/탭 제거를 쌍으로 확인. 도메인 상태(`cleaningMode`/`editingTarget`)를 그대로 받고 중복 컨트롤을 남기지 않는다.

## 검증 기준

- [ ] dock에 🎁/✏️ 두 버튼이 있고, 기존 ➕ 단일 버튼과 탭 strip은 없다.
- [ ] 🎁 → 카탈로그 창만, ✏️ → 직접 만들기 창만 열리며 서로 배타적으로 닫힌다.
- [ ] 카탈로그 등록 시 magic moment/햅틱/사운드/목록 하이라이트가 기존대로 발생하고 창은 열린 채 유지된다.
- [ ] 직접 만들기 등록 시 물고기=magic moment 후 prop-panel, 장식=즉시 prop-panel로 이어지고 창은 닫힌다.
- [ ] 그리기 도구(펜/지우개/채우기/도장/대칭/undo/redo)와 업로드가 per-stroke 재렌더에도 선택/히스토리를 유지한다(기존 invariant 보존).
- [ ] 청소 모드 진입 시 두 창과 prop-panel이 닫히고, prop-panel 편집 중 두 창이 열리지 않는다.
- [ ] 온보딩 seq1 CTA가 카탈로그 창을 열고 seq2로 진행한다.
- [ ] `body[data-sheet-open]`이 두 창 합집합으로 토글되어 dock 숨김(S-033)이 정상 동작한다.
- [ ] 브라우저 콘솔 오류 없음, `npm run lint`(ESLint + knip)·`npm test`·`npm run build` 통과.
