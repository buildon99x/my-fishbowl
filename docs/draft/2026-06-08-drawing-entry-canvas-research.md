# 직접 그리기(드로잉) 진입·캔버스 UX 리서치 (단계1+2)

- 일자: 2026-06-08
- 대상: My Fishbowl — 6~9세가 **직접 그려서** 어항에 물고기/데코를 추가하는 웹앱
- 방법: deep-research 하니스(5개 각도 병렬 웹 리서치 → 교차검증 → 종합). 현재 브랜치 코드 리뷰 병행.
- 후속 스펙: `docs/spec/S-037-drawing-entry-canvas-ux.md`

---

## 1. 현재 구현 UX 리뷰 — 우선순위별 불편 항목 (단계1)

코드 근거를 명시한 실측 리뷰. (✗ = 문제, → = 근거 파일)

### P0 — 진입이 너무 깊다 ("첫 획까지의 탭 수"가 과다)
- ✗ ➕ 버튼은 시트를 **카탈로그 탭** + `peek`(40svh)로 연다. 드로잉 탭이 아니다.
  → `src/features/prop-panel/index.js:24-34` (`activeTab='catalog'`, `sheetStage='peek'`)
- ✗ 직접 그리려면 아이가 **"만들기" 탭을 추가로 탭**해야 하고, 그제서야 `sheetStage='full'`로 확장된다.
  → `src/features/fish-input/index.js:598-606`
- ✗ 결과 경로: **➕ → "만들기" 탭 → (확장) → (스크롤) → 그리기.** 첫 획까지 최소 2~3 탭 + 스크롤.
- 근거: NN/G — 6~8세는 "단순 탭"만 안정적으로 수행, 작은 타깃 클릭/스크롤/드래그는 9세 미만에 어렵다. 최고 수준 키즈 드로잉 앱(Drawing Pad, Sketches Jr, Procreate, Freeform)은 **열자마자 캔버스**가 나온다. (출처 §2)

### P0 — 캔버스가 "스크롤되는 시트 본문" 안에 있다
- ✗ 720×480 캔버스가 `.bottom-sheet-body { overflow-y:auto }` 안에 산다. 폼(상태줄·물고기/데코 토글·힌트·파일 업로드·이름·움직임 셀렉트)과 세로 공간을 다툰다.
  → `src/styles/components/bottom-sheet.css:78-84`, `src/features/fish-input/view.js:60-201`
- ✗ `peek`(40svh)에선 캔버스 상당 부분이 잘리고, 본문이 스크롤되어야 캔버스 전체가 보인다. (캔버스 자체엔 `touch-action:none`이 걸려 있어 캔버스 위에선 안 밀리지만, 캔버스가 화면 밖이면 도달 자체가 스크롤 의존)
  → `.draw-area { order:-1 }`로 캔버스를 그리드 상단에 올려둔 완화책은 있으나(`components.css:317-323`), 근본적으로 "스크롤 컨테이너 안의 캔버스" 구조.
- 근거: 캔버스를 스크롤 컨테이너 안에 두면 가장자리 드로잉 시 의도치 않은 스크롤·데드존이 발생하는 알려진 버그. 권장 패턴은 **드로잉 면을 전용 비-스크롤 영역(가능하면 풀 화면)으로 분리**. (출처 §3)

### P1 — 창작 전에 설정/입력이 끼어든다 ("그리기 먼저, 이름은 나중에" 위배)
- ✗ 만들기 탭 상단에 파일 업로드 input, 이름 텍스트 input, 움직임 셀렉트가 캔버스와 같은 스크롤 폼에 섞여 있다.
  → `src/features/fish-input/view.js:89-120`
- 근거: ScratchJr/Toca Boca는 텍스트·설정을 창작 진입점에서 제거. NN/G — 9세 미만은 텍스트 입력·작은 컨트롤이 부담. 이름은 기본값(`'이름 없는 친구'`)이 있어 **필수가 아님** → 그리기 흐름에서 빼도 무방. (출처 §2, state.js:2)

### P1 — 캔버스 선명도(고DPI) 미처리
- ✗ 캔버스 백킹 스토어가 720×480 고정. CSS 표시 크기는 `min(720px, 100vw-32px)`로 다름. devicePixelRatio 스케일링이 없어 고DPI 폰에서 선이 뭉개질 수 있고, 좌표 매핑은 `getBoundingClientRect`+scale로 보정 중(정상)이나 backing≠display라 선명도 손해.
  → `src/features/fish-input/view.js:173-179`(width/height 고정), `index.js:95-104`(좌표 매핑)
