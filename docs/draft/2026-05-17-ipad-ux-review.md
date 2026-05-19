# iPad 터치 환경 UI/UX 재검토 — 5라운드 수렴 결과

- 작성일: 2026-05-17
- 브랜치: `claude/improve-ui-ux-design-S4wf6`
- 범위: 현재 main 시점의 앱 전체. iPad(터치/Pencil/소프트 키보드/Split View) 사용 전제.
- 목적: 직관성·일관성·미학·확장성 4축으로 5라운드 반복 검토 후 통합 개선안 도출.

---

## 1. 데스크톱 1차 리뷰에서 발견한 P0~P2 (요약)

| 순위 | 항목 | 위치 |
| --- | --- | --- |
| P0 | 우상단 3중 겹침(목록 패널 + 🔊 + ❓) | `src/styles/layout.css:57`, `src/styles/components/onboarding.css:96`, `src/styles/components/sound.css:81` |
| P0 | undo snackbar가 action cluster 가림 | `src/styles/components.css:577` |
| P0 | `.prop-panel` 중복 정의 + status 폭에 의존 | `src/styles/components/panels.css:37, 596` |
| P1 | fish-input-widget이 액션 클러스터와 겹침 | `src/styles/components.css:260` |
| P1 | 🎁/➕ 의미 모호 + 닫기 ❌ 아이콘 | `src/features/prop-panel/view.js:228, 105` |
| P1 | 호버 전용 툴팁(모바일 무용) | `src/styles/components/panels.css:367` |
| P2 | 키보드 focus 표시, fish-list 행 톤 통일, 등록 버튼 위치 | `panels.css:393`, `fish-list/view.js`, `fish-input/view.js:110` |

---

## 2. 라운드 진화 요약

| 라운드 | 초점 | 핵심 발견 | 결론 변화 |
| --- | --- | --- | --- |
| R1 | 좌표/도달성 | 액션 클러스터 bottom-center는 양손 그립 엄지로는 멀지만 한손 사용엔 OK. 우상단 ❓🔊는 양손 그립에서 가장 안 닿는 위치 | 단순 재배치가 아니라 **도달성 기반 zone 재설계** 필요 |
| R2 | 입력(키보드/Pencil) | 이름 입력 시 iOS 소프트 키보드가 `fish-input-widget`(fixed bottom)을 통째로 가림. 그리기 캔버스 480×320은 Pencil에 너무 작고 패널 안 스크롤과 충돌 | 등록 UI를 **bottom-sheet / full-sheet**로 승격 |
| R3 | 제스처/발견성 | hover 툴팁 무효, drag-to-move 발견 어려움, 선택 vs 편집 이중 상태가 터치에서 더 혼란 | **단일 탭 → 컨텍스트 팝오버**, long-press = 드래그 활성, hover 의존 제거 |
| R4 | 일관성/미학 | 5종 radius, 3종 accent 컬러, 아이콘/텍스트 혼용. 크롬(헤더/상태/❓🔊)이 어항을 약 25% 가림 | 토큰 정리 + **idle auto-fade chrome** |
| R5 | 확장성 | dock 6개째에서 모바일에서 줄바꿈 위험, prop-panel 좌표 하드코딩이 새 요소 추가 시마다 깨짐 | **Dock + Drawer** 패러다임으로 전환, layout을 CSS 변수 기반 grid로 |

각 라운드에서 "버튼을 옮기자"에서 출발해 "zone을 재정의 → 입력 모달리티별로 면을 분리 → 인터랙션 자체를 단순화"로 결론이 깊어졌다.

---

## 3. 통합 개선안

### A. 화면 영역 재설계 (직관성 + 확장성)

현재는 4모서리 + 중앙 하단 = **5개 floating 클러스터**가 어항 위에 떠 있다. 이를 **3 zone**으로 압축한다.

