# 직접 만들기(드로잉) 개선 — 1단계 리서치

작성일: 2026-06-08 · 방법: /deep-research (WebSearch fan-out + 교차검증). WebFetch는 환경 네트워크 정책상 전 도메인 403으로 차단되어 검색 결과 요약을 다중 출처 교차검증으로 종합함.

## 0. 연구 질문

6~9세를 타겟으로, my-fishbowl의 "직접 만들기(드로잉)"에서 **아이가 직접 그려서** 어항에 물고기·데코를 추가하는 경험을 최우선으로 개선한다. 무엇이 가장 직관적이고 쉬운가? 참고 앱: Autodesk Sketchbook(sketchbook.com).

## 1. 핵심 결론 (Executive summary)

6~9세 드로잉 UX에서 임팩트가 큰 순서:

1. **좌우 대칭(미러) 모드** — 물고기는 본질적으로 좌우대칭이다. 한쪽만 그리면 반대쪽이 자동으로 그려지면 "못 그리는 아이"도 그럴듯한 물고기를 즉시 완성한다. Sketchbook의 시그니처 기능(symmetry)을 아이용으로 가장 단순화한 형태. **가장 높은 임팩트**.
2. **도형/스탬프(탭으로 찍기)** — 원·하트·별·눈·물방울 같은 도형을 탭 한 번으로 찍는다. 소근육이 덜 발달한 연령대가 "그리기 실패" 없이 성취감을 얻는 핵심 장치. (gross-motor 탭 제스처 = 연령 적합)
3. **충분히 큰 터치 타겟** — 모든 도구/색/크기 버튼을 아이 손가락에 맞게 키운다(권장 48~56px 이상, 간격 확보).
4. **즉각적 피드백·보상** — 선택 시 버튼이 커지거나 색이 바뀌고(시각), 햅틱/사운드(다감각)로 "됐다"를 알린다. 이미 일부 구현됨(haptic).
5. **관대한 실수 처리** — 되돌리기/지우개/전체지우기(확인). 이미 구현됨. 유지·강화.

복잡한 기능(레이어, 190+ 브러시, 압력 커브, 배경제거 ONNX 번들)은 **이 연령대에 과하고** 본 개선의 범위 밖. 핵심은 "쉽게 그려서 바로 어항에 넣는" 흐름.

## 2. Autodesk Sketchbook — 시그니처 기능과 아이용 번역

출처: Wikipedia "Sketchbook (software)", Autodesk News, MakeUseOf.

| Sketchbook 기능 | 설명 | 6~9세 웹앱 번역 |
| --- | --- | --- |
| **Symmetry (X/Y/radial)** | 축 기준 미러·방사 대칭 스트로크 | ✅ **좌우(Y축) 미러 1종만** 채택 — 물고기에 압도적으로 유용 |
| Brushes (190+) | 텍스처/모양 커스텀 브러시 | ❌ 과함. 펜/굵은 펜 정도면 충분 |
| Layers (무제한, 블렌드) | 레이어 시스템 | ❌ 과함. 단일 캔버스 유지 |
| Rulers/Guides | 직선·곡선 가이드 | △ 미러 가이드 라인(흐릿한 중앙선)만 차용 |
| Fill/Gradient | 영역 채우기 | ✅ 이미 flood fill 구현됨 |
| Shapes/Stamps | 도형 | ✅ **도형 스탬프** 채택 |
| Flipbook(애니메이션) | 프레임 애니메이션 | ❌ 범위 밖 |
| Predictive/Steady stroke | 손떨림 보정 | △ 이미 quadratic 스무딩 적용됨 |

→ 시그니처 중 **symmetry + shapes/fill**만이 아이용으로 직접 번역되며 임팩트가 크다.

## 3. 6~9세 드로잉 UX 원칙 (교차검증된 사실)

### 3.1 발달 단계
- NN/G는 6~8세를 3~5세, 9~12세와 구분되는 별도 발달군으로 본다. 이 연령대는 **소근육(fine motor)보다 대근육(gross motor)** 동작이 잘 발달 → **탭·드래그·스와이프** 중심으로 설계해야 한다. (출처: NN/G "Design for Kids Based on Stage of Physical Development", "UX Design for Children 4th ed.")

