# S-036 직접 만들기(드로잉) 어린이 경험 개선 — 좌우 대칭 + 도형 스탬프

## 상태

- 상태: ready (3단계 리뷰 반영 완료 — sub-agent UX 리뷰의 must-fix 13건 반영)
- 구현 여부: in-progress
- 검증 여부: not-tested

## 배경

- 1단계 리서치: `docs/draft/2026-06-08-kids-drawing-research.md`
- 참고 앱: Autodesk Sketchbook (symmetry, shapes/stamps가 아이용으로 직접 번역됨)
- 타겟: **6~9세**. 소근육보다 대근육(탭/드래그)이 발달한 연령. 단순·관대·즉각 피드백이 핵심.

## 의존성

- S-003 기본 캔버스 + 도구(펜/지우개/색채우기/색/굵기/되돌리기/전체지우기) — 구현됨 (`src/features/fish-input/`)
- S-024 터치 타겟 토큰(`--touch-target-child*`) — 구현됨
- S-021 Draw-to-Life Magic Moment(등록 후 어항 합류) — 기존 흐름 유지

## 목표

- 그림을 잘 못 그리는 6~9세도 **물고기/데코를 쉽고 빠르게 완성**하게 한다.
- 가장 임팩트 큰 두 기능을 **엔드투엔드로 완전 동작**하게 추가한다:
  1. **좌우 대칭(미러) 모드** — 한쪽만 그리면 반대쪽이 자동으로 그려진다(물고기 = 좌우대칭).
  2. **도형 스탬프** — 원·하트·별·눈·물방울·삼각을 탭 한 번으로 찍는다.
- 신규 컨트롤은 기존 도구와 **동일한 터치 타겟(≥56px)·다감각 피드백(시각 강조 + haptic)·되돌리기/대칭 호환**을 갖춘다.

## 범위

- 포함할 것:
  - 좌우 대칭 토글 버튼(도구가 아닌 ON/OFF 스위치형) + 캔버스 중앙 가이드 라인(흐릿)
  - 대칭 적용 대상: 펜/지우개 스트로크, 도형 스탬프, 단일 탭 점. (색채우기는 미러 제외 — 구현 메모 참조)
  - **미러는 활성 composite op을 그대로 상속한다**: 지우개 미러도 지우고(destination-out), 펜/스탬프 미러는 그린다(source-over).
  - 도형 스탬프 도구(`stamp`) + 6종 도형 선택 행(원/하트/별/눈/물방울/삼각)
  - 스탬프: 탭으로 찍기, 현재 색 + **`drawSize × 3` 고정 배율 크기**(8/14/22 → 24/42/66px), 탭당 1회 undo 스냅샷
  - 대칭/스탬프 상태의 per-stroke 리렌더 생존(기존 패턴과 동일하게 `state`에 보관)
  - i18n 키(ko/en) 추가
  - 단위 테스트(순수 로직: 미러 좌표 변환, 스탬프 path 생성, 상태 토글)
- 제외할 것(별도 스펙 후보):
  - 자동 배경 제거(ONNX 번들), 레이어, 커스텀 브러시, 플립북, 압력 감지, 방사형/4분할 대칭, 텍스트 도구

## 사용자 흐름

### A. 좌우 대칭으로 물고기 그리기
1. ➕ → "직접 만들기" 탭 → 캔버스가 보인다.
2. 아이가 **[🦋 쌍둥이]** 버튼을 탭한다 → 버튼이 ON 상태(스위치형, "켜짐" 어포던스)가 되고, 캔버스 정중앙에 흐릿한 세로 가이드 라인이 나타난다. (haptic light)
3. 아이가 캔버스 **왼쪽 절반**에 물고기 몸통/지느러미를 그린다 → 오른쪽 절반에 좌우 대칭으로 동시에 그려진다.
4. 상태 메시지(아이 톤): "쌍둥이처럼 양쪽이 똑같이 그려져요! ✨"
5. **추가** → 기존 등록 흐름(S-004/S-021)으로 어항에 합류.

### B. 도형 도장으로 데코/눈 찍기
1. 캔버스에서 도구 행의 **[⭐ 도장]** 버튼을 탭한다 → 도형 6종 선택 행이 나타나고 현재 도형이 강조된다.
2. 원하는 도형(예: 👁 눈)을 탭해 선택한다. (선택 시 활성 강조 + haptic light — 다른 도구 버튼과 동일 피드백)
3. 캔버스를 탭한다 → 그 지점에 현재 색/크기로 도형이 찍힌다. (대칭 ON이면 반대편에도 찍힘) → 성취 피드백 haptic `magic-b`(색채우기 성공과 동일한 보상감).
4. 여러 번 탭해 여러 개 찍을 수 있다. 각 탭은 1회 되돌리기 단위.
5. **추가** → 등록.