```
┌──────────────────────────────────────────────┐
│ [☰ Menu]                              [🔊]   │  ← Top bar (auto-fade, 56px)
│                                              │
│              🐟  어  항  영  역              │  ← Hero
│                                              │
│       ┌────────────────────────────┐         │
│       │  ➕   🍖   🎁   🧽   ❓    │ ← Dock (always visible, 72px touch target)
│       └────────────────────────────┘         │
└──────────────────────────────────────────────┘
```

- **☰ Menu(좌상단)** → 슬라이드 drawer: 어항 제목, 청결도/이끼/카운트, 오브젝트 리스트, 설정. 현재 `page-header` + `aquarium-status` + fish-list를 통합.
- **🔊(우상단)** → 음소거만 유지. ❓는 dock 끝으로 이동해 첫 사용자에게 더 잘 보이고 손에 닿게 한다.
- **Dock(중앙 하단)** → primary action 5개를 한 줄. iPad 가로/세로 모두 한 손 엄지 도달 안전 거리. 6개째부터는 우측 끝에 ⋯ 자동 그룹화.

이 한 변경으로 P0 3건(우상단 3중 겹침, snackbar 충돌, prop-panel 좌표 하드코딩)이 동시에 사라진다.

### B. 등록 패널을 Bottom Sheet로

현재 `.fish-input-widget`은 `bottom: 18` fixed라 이름 입력 시 iOS 키보드 뒤로 사라진다. iPad 사용자 입장에서 "버그"로 인식된다.

- 등록 UI를 iOS 스타일 bottom-sheet로 전환: 그래버 핸들 → 절반 펼침(이미지 선택/이름) → 끝까지 펼침(그리기 + 미리보기).
- `visualViewport` API로 `--keyboard-inset` CSS 변수 갱신, sheet의 `padding-bottom`에 반영.
- 그리기 캔버스: `touch-action: none` 명시(스크롤과 그리기 충돌 방지), 크기를 `min(720px, 100vw - 32px)` × `aspect-ratio: 3/2`로 키워 Pencil 사용성 확보.

### C. 터치 인터랙션 단순화 (R3)

| 제스처 | 현재 | 제안 |
| --- | --- | --- |
| 물고기 단일 탭 | "선택" 상태만 부여(편집은 리스트의 ✏️ 필요) | **선택 + prop-panel 자동 표시**. 중간 상태 제거 |
| Long-press | 미사용 | **드래그 모드 활성화** + 햅틱. 첫 탭 시 "꾹 눌러 옮기기" 4초 토스트로 발견성 확보 |
| Pinch (2 finger) | 미사용 | **크기 조절**. prop-panel slider와 동기화 |
| 어항 빈 곳 탭 | 무반응 | **선택 해제 + 패널 닫기** |
| Swipe down on prop-panel | 미지원 | **닫기** (iOS sheet 일관성) |
| Long-press — Dock 버튼 | hover 툴팁(터치 무효) | **라벨 + 부가 옵션 팝오버**(먹이 종류 선택 등) |

`prop-panel-header`에 `touch-action: none`을 두지 않으면 드래그가 페이지 스크롤과 경쟁한다. 같은 헤더에서 드래그/탭/닫기를 모두 받아야 하므로 pointer event 분기가 필요.

### D. 의미 명확화 (직관성)

| 현재 | 문제 | 제안 |
| --- | --- | --- |
| 🎁 "기본 오브젝트" + ➕ "오브젝트 추가" | 두 진입점이 같은 목표, 🎁은 의미 불명 | **하나의 ➕ 추가 시트**의 두 탭("카탈로그" / "직접 만들기"). Dock 슬롯 1개 절약 |
| ❌ 닫기 | 어린이가 "지움"으로 해석 | `×` (단순 곱하기) 또는 `↓ 내리기`(sheet인 경우) |
| `+/-` 펼치기/접기 토글 | ➕ 추가 버튼과 혼동 | `▾ / ▴` 화살표 |
| 청소 모드 Esc 종료 | 키보드 없는 iPad에선 비활성 | 청소 시작 시 상단에 **"끝내기" sticky 버튼** 표시 |
| selected vs editing 두 외관 | 터치 사용자에게 차이 학습 부담 | 통합. 선택 = 편집 = outline 1종 |

