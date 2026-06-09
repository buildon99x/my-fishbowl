# 직접 만들기 풀스크린 개편 — 1단계 리서치 (deep-research)

작성일: 2026-06-09 · 방법: `/deep-research` — 5개 각도로 WebSearch fan-out(4개 병렬 document-specialist 에이전트) + 출처 교차검증. 코드베이스 현황 매핑 병행.

선행 자료: [`2026-06-08-kids-drawing-research.md`](./2026-06-08-kids-drawing-research.md) (S-036 대칭·스탬프 근거). 본 문서는 **"직접 만들기 팝업 → 풀사이즈 창 전면 개편"** 결정을 위한 심화·출처보강판이다.

---

## 0. 연구 질문

전제: `직접 만들기` 팝업(현 bottom-sheet)을 **풀사이즈 창**으로 만든다.
목표: **6~9세**가 **직접 그려서** 어항에 물고기·데코를 추가하는 경험을 최우선으로, 직관적이고 쉬운 UI/UX로 전면 개편한다. 기존 기능 전부 유지, 기성 제품 수준 완성도.
참고 SW: Autodesk Sketchbook, Procreate.

---

## 1. 핵심 결론 (Executive Summary)

풀스크린 개편에서 임팩트 큰 순서 (전부 교차검증된 근거 보유):

1. **캔버스 우선(canvas-first) + 항상 보이는 슬림 툴바.** 전문 앱(Sketchbook Auto-Hide, Procreate 4-finger full screen)은 캔버스를 최대화하려 UI를 숨기지만, **6~9세는 "도구를 잃어버리면" 회복하지 못한다.** → 캔버스는 키우되 도구는 **절대 전부 숨기지 않고** 가장자리에 고정. (NN/G, Material)
2. **터치 타겟 대형화.** 1차 도구·색 스와치는 **20mm(≈75–80pt@2x)** 목표, 보조 컨트롤도 Apple 44pt / Material 48dp 하한 준수. 7–10세는 7mm 타겟을 **약 30% 빗나간다.** 현재 색 스와치는 36px 시각크기 → 키워야 함. (W3C WAI, Apple HIG, NN/G)
3. **탭 전용 인터랙션 유지, 멀티터치 의존 금지.** 7–8세 제스처 성공률: 탭 83%, 길게누르기 60%, 드래그 30%, **핀치 13% / 회전 10%.** Procreate의 2·3·4손가락 단축은 **아이용으론 전부 부적합** → 모두 큰 버튼으로 대체. (PMC7303424)
4. **지우개를 1급 시민으로, 되돌리기는 보조.** 연구·실측 모두 **아이는 실수 시 undo 화살표가 아니라 지우개로 손이 간다**(추상 아이콘 미인지). 지우개 크게·항상 보이게. (IJHCI 2021)
5. **모든 탭에 즉각 피드백(시청각·햅틱).** 무음=고장으로 인식해 "rage tapping" 유발. Toca Boca는 이를 설계 요건으로 못박음. 이미 `playHaptic` 보유 → 전 인터랙션으로 확장. (Toca Boca, Google for Devs)
6. **온보딩은 글이 아니라 시연.** 첫 실행 15–20초 손 시연 애니메이션 + 펄스 어포던스 + 아이콘＋짧은 라벨. 6세는 사실상 비독자. (NN/G)
7. **대칭·스탬프·자동저장·확인후삭제는 이미 보유 → 유지·강화.** 풀스크린에서 더 크고 발견 쉽게 배치.

범위 밖(연령 과잉): 레이어·블렌드모드, 100+ 브러시 라이브러리, 압력 커브 편집, 핀치 줌·회전, 4손가락 단축, HSL 색상환.

---

## 2. Sketchbook · Procreate 패턴 → 아이용 번역

전문 앱의 시그니처를 6~9세 운동능력에 맞춰 **유지/개조/제거**로 분류.