### 3.2 터치 타겟 (다중 출처 교차검증, 높은 신뢰도)
- **아동용 권장: 최소 2cm × 2cm** — 성인용 1cm×1cm의 4배. (출처: NN/G)
- 앱 버튼 최소 **48×48 dp**, 버튼 간 **약 64px 간격**으로 오터치 감소. (출처: Medium/Bootcamp, NN/G)
- 표준 하한: WCAG 2.5.5(Enhanced) **44×44px**, Apple HIG **44pt**, Google Material **48dp**. (출처: W3C WAI, Deque, Apple/Material)
- 근거: MIT Touch Lab — 평균 손가락 끝 16~20mm. 44px 미만 타겟은 오류율 약 3배. (출처: WebAbility/Siteimprove 종합)

### 3.3 인터페이스 단순성
- 5~8세는 **단순하고 잡음 없는 레이아웃**에서 더 성공적이며 내비게이션 오류가 적다. 화면당 선택지·도구 수를 줄여라. (출처: NN/G, Gapsy, Ungrammary)

### 3.4 피드백·보상 (다감각)
- 버튼은 눌릴 때 **커지거나/찌그러지거나/색이 바뀌며**, **명확한 클릭/확인음**으로 다감각 반응을 준다 → 아이가 "이해됐다"를 확신. (출처: Medium/Bootcamp, NN/G)
- 큰 아이콘(**60×60~80×80px**), 텍스트 **24pt 이상**. (출처: Medium/Bootcamp)
- 영역을 채우면 그림이 "드러나며" **즉각적 시각 피드백과 성취감**을 준다. (출처: Aqua/Adobe, Scholastic)

### 3.5 관대함·자유
- 디지털 드로잉의 큰 장점은 **관대함** — "실수는 탭 한 번에 사라진다", 치울 것 없음. **되돌리기 + 지우개 + 여러 페이지**가 핵심. 쉽게 좌절하는 아이에게 자신감을 준다. (출처: Aqua/Adobe, Screenwise)
- 스탬프/도형/색의 조합이 "young children에게 확실한 히트". (출처: Common Sense Education, Aqua)

### 3.6 안전·부모
- 광고 없음, 개인정보 보호, 외부 통신 없음(본 앱은 이미 클라이언트-사이드 only). 부모용 옵션은 별도 게이트(S-026)에서 처리. (출처: Grand Magazine 2026, Screenwise)

## 4. HTML5 Canvas 기법 (구현 직결)

출처: perfectionkills "Exploring canvas drawing techniques", MDN Pointer Events, OpenReplay, GeeksforGeeks.

- **Pointer Events 통합**: `pointerdown/move/up/cancel`로 마우스·터치·펜을 동일 처리. `setPointerCapture`로 캔버스 밖 드래그 안정화, `event.isPrimary`로 멀티터치 부작용 차단. → 이미 본 앱에 적용됨.
- **부드러운 스트로크**: 점들을 직선으로 잇지 말고 **중간점(midpoint) + `quadraticCurveTo`**로 곡선 보간 → 60Hz 샘플링의 각진 폴리라인 제거. `lineCap='round'`, `lineJoin='round'`. → 이미 적용됨.
- **단일 탭에도 점**: 드래그 없이 탭만 해도 `arc()` 점을 찍어 흔적을 남긴다(아이에게 필수). → 이미 적용됨.
- **Flood fill**: 큐 기반 BFS + visited 비트맵으로 stack overflow 없이 처리, 알파 채널 포함 매칭. → 이미 적용됨.
- **미러/대칭(신규)**: 한 스트로크를 그릴 때 X좌표를 `canvas.width - x`로 변환한 **두 번째 경로를 동시에** 그리면 좌우대칭. 추가 라이브러리 불필요.
- **스탬프(신규)**: 미리 정의한 도형 path(원/하트/별/눈/물방울)를 탭 지점에 현재 색/크기로 `fill()`. 드래그 없이 즉시 완성.
- **압력(pressure)**: PointerEvent의 `event.pressure`로 굵기 변조 가능하나, 6~9세 + 비펜 디바이스에서 효용 낮음 → 본 개선 제외.

## 5. 현재 my-fishbowl 드로잉 기능 분석 (gap)

`src/features/fish-input/` 기준 현황:

| 항목 | 현재 | 리서치 권고 | 갭 |
| --- | --- | --- | --- |
| 펜/지우개/색채우기 | ✅ | 유지 | 없음 |
| 색상 | 8색 | 단순 유지 OK(8~12) | 작음 |
| 굵기 | 3단계 | OK | 없음 |
| 되돌리기/다시 | ✅(20단계) | 유지 | 없음 |
| 전체 지우기(확인) | ✅(2탭) | 유지 | 없음 |
| 사진 업로드 | ✅ | 부수적 | 없음 |
| **좌우 대칭** | ❌ | **강력 권고** | **큼** |
| **도형 스탬프** | ❌ | **강력 권고** | **큼** |
| **터치 타겟 크기** | 일부 작음(색/크기 버튼) | 48~56px+ | 중간 |
| 다감각 피드백 | 햅틱 일부 | 유지/강화 | 작음 |

## 6. 우선순위 권고 (구현 대상)

엔드투엔드로 "쉽게 그려서 바로 어항에" 흐름을 강화하는 **3대 개선**:

1. **좌우 대칭(미러) 토글** — 중앙 가이드 라인 + 스트로크/스탬프/채우기 미러. 물고기 드로잉의 게임체인저.
2. **도형 스탬프(6종)** — 원·하트·별·눈·물방울·삼각. 탭으로 찍기, 현재 색/크기 적용, 미러·되돌리기와 호환.
3. **아이용 터치 타겟 정비** — 도구/색/크기/대칭/스탬프 버튼을 ≥48px(권장 56px)로, 충분한 간격.

부수: 선택/찍기 시 다감각 피드백(시각 강조 + 기존 haptic) 일관 적용.

**범위 밖(이번 개선 제외, 별도 스펙 후보):** 자동 배경제거(ONNX 5MB 번들·저사양 이슈), 레이어, 커스텀 브러시, 플립북 애니메이션, 압력 감지.

## 7. 출처

- NN/G — Design for Kids Based on Their Stage of Physical Development: https://www.nngroup.com/articles/children-ux-physical-development/
- NN/G — Children's UX: Usability Issues in Designing for Young People: https://www.nngroup.com/articles/childrens-websites-usability-issues/
- NN/G — UX Design for Children (Ages 3-12), 4th Edition: https://www.nngroup.com/reports/children-on-the-web/
- Medium/Bootcamp — Design considerations for kids: https://medium.com/design-bootcamp/design-considerations-for-kids-48ec9bf2b18
- Gapsy — UX Design for Kids: https://gapsystudio.com/blog/ux-design-for-kids/
- Ungrammary — Designing for Kids: https://www.ungrammary.com/post/designing-for-kids-ux-design-tips-for-children-apps
- W3C WAI — Understanding 2.5.5 Target Size: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- Deque — 2.5.5 Target Size (AAA): https://dequeuniversity.com/resources/wcag2.1/2.5.5-target-size
- WebAbility — Target Size guide: https://www.webability.io/glossary/target-size
- Wikipedia — Sketchbook (software): https://en.wikipedia.org/wiki/Sketchbook_(software)
- Autodesk News — Next evolution of SketchBook: https://adsknews.autodesk.com/en/pressrelease/autodesk-announces-the-next-evolution-of-sketchbook-one-of-the-most-popular-digital-drawing-apps/
- MakeUseOf — What is SketchBook: https://www.makeuseof.com/tag/sketchbook-free-drawing-app/
- perfectionkills — Exploring canvas drawing techniques: https://perfectionkills.com/exploring-canvas-drawing-techniques/
- MDN — Pointer events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- OpenReplay — Building a drawing application with HTML5 Canvas: https://blog.openreplay.com/building-a-drawing-application-with-html5-canvas/
- Aqua/Adobe — Drawing apps for kids: https://aqua.adobe.com/learn/drawing-apps-for-kids
- Scholastic — Drawing Apps for Kids: https://www.scholastic.com/parents/school-success/learning-toolkit-blog/drawing-apps-kids.html
- Common Sense Education — Painting and Drawing Apps for Students: https://www.commonsense.org/education/lists/painting-and-drawing-apps-for-students
- Grand Magazine — Best Free Coloring App Showdown 2026: https://www.grandmagazine.com/2026/02/best-free-coloring-app-showdown-2026-5-ad-free-tools-that-respect-kids-privacy/