- 근거: backing size = `cssSize × devicePixelRatio` + `ctx.scale(dpr,dpr)`가 표준 선명화 패턴. (출처 §5)

### P2 — 터치 타깃이 키즈 권장치 미만
- ✗ 도구/도형/대칭 버튼 56px(`--touch-target-child-recommended`), 색 스와치 가시 36px(+히트 56px). NN/G 키즈 권장은 **~2cm ≈ 75px**.
  → `src/styles/tokens.css:105-107`, `components.css:425-448`
- 근거: 7~10세는 7mm 타깃을 ~30% 빗나감; ~20mm가 근최적. (출처 §4)

### P2 — 보정 도구 멘탈모델
- 현 UI는 되돌리기(↩️)/다시(↪️)/전체지우기 + 지우개 도구 보유(양호). 단, 아이는 추상적 undo보다 **지우개**를 먼저 찾는다 → 지우개를 1급 시민으로 크게.
  → `view.js:127,146-148`

---

## 2. 베스트 프랙티스 종합 + 완성도 기준 (단계2)

### §2 키즈(6~9) 드로잉 앱 UX 패턴
- 최고 수준 앱은 **열자마자 빈 캔버스**, 도구는 가장자리에 항상 보이게. (Drawing Pad, Tayasui Sketches Jr — "메뉴 없음/군더더기 없음", Procreate 미니멀 인터페이스, Apple Freeform 즉시 드로잉) [ipadfamily.com.au, 148apps.com, help.procreate.com, support.apple.com]
- "첫 획까지의 탭 수"를 0에 가깝게. 온보딩은 1~3화면 이내, 텍스트 투어가 아닌 상호작용으로. [zigpoll, userpilot]
- NN/G: 6~8세 단순 탭만 안정적; 드래그/스크롤/작은 타깃은 9세 미만에 어려움. 코딩북+크레용 멘탈모델이면 즉시 이해. [nngroup children-ux, kids-cognition]
- 창작과 설정을 분리("그리기 먼저, 이름 나중"). ScratchJr/Toca Boca는 텍스트·규칙·점수 제거. [wikipedia ScratchJr, sagomini, grokipedia Toca Boca]

### §3 스크롤 vs 드로잉 제스처 충돌
- 캔버스에 `touch-action:none` → 브라우저 스크롤/팬/줌을 끄고 드래그를 드로잉으로. `preventDefault()`보다 선언적이라 빠른 기기에서 순간 스크롤도 방지. [MDN touch-action, Using_Pointer_Events]
- Pointer Events(`pointerdown/move/up`)로 마우스/펜/터치 단일화 + `setPointerCapture()`로 손가락이 면을 벗어나도 끊김 없는 획, `pointercancel` 정리 필수. [MDN]
- 스크롤 컨테이너 안 캔버스는 실제 충돌·데드존 유발(documented). **드로잉 면을 전용 비-스크롤 영역으로 분리**가 정석. [fabricjs issues, MDN]
- 컨테이너/바디에 `overscroll-behavior: contain`(또는 `none`)로 스크롤 체이닝·당겨서새로고침 차단(~96% 지원). `-webkit-overflow-scrolling`은 iOS13+에서 무효. [MDN overscroll-behavior, Chrome blog]

### §4 터치 타깃·팔레트·보정 어포던스
- 키즈(6~9) 터치 타깃 **≥2cm(~75px)** — 성인 ~1cm의 4배. 7~10세는 7mm 타깃 ~30% 미스. ~20mm 근최적, 간격도 독립 변수(에러 40~60%↓). [nngroup, sciencedirect, w3.org]
- 작은 작업기억 → **소수의 큰 아이콘 버튼**(텍스트보다 literal 아이콘), 매 탭 즉각 시·청·촉 피드백. [smashing, medium design-bootcamp, pmc]
- 아이는 추상 undo보다 **지우개**를 먼저 찾음 → 지우개를 1급으로, 파괴적 "전체지우기"는 간격 분리+확인. (현재 2-탭 확인 구현됨 ✓) [medium, uxmovement]