| 패턴 (출처 앱) | 아이 적합성 | 개편 반영 |
| --- | --- | --- |
| 대형 캔버스 + 최소 크롬 | ✅ 높음 | **채택** — 캔버스가 화면 지배, 단 슬림 툴바 상시 노출 |
| 가장자리 고정 슬라이더(브러시 크기) | △ 부분 | 크기만 **3단 프리셋 버튼**으로(슬라이더보다 탭이 쉬움). 불투명도는 미채택 |
| 방사형/마킹 메뉴(Lagoon 8슬롯, QuickMenu 6슬롯, flick) | △ 부분 | flick·8슬롯은 과함. **개념만**: 모드는 4–5개 큰 탭 버튼, flick 없음 |
| 2손가락 탭 undo (Procreate) | ❌ | **항상 보이는 큰 undo 버튼**으로 대체 |
| 3손가락 문질러 전체삭제 | ❌ | **라벨 버튼 + 확인 단계**로 대체(현 2탭 confirm 유지) |
| 1손가락 길게=스포이드 | △ | 지금은 미보유. 추가 시 **버튼 어포던스 우선**, 홀드는 보너스 |
| 4손가락 풀스크린 토글 | ❌ | 부적합. 크롬을 전부 숨기지 않음 |
| 대칭(X/Y/방사) | ✅ 즐거움 | **좌우(Y축) 1종 유지** — 물고기에 압도적, 1탭 토글 |
| 색상 디스크/하모니/HSB 탭 | △ | **고정 스와치 팔레트**로 단순화(아래 §4) |
| 레이어 패널 | ❌(6–7), △(8–9) | 단일 캔버스 유지 |

출처: Sketchbook Help(Lagoon·Brush/Color Puck·Auto-Hide·Symmetry), Procreate Handbook(Sidebar·Gestures·QuickMenu·Colors), PMC7303424(제스처 성공률), NN/G.

---

## 3. 6~9세 드로잉 UX — 교차검증된 사실

### 3.1 터치 타겟 (정량)
- Apple HIG **44×44pt**, Material **48×48dp**, WCAG 2.5.5(AAA) **44 CSS px**가 하한.
- 7–10세는 **7mm 타겟을 ~30% 빗나감**(W3C WAI 요약). 성인도 20mm에서 성능 정체 → 아이는 그 이상.
- 권장: 1차 드로잉 도구·색 스와치 **20–24mm(≈75–90pt@2x)**, 타겟 간 **8–16px(아이용 64px 권장)** 간격.
- 색만으로 상태 구분 금지(미선별 색각이상 대비) → 색＋테두리/형태 병행.

### 3.2 제스처 (정량, PMC7303424, 7–8세)
탭 83% · 이동표적 탭 73% · 길게누르기 60% · 슬라이드 40% · **드래그앤드롭 30%** · **핀치 13% · 회전 10%.**
→ 1차 상호작용은 **탭(도구 선택) + 한 손가락 스트로크**로 한정. 길게누르기는 보조 단축만. 멀티터치는 보너스. 팜 리젝션 취약(아이는 손바닥/비드로잉 손가락이 화면에 닿음) → 현 코드의 `isPrimary` 비주류 터치 거부 패턴 유지·강화.

### 3.3 색 팔레트 (Lyu et al. 2022, *Color Research & Application*, 223개 앱 분석)
- 6–8세 앱은 3–5세보다 **채도·색수 약간 적되, 성인 앱보다 많음.** 7–8세는 **팔레트가 너무 작으면 불만.**
- 권장: **12–18개 고채도 고정 스와치**(단일 행/링). 색상환·HSL 슬라이더는 **8세+ 보조**로만. (현 8색 → 키우고 소폭 확장 검토)
- "무지개 크레용"(한 도구로 다색 출력)은 결정부담 0으로 신기함 최대 — 선택지 후보.

### 3.4 실수 회복 (IJHCI 2021, 32개 앱 분석)
- **모든 아이가** 실수 시 undo가 아니라 **지우개** 사용(undo 뜻을 알아도 행동은 지우개). 지우개 앱 보유율 71%.
- 지우개 = 1급·대형·상시. undo는 존재하되 **다단계 + 라벨("실행취소", 화살표만 X)**. 파괴적 동작은 **마찰 있는 확인**(현 2탭 confirm 적합). 소프트 삭제 지향.