### C. 되돌리기/대칭 해제
1. **↩️ 되돌리기**는 대칭/스탬프로 만든 변화도 한 번에 되돌린다(미러 양쪽이 한 스냅샷이므로 함께 복원).
2. 대칭 버튼을 다시 탭하면 OFF, 가이드 라인이 사라진다. 이미 그린 그림은 유지된다.

## UI/상태 요구사항

### 화면 요소 (`renderCreateTab`의 `.draw-toolbar` 확장)
- 도구 그룹에 **도장(stamp)** 버튼 추가: `data-draw-tool="stamp"`, 라벨 `⭐ 도장`(i18n `draw.tool.stamp`).
- 대칭 토글 버튼 추가: `data-draw-symmetry`, 라벨 `🦋 쌍둥이`(i18n `draw.symmetry`), `aria-pressed` 반영. **도구(radio)가 아니라 ON/OFF 토글** — 다른 도구와 함께 켤 수 있다. 다른 도구 버튼과 시각적으로 구분되는 스위치형 어포던스(켜짐 시 별도 ON 스타일/배지)를 가져 4번째 배타적 도구로 오인되지 않게 한다.
- 도형 선택 행(`data-draw-shape-row`): 현재 도구가 `stamp`일 때만 표시(렌더에서 `state.drawTool==='stamp'` 조건). 버튼 6개 `data-draw-shape="circle|heart|star|eye|drop|triangle"`, 이모지 라벨, `aria-pressed`. 선택 시 활성 강조 + `playHaptic('light')`.
- 캔버스 중앙 가이드: **별도 DOM 오버레이**(`pointer-events:none`)로, **`state.symmetry`에서 렌더링으로 표시 여부를 도출**한다(명령형 토글 금지 — per-stroke 리렌더가 root.innerHTML을 갈아끼우므로 한 획 후에도 가이드가 살아 있어야 한다). 캔버스 픽셀이 아니므로 등록 sprite(PNG)에 가이드선이 들어가지 않는다.
- 신규 버튼 모두: `min-width/height: var(--touch-target-child-recommended)`(56px), 활성 시 scale 강조(기존 `.draw-tool-btn.is-active` 패턴 재사용).
- `applyToolSettings`에 `stamp` 분기 추가: composite op `source-over`. **굵기(size) 컨트롤은 stamp에서 활성 유지**(스탬프 크기가 `drawSize`에서 파생되므로). fill만 기존대로 `is-inactive`.

### 상태 (`createFishInputState` 확장, 세션 UI 상태 — 직렬화 안 함)
- `symmetry: false` — 대칭 on/off.
- `drawShape: 'circle'` — 선택된 스탬프 도형(기본값 circle).
- 기존 `drawTool`에 `'stamp'` 허용.
- 위 값들은 기존 `drawTool/drawColor/drawSize` **바로 옆(state.js의 비직렬화 UI 필드 블록)** 에 두어, per-stroke 리렌더를 견디도록 `state`에 보관하고 `saveFishDraft`에는 포함하지 않는다(기존 "직렬화 안 함" 보장에 그대로 포함).

### 오류/빈 상태
- 대칭 ON에서 정중앙(가이드선 위)을 그리면 양쪽이 겹쳐 자연스럽게 한 줄로 보인다(정상).
- 스탬프 도구인데 도형 미선택 상태는 없음(기본 `circle`).
- 캔버스 밖 포인터는 기존대로 무시(`setPointerCapture`).

## 구현 메모

- 관련 파일:
  - `src/features/fish-input/draw-logic.js` — 순수 로직 추가: `mirrorX(x, width)`, `buildShapePath(shape)`(또는 `stampShape(ctx, shape, x, y, size, color)`의 순수 path 생성부), 상태 토글 헬퍼. 단위 테스트 가능하게 canvas-free로.
  - `src/features/fish-input/index.js` — `setupDrawingCanvas`에 대칭 미러 그리기(스트로크/탭/스탬프), 스탬프 도구 분기, 대칭/도형 버튼 이벤트 바인딩, per-stroke 리렌더 생존 처리.
  - `src/features/fish-input/view.js` — 도형 버튼, 대칭 토글, 도형 선택 행 마크업; 활성 상태 반영.
  - `src/features/fish-input/state.js` — `symmetry`, `drawShape` 기본값.
  - `src/styles/components.css` — 도형 행/대칭 버튼/가이드 라인 스타일(기존 `.draw-*` 패턴 재사용, 토큰 사용, 인라인 hex 금지).
  - `public/locales/ko.json`, `public/locales/en.json` — 신규 키.
  - 테스트: `src/features/fish-input/draw-logic.test.js`(미러/스탬프/토글 순수 로직), 필요 시 `view.test.js`(신규 버튼 렌더).