### §5 반응형 캔버스 사이징(선명도·가시성 최대화)
- 백킹 사이즈 = `cssSize × devicePixelRatio`, `ctx.scale(dpr,dpr)`로 선명. 포인터 매핑 = `getBoundingClientRect()` + `(canvas.width/rect.width)`. [web.dev hidipi, MDN devicePixelRatio]
- 풀 가시성엔 `100svh`(작은 뷰포트), 최대 몰입엔 `dvh/lvh`. `100vh`는 모바일 브라우저 크롬 아래까지 세어 잘림. [dev.to viewport-units, openreplay]
- 종횡비 유지하며 전체 보이려면 `aspect-ratio` + `object-fit:contain`(crop 금지). 키즈 앱 다수가 **풀블리드 캔버스 + 떠 있는 툴바**로 면적 최대화. [web.dev aspect-ratio, css-tricks]

### §6 "출시 수준 완성도"의 정의 (Toca Boca/Sago Mini)
- 규칙/레벨/점수 없음, 텍스트 튜토리얼 없음, 아이 혼자 알아낼 수 있어야("kids first"). 직접 터치/드래그, 매 동작 피드백, "실패할 수 없는" 리셋. 산만 요소 없는 닫힌 공간. [motionographer, vocal.media, gapsystudio, smashing, sagomini]

---

## 3. 완성도/품질 기준 (이 스펙이 충족해야 할 합격선)

1. **첫 획까지 1탭**: ➕ 한 번으로 그릴 수 있는 캔버스가 즉시 보인다(스크롤·탭 추가 없이).
2. **전용 비-스크롤 드로잉 면**: 캔버스는 스크롤 폼에서 분리되어, 가용 높이를 채우고 종횡비를 유지하며 한 화면에 전부 보인다.
3. **그리기 먼저, 설정 나중**: 이름/움직임/업로드는 그리기 흐름을 가로막지 않는다(기본값으로 바로 등록 가능).
4. **충돌 없는 입력**: 캔버스 `touch-action:none` + Pointer Events + capture + cancel, 컨테이너 `overscroll-behavior:contain`.
5. **선명한 캔버스**: devicePixelRatio 백킹 스케일 + 올바른 포인터 매핑.
6. **키즈 타깃**: 핵심 도구 ≥64~72px, 충분한 간격, literal 아이콘.
7. **즉각 피드백·실패 없음**: 매 동작 시·촉 피드백, 큰 지우개, 안전한 전체지우기(확인).
8. **회귀 없음**: 펜/지우개/채우기/색/굵기/되돌리기/스탬프/대칭/업로드/등록(S-003~S-036) 전부 유지, 242 테스트 그린.

## 4. 설계 방향 (스펙 입력)

- **진입**: ➕ → 곧장 "만들기(직접 그리기)" 탭 + `sheetStage='full'`, 캔버스 즉시 가시. 카탈로그는 한 탭 거리로 유지.
- **레이아웃**: 만들기 탭을 고정 그리드로 — [그래버][헤더/탭][툴바(고정)][**캔버스: 남은 공간 1fr, 비-스크롤**][푸터: 추가 버튼]. 메타데이터(이름/움직임/업로드)는 접이식 "옵션" 보조 영역으로 내려 캔버스 공간을 빼앗지 않게.
- **사이징**: 캔버스 영역 `flex:1; min-height:0`, `aspect-ratio` 유지+`object-fit`, svh 기반 높이, DPR 백킹 스케일.
- **입력**: 기존 Pointer Events 유지 + `overscroll-behavior:contain`로 시트/바디 격리 강화.
- **타깃**: 도구/색/도형 버튼 키즈 타깃 상향.

### 출처(대표)
nngroup.com/articles/children-ux-physical-development · nngroup.com/articles/kids-cognition · developer.mozilla.org/Web/CSS/touch-action · developer.mozilla.org/Web/API/Pointer_events/Using_Pointer_Events · developer.mozilla.org/Web/CSS/overscroll-behavior · developer.chrome.com/blog/overscroll-behavior · web.dev/articles/canvas-hidipi · developer.mozilla.org/Web/API/Window/devicePixelRatio · web.dev/articles/aspect-ratio · dev.to viewport units(svh/dvh/lvh) · help.procreate.com · support.apple.com Freeform · 148apps Tayasui Sketches Jr · sciencedirect S1071581918302441 · w3.org touch target research · smashingmagazine.com/2024/02 · sagomini.com/our-story

> 검증 메모: NN/G·Smashing·MDN 등 일부는 자동 fetch 403 → 인덱싱된 발췌로 교차확인. 2cm/4배·age-band·touch-action·DPR·svh 수치는 복수 출처로 일관 확인됨.