### 3.5 온보딩 (NN/G)
- 6–9세는 문해 폭이 큼 → 아이콘＋짧은 라벨, 6세는 음성·시연. 추상 아이콘(햄버거·undo 화살표)은 학습 안 됨 → **구체적 그림 아이콘**.
- 첫 실행 **15–20초 손 시연**(색 탭→스트로크) + **펄스/글로 어포던스**. 의사결정 화면당 선택지 3–5개. 모든 1차 도구는 캔버스에서 **1탭 도달**.

---

## 4. 기존 키즈 드로잉 앱 — 작동하는 패턴 (정성)

| 패턴 | 권장 | 근거 앱 |
| --- | --- | --- |
| 동시 노출 도구 수 | 6세 3–5개, 7–9세 8–12개(고급은 숨김) | Sago Mini(브러시 3·색 9), Khan Kids(2), Tayasui(20+는 과함) |
| 색 선택 | 8–16 대형 고정 스와치 + "무지개" 옵션; 색상환 회피 | Sago Mini, KA Kids |
| 자동저장 | **매 동작/이탈 시 자동저장, 저장 다이얼로그 금지**(아이는 영속성 모델 없음). 플로피 아이콘 무의미 → "갤러리/보관함" 은유 | UX Collective, Crayola |
| 사운드 | 모든 탭/스트로크/배치에 즉각 시청각, 무음=고장 | Toca Boca |
| 스탬프/스티커 | 분류 트레이, **탭해서 배치**(드래그보다 쉬움), 배치 후 이동/스케일, 드롭 시 사운드 | Draw and Tell, Draw With Us |
| 채우기 | 6세는 **경계내 색칠**(손가락 있는 동안만), 7세+ 표준 flood fill | Crayola(경계내), Tayasui(flood) |
| 대칭 | **실시간 좌우 미러**가 기본, 방사형은 6세+; 양쪽 동시 출력이 즐거움의 원천 | Draw With Us, Symmetry Lab, Scribblify |
| 무실패 설계 | 점수·타이머·빨간X 없음; 모든 선택에 긍정 반응; 리셋은 즐거운 단계 | Toca Boca, Endless |
| 그림→움직이는 객체 | **닫힌 모양 → 즉시 퍼펫**, 관대한 모양 인식, 드래그/스케일 | Toontastic 3D, DrawBuddy, Meta Animated Drawings |

특기: **Toca Boca "Non-Destructive Design"**(실패 상태 부재, 모든 것이 터치에 반응)이 미취학~저학년 UX의 벤치마크. **"그림→움직이는 물고기"**는 my-fishbowl의 핵심 가치와 정확히 일치 — 등록 후 어항에서 헤엄치는 현 흐름이 이미 이 패턴(Toontastic식)을 구현 중. 풀스크린에서 "다 그렸어요 → 어항으로!" 전환의 마법 순간을 더 강화할 것.

---

## 5. 기술 — 풀스크린 캔버스 구현 베스트프랙티스

- **Pointer Events API**로 마우스/터치/펜 단일 경로(현 코드 이미 사용). `setPointerCapture`로 캔버스 밖 드래그 끊김 방지(현 코드 보유). `touch-action: none`(보유).
- **고DPI 스케일링**: 풀스크린은 캔버스 표시 면적이 커지므로 `devicePixelRatio` 기반 백버퍼 스케일 필수(현재 고정 720×480 내부버퍼 → 선명도 손해). 단 **스프라이트 export 계약(720×480 렌더 / 480×320 export)** 보존 필요 → 표시버퍼와 export버퍼 분리 설계.
- **스트로크 스무딩**: 현 quadratic 미드포인트 스무딩 유지(손떨림 일부 보정). 고도화 시 `perfect-freehand`(streamline 0.7–0.9)로 떨림 흡수 — 단 raster 파이프라인/export 계약과의 호환 검토 후.
- **언두 모델**: 현재 ImageData 스냅샷(20단계). 풀스크린·고DPI로 캔버스가 커지면 스냅샷 메모리 급증(1920×1080@2x ≈ 16MB/스냅샷). → **표시 캔버스는 키우되 스냅샷은 export 해상도(작은 버퍼) 기준으로** 유지하거나 단계 수 관리. (벡터 커맨드 스택이 이상적이나 현 raster 도구(지우개/채우기)와 충돌 — 범위 신중.)
- **성능**: `requestAnimationFrame` 배칭, 활성 스트로크/확정 스트로크 2캔버스 레이어 패턴(선택). 현 규모엔 과한 부분도 있음.
- **레이아웃**: 데스크탑/대형 태블릿은 좌우 가장자리 고정 패널(아이콘 스트립), 좁은 화면은 접히는 오버레이/스택. 캔버스 면적 ≥ 뷰포트 80% 유지.