- `ARCHITECTURE.md` 기준 새 파일/디렉터리: **불필요**(기존 fish-input 모듈 내 확장).
- 미러 구현: pointermove의 quadratic 보간 스트로크를 그릴 때, 동일 입력의 X를 `mirrorX(x, canvas.width) = canvas.width - x`로 변환한 두 번째 path를 같은 프레임에 그린다(lineJoin/Cap **및 활성 composite op 동일** — 지우개면 양쪽 다 destination-out). 단일 탭 점(`arc`)과 스탬프도 동일하게 미러 좌표에 한 번 더 그린다.
- **undo 스냅샷 순서**: 한 동작(스트로크/탭/스탬프)당 `pushUndo()`를 **주 그림과 미러 그림을 그리기 전에 한 번만** 호출한다. 둘 사이에 스냅샷을 찍지 않는다 → 미러 양쪽이 한 스냅샷으로 함께 복원된다.
- 스탬프 크기: `stampSize = drawSize * 3` 고정 배율(8/14/22 → 24/42/66px, 720×480 캔버스 기준). 순수 함수로 분리해 단위 테스트.
- 색채우기(fill)는 닫힌 영역 BFS라 미러 좌표에 동일 적용이 어색하고 비용이 큼 → **대칭에서 fill은 미러 제외**(한쪽만 채움). 스펙·툴팁에 일관 유지.
- 등록 sprite에 가이드 라인이 들어가지 않도록 가이드는 **캔버스 픽셀이 아니라 별도 DOM 오버레이**로 그린다.

## 검증 기준

- [ ] "직접 만들기" 탭에 **도형(⭐)** 도구와 **좌우 대칭(↔)** 토글 버튼이 보이고, 둘 다 터치 타겟 ≥56px이다.
- [ ] 대칭 ON 시 캔버스 중앙에 흐릿한 세로 가이드 라인이 나타나고, OFF 시 사라진다.
- [ ] 대칭 ON에서 한쪽에 펜으로 그리면 반대쪽에 좌우 대칭으로 동시에 그려진다.
- [ ] 대칭 ON에서 단일 탭(점)도 양쪽에 찍힌다.
- [ ] 대칭 ON + 지우개로 한쪽을 지우면 반대쪽도 **지워진다**(칠해지지 않음 — composite op 상속).
- [ ] 대칭 토글이 다른 도구 버튼과 시각적으로 구분되는 ON/OFF 어포던스를 가진다.
- [ ] 한 획을 그려 per-stroke 리렌더가 일어난 뒤에도 가이드 라인이 그대로 보인다.
- [ ] 도형 도구 선택 시 도형 6종(원/하트/별/눈/물방울/삼각) 선택 행이 나타난다.
- [ ] 도형을 선택하고 캔버스를 탭하면 현재 색/크기로 도형이 찍힌다.
- [ ] 스탬프 크기 = `drawSize × 3` 고정 배율이 단위 테스트로 검증된다.
- [ ] 도형 선택 시 활성 강조 + haptic, 스탬프 성공 시 `magic-b` 보상 피드백이 동작한다.
- [ ] 대칭 ON + 도형 도구에서 캔버스 탭 시 양쪽에 도형이 찍힌다.
- [ ] 스탬프 도구에서 굵기(size) 컨트롤이 활성 유지된다(fill만 비활성).
- [ ] 펜 스트로크/탭/스탬프 각각이 1회 되돌리기 단위로 동작하고, 대칭으로 만든 양쪽이 함께 복원된다.
- [ ] 가이드 라인이 등록된 sprite(PNG)에 포함되지 않는다.
- [ ] 색채우기(fill)는 대칭과 무관하게 기존대로 한쪽만 채운다(회귀 없음).
- [ ] 대칭/도형 상태가 per-stroke 리렌더 후에도 유지된다(버튼 활성 상태 보존).
- [ ] `symmetry`, `drawShape`는 localStorage 초안(`saveFishDraft`)에 직렬화되지 않는다.
- [ ] ko/en 양쪽에 신규 라벨이 존재하며 누락 키 테스트(locale-completeness)가 통과한다.
- [ ] 신규 순수 로직(미러 좌표, 스탬프 path, 토글)에 단위 테스트가 있다.
- [ ] 기존 S-003 드로잉 검증 기준(펜/지우개/채우기/색/굵기/되돌리기/전체지우기/업로드)이 모두 유지된다(회귀 없음).
- [ ] 손가락/펜/마우스 모두 동일하게 동작한다(Pointer Events).
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm run lint`, `npm test`, `npm run build`가 모두 통과한다.