### E. 일관성 토큰 정리 (미학)

- **Radius**: pill(원형 버튼), `lg`(카드/패널), `md`(인풋/칩). 3종으로 축소. 현재 5종 중 `xl/sm`은 흡수.
- **Accent**: 1차 brand-teal(어항/물 메타포), 2차 brand-ochre(경고/이끼), pink는 brand-teal로 통합(슬라이더 `accent-color` 변경). 3색 → 2색.
- **Action size 토큰**: `--touch-target: 56px`(데스크탑) / `64px`(iPad) / `60px`(폰). 현재 68→60 break이 iPad에서 어색.
- **Z-index 정리**: chrome 10, dock 30, overlay 90, modal 100, toast 200, system(mute) 150 → toast가 system 위. 명시적 토큰(`--z-dock`, `--z-modal`, …) 도입 권장.

### F. 어항을 영웅으로 (미학)

- 모든 floating chrome에 `opacity: 0.92`(기본) → 3초 무동작 시 `0.45` 자동 페이드, 터치/마우스 이동 시 즉시 복구.
- `page-header`의 큰 타이틀(`clamp(24px, 3vw, display-md)`)을 drawer로 이동하면 어항 상단 25%가 비어 어항 자체를 더 크게 그릴 수 있다.

### G. 확장성 — Layout이 추가 기능을 견디게

```css
:root {
  --safe-top: env(safe-area-inset-top, 12px);
  --safe-bottom: env(safe-area-inset-bottom, 12px);
  --dock-height: 72px;
  --dock-bottom: calc(var(--safe-bottom) + 12px);
  --drawer-width: 0px;        /* JS toggles to 320px when open */
  --keyboard-inset: 0px;      /* visualViewport API */
}
.fishbowl-page {
  display: grid;
  grid-template-rows: var(--safe-top) 1fr var(--dock-height) var(--dock-bottom);
  grid-template-columns: var(--drawer-width) 1fr;
}
```

이 구조의 효과:

- 새 기능 추가 시 dock 슬롯 또는 drawer 섹션 한 줄만 추가하면 된다.
- 좌표 하드코딩(`right: calc(22px + min(280px,100vw) + 12px)` 등)이 사라진다.
- Split View로 폭이 320px까지 줄어도 drawer 자동 collapse, dock 자동 축소 처리가 단일 규칙에서 일관된다.

### H. 접근성 (모두 해당)

- 모든 dock 버튼 `:focus-visible`에 3px outline. iPadOS Pointer/Switch Control 사용자가 키보드처럼 탐색 가능.
- VoiceOver를 위해 dock 컨테이너에 `role="toolbar" aria-label="액션"`.
- prop-panel을 sheet로 바꾸면 `role="dialog" aria-modal="true"`. 현재 `role="complementary"`는 floating drag 동작과 의미가 다르다.

---

## 4. 권장 실행 순서

각 단계는 독립 PR로 검증 가능하다.

1. **P0 — Layout 토큰화 + 우상단 클러스터 해체**: `--dock-*`, `--safe-*`, drawer 골격. 기존 컴포넌트 위치만 새 grid에 매핑. 현상이 가장 크게 개선되며 후속 작업의 기반이 된다.
2. **P0 — Bottom sheet 등록 UI + visualViewport 키보드 처리**: iPad의 가장 큰 "버그성" UX 이슈 해결.
3. **P1 — 단일 탭 → prop-panel 자동, long-press 드래그**: 선택/편집 통합. 햅틱 연결.
4. **P1 — 🎁 + ➕ 통합 시트, ❌ → × 교체, 청소 모드 끝내기 버튼**.
5. **P2 — Idle auto-fade chrome, focus-visible, 토큰 색상 축소**.

각 단계는 `docs/spec/`에 sub-spec(예: `S-028-layout-grid-refactor.md`)으로 분리해 ready 표시 후 구현하면 Claude.md 워크플로우와 일치한다.