---

## 6. 풀스크린 개편 설계 결정 (Stage 2 브리지)

리서치 → 본 코드베이스 적용 결정:

1. **레이아웃**: bottom-sheet → **풀스크린 창**(`position: fixed; inset: 0`). 가로(태블릿) 우선: **좌측=도구/모드, 우측=색·굵기, 중앙=대형 캔버스, 상단=제목/종류/언어/닫기, 하단=undo·redo·지우기 + 이름 + 추가.** 좁은 세로 화면은 도구를 캔버스 위/아래 슬림 바로 스택(반응형).
2. **모든 기능 보존**: 펜·지우개·채우기·도장(6모양)·대칭·undo/redo·전체지우기(2탭)·8색·3굵기·물고기/장식·이름·움직임·업로드·언어토글·자동저장·magic moment 등록. 전부 `data-*` 훅 유지 → 로직 테스트 무변경.
3. **터치 타겟**: 색 스와치 36→**≥48px 시각(탭 56px+)**, 도구/모드 버튼 ≥56px. (touch-target.test 갱신)
4. **캔버스**: 표시 면적 대형화 + DPR 백버퍼, **export 계약(480×320) 보존**. drawing.test의 720×480 렌더/480×320 export 계약 유지(내부 렌더 버퍼는 그대로 두고 CSS 표시 크기만 확대하는 안이 최소위험).
5. **피드백**: 전 인터랙션 `playHaptic` + (가능 시) 사운드. 등록 시 마법 순간 강화.
6. **온보딩**: 첫 진입 시 1회 코치마크(펄스 + 손 시연 힌트), localStorage 1회성 플래그.
7. **무실패·발견성**: 지우개 크게, undo 라벨 유지, 확인후삭제 유지. 상호배제(한 번에 한 창) 불변식 유지.
8. **범위 밖**: 레이어, 100+브러시, 색상환, 핀치줌, perfect-freehand 도입(후속 검토), 그림→AI 애니메이션.

→ 후속: `docs/spec/S-038-fullscreen-create-window.md`.

---

## 부록 A. 핵심 출처

**학술/표준**
- Ability of children to perform touchscreen gestures (PMC7303424, 2020) — 제스처 성공률
- Lyu et al., Color design in application interfaces for children, *Color Research & Application* (2022)
- Designing Drawing Apps for Children (IJHCI, T&F, 2021) — 지우개 vs undo
- Content Analysis of Mobile Drawing Apps for Children (MDPI, 2021)
- Apple HIG(Accessibility, Undo/Redo) · Material Design 3(Accessibility, Toolbars) · WCAG 2.5.5/2.5.8 · W3C WAI Touch Target Size
- NN/G: Children Physical Development · Kids Cognition · Children's Websites Usability · Touch Target Size

**전문 앱 문서**
- Sketchbook Help: Basic UI elements, Color/Brush Puck, Customizing UI, Toolbars, Symmetry
- Procreate Handbook: Interface, Gestures, QuickMenu, Colors(Disc)

**키즈 앱 리뷰/설계**
- Common Sense Media/Education: Sago Mini Doodlecast, Khan Academy Kids, Draw and Tell, Crayola Create and Play, Tayasui Sketches, Drawing Pad, Draw With Us
- Motionographer/PocketGamer: Toca Boca "Non-Destructive Design"
- Google Blog/Meta AI: Toontastic 3D, Animated Drawings (그림→움직임)

**기술**
- MDN: Pointer Events, touch-action, Optimizing canvas, quadraticCurveTo
- perfect-freehand(steveruizok), tldraw/Excalidraw, Konva(레이어·성능), kirupa(고DPI retina)
