# S-026 부모 영역 진입 게이트

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

## 의존성

- `docs/spec/S-025-backend-foundation.md` (ready) — “어린이/부모 영역 분리 정책” 매핑 표가 본 스펙의 전제.
- `docs/spec/S-025a-device-id-and-storage-adapter.md` (draft) — 부모 영역 sync indicator/충돌 카드/첫 PUT 안내 배지의 호스트.
- `docs/spec/S-023-onboarding.md` (draft) — 어린이 영역 ❓ 도움말 버튼과의 배치 충돌을 회피.
- `docs/spec/S-024-touch-target-upgrade.md` — 어린이 영역 56×56, 부모 영역 44×44 정책 상속.

## 목표

- 부모만 진입 가능한 **부모 영역**을 정의하고, 그 진입 게이트를 단일 source of truth로 박는다.
- 4–6세 어린이가 무작위 탭/길게 누르기를 해도 **우발적으로 진입할 수 없게** 하면서, 부모는 학습 1회 후 한 손으로 즉시 진입할 수 있게 한다.
- 텍스트/숫자/언어 의존 없이 동작하는 게이트 방식을 선택한다(non-reader 부모도, 어린이도, 어떤 OS에서도 동일).
- 부모 영역 안의 **파괴적 동작**(계정 삭제, OAuth 언링크)에는 **이중 게이트**(hold-to-confirm)를 적용한다.

## 범위

- 포함:
  - 부모 영역 진입 어포던스(아이콘, 위치, hit area, 시각).
  - 게이트 동작(hold-to-fill 1.5s).
  - 부모 모드 세션 정책(5분 idle 자동 잠금).
  - 파괴적 동작 이중 게이트(hold-to-confirm 2s).
  - 게이트 실패/취소 시 무반응(어린이 좌절 차단).
  - `prefers-reduced-motion` 가드.
  - 부모 영역 화면의 **레이아웃 골격**(빈 패널 + 슬롯들). 슬롯 내용물은 각 호스트 스펙(S-025a 등)이 채운다.
  - `appState.parentMode` 상태 정의와 localStorage 영속 정책.
- 제외:
  - 부모 영역 안의 개별 위젯(sync indicator/충돌 카드/OAuth 버튼 등) 구현 — 각 호스트 스펙 책임.
  - OS 단 부모 통제(iOS Guided Access, Android Family Link) 통합.
  - 본 게이트의 일시 우회(개발용 query param) — 본 스펙은 production 동작만 정의. dev 우회는 God Mode 영역.
  - 다중 사용자 프로필(형제 시나리오는 S-025f 후보).

## 사용자 흐름

### 어린이 흐름

1. 어린이가 화면 우상단의 작은 ⚙️ 아이콘을 우연히 탭 → **무반응**(시각/햅틱 0).
2. 어린이가 ⚙️를 길게 누름 → 1.5초 진행률 ring이 차오르기 전에 손을 뗌 → 무반응으로 즉시 원상 복귀, 어떤 표시도 남지 않음.
3. 어린이는 부모 영역 화면을 절대로 보지 않는다.

### 부모 흐름

1. 부모가 ⚙️ 아이콘을 **1.5초 눌러 채운다** → 짧은 햅틱(30ms) + 부모 영역 슬라이드-인.
2. 부모 영역 화면에는 sync indicator(S-025a), 충돌 카드(S-025a), OAuth 시작/언링크(S-025d), 복구 코드(S-025c), 계정 삭제, 도움말 다시 보기(S-023) 등 호스트 스펙이 채운 슬롯이 보인다.
3. 부모 영역 내에서 5분 동안 입력이 없으면 자동으로 잠금 상태로 돌아간다(부모 영역 화면이 사라지고 어린이 영역만 남는다).
4. 부모가 직접 닫기(좌상단 닫기 ✕ 또는 빈 배경 탭)할 수 있다.
5. 파괴적 동작(예: 계정 삭제, OAuth 언링크) 버튼은 **2초 hold-to-confirm** 후에만 실행된다.

## UI/상태 요구사항

### 진입 어포던스(⚙️)

- 위치: 화면 우상단. 어린이 ❓ 도움말 버튼(S-023)과 같은 코너지만 **16px 이상 간격**을 두고 배치한다. 충돌 시 ⚙️가 ❓보다 더 코너 쪽.
- 시각:
  - 아이콘 크기 24px(시각).
  - 색은 배경 대비 충분한 muted 톤(예: 어항 톤에 자연스럽게 녹는 회색).
  - **점멸 없음**, **펄스 없음**(어린이 시선 끌지 않기).
- Hit area: **44×44**(부모 손가락 기준, S-024 어른 정책). 어린이용 56×56 정책은 적용하지 않는다. 의도적으로 “찾는 사람만 닿는” 크기.
- Hold-to-fill ring:
  - 누름 시작 시 아이콘 둘레에 진행률 ring이 0% → 100%로 1.5s 동안 단조 채워진다.
  - 도중에 손을 떼면 즉시 0%로 리셋, 햅틱/소리 0.
  - 완료 시 30ms 햅틱(`Vibration API` 가능 시) + 부모 영역 슬라이드-인.
- prefers-reduced-motion 시: ring 애니메이션이 단조 fade-fill(점멸 없음)만, 슬라이드-인은 0.2s fade로 대체.

### 부모 영역 화면

- 진입 시 어항 위에 80% 너비 패널이 슬라이드-인. 어항/어린이 영역은 살짝 어두워짐(어린이 컨텐츠 잠금 시각).
- 슬롯 구조(본 스펙은 슬롯 이름만 정의, 채움은 각 호스트 스펙):
  - `parent.sync` — sync indicator + 첫 PUT 안내 배지(S-025a).
  - `parent.conflict` — 충돌 카드(S-025a).
  - `parent.account` — Google/Apple로 백업 / 언링크 / 계정 삭제(S-025d).
  - `parent.recovery` — 복구 코드 발급/입력(S-025c).
  - `parent.help` — “도움말 다시 보기”(S-023).
  - `parent.about` — 버전/약관/문의(별도).
- 닫기:
  - 좌상단 ✕ 버튼(44×44 hit, 24px 시각).
  - 배경 탭으로도 닫힌다(어린이 우발 닫기 OK — 부모 모드 종료는 안전 동작).
  - 5분 idle 자동 잠금.
- 어린이 영역 가시성: 부모 영역이 열려 있는 동안 어린이 영역의 인터랙션은 **막힌다**(어린이가 뒤에서 손을 뻗어 어항을 조작하지 않도록). 단, 시각은 살짝 어두워진 채 보이게 둔다.

### 파괴적 동작 이중 게이트

- 대상 버튼: `parent.account` 안의 “계정 삭제”, “OAuth 언링크”, 그리고 미래의 “모든 데이터 삭제”.
- 동작: 버튼을 **2초 hold-to-fill** 해야 실행된다. 진행률 ring은 진입 게이트와 동일한 단조 fill, 도중 손을 떼면 무반응.
- 시각 보강: 버튼 색은 brand의 위험 톤(채도 70% 이하), 완료 시 짧은 펄스 1회(2Hz 이하)와 명확한 텍스트 결과 토스트.

### 상태

```
appState.parentMode = {
  unlocked: boolean,             // 현재 부모 영역이 열려 있는가
  unlockedAt?: number,           // 마지막 진입 시각(ms). idle 타이머 시작점
  lastInteractionAt?: number,    // idle 타이머 갱신
};
```

- localStorage 영속 정책: **저장하지 않는다**. 새로고침/재진입 시 항상 잠금 상태로 시작한다(어린이가 부모 부재 중 새로고침해도 잠금).
- 5분 idle 타이머는 `lastInteractionAt`을 기준으로 60s마다 체크 + 마지막 인터랙션 이벤트(`pointerdown`, `keydown`)에서 갱신.

## 안전 가드

- 진입 게이트 완료 햅틱: 1회 30ms. `prefers-reduced-motion` 시 햅틱은 그대로 유지(촉각은 모션 가드 대상 아님).
- 모든 ring/fill 애니메이션은 **단조**, 점멸 없음, 빈도 0Hz.
- 부모 영역 슬라이드-인은 0.25s ease, prefers-reduced-motion 시 0.2s fade.
- 게이트 실패 시 시각/청각/햅틱 **0**(어린이가 “뭔가 일어났다”를 학습하지 못하게).
- 이중 게이트의 위험 톤 색은 어린이 영역에 노출되지 않는 부모 영역 내부에서만 사용.
- Hit area 정책: ⚙️와 ✕는 44×44, 어린이 영역에 노출되는 버튼은 항상 56×56(S-024).

## UX 리뷰 결정 사항 (게이트 방식 비교)

| 후보 | 어린이 우발 진입 차단 | 부모 학습/사용성 | 텍스트 의존 | 한 손 가능 | 결정 |
| --- | --- | --- | --- | --- | --- |
| **Hold-to-fill 1.5s + ring** | 우연 길게 누르기 ~1초 미만으로 차단 | 학습 1회, 시각 진행률로 즉시 학습 | 없음 | 가능 | **추천** |
| Two-finger long-press 2s | 어린이 손 크기로 어려움 | 한 손 잡고 한 손 조작 불가 → 부모 불편 | 없음 | 불가 | 대안 |
| 4-digit PIN | 매우 강함 | 부모가 PIN 기억/입력 필요, 첫 설정 흐름 추가 | **있음(숫자)** | 가능 | 제외(텍스트 의존, 마찰 큼) |
| 수학 문제(예: 7+5=?) | iOS 표준 패턴 | 부모 인지 부담, non-numerate 부모 마찰 | **있음(숫자)** | 가능 | 제외 |
| 4모서리 탭 시퀀스 | 어린이 학습 가능성 시간문제 | 부모 학습 1회, 한 손 가능 | 없음 | 가능 | 대안 |
| 시스템 잠금(OS Guided Access) | 매우 강함 | 부모가 OS 단 설정 필요 | 없음 | — | 범위 밖 |

**결정**: Hold-to-fill 1.5s + 우상단 ⚙️ 작은 아이콘 + 5분 idle 잠금 + 파괴적 동작 2s 이중 게이트.

**근거 요약**:
- 4–6세 우연 진입 차단: 길게 누르기 1초를 일관되게 유지하기 어렵고, 손 떼기 후 무반응이라 학습 강화도 일어나지 않는다.
- 부모 1회 학습으로 충분(시각 진행률이 즉시 가르친다).
- 텍스트/숫자/언어 의존 0 — 글 못 읽는 부모 사용자 케이스도 안전.
- 한 손 동작 가능 — 어린이 안고 있는 부모도 사용.
- 본 앱 데이터 민감도(개인정보 없음, 결제 없음)에 비해 PIN/수학 문제는 과한 마찰.

## 위협 모델

| 경로 | 위협 | 완화 |
| --- | --- | --- |
| 우연한 길게 누르기 | 4–6세가 ⚙️를 1.5초 이상 잡아 부모 영역 진입 | hit area를 의도적으로 작게(44×44), 시각 톤 muted, 진행률 ring을 어린이 가시 영역의 시선 끌지 않게 회색. 진입해도 파괴적 동작은 이중 게이트가 추가 차단. |
| 형(8세+)이 부모 영역 학습 | 디지털 네이티브 형이 동생 어항을 망가뜨림 | 본 스펙 범위 밖(가정 내 신뢰 모델). 파괴적 동작 이중 게이트로 우발 데이터 손실만 차단. 멀티 프로필은 S-025f 후보. |
| 새로고침/재진입 후 잠금 우회 | 어린이가 새로고침해도 부모 모드가 유지되어 위험 동작 가능 | `parentMode`를 **localStorage에 저장하지 않는다**. 항상 잠금 상태로 시작. |
| 부모 영역 안에서 어린이 손 침입 | 부모가 열어둔 채로 자리를 비웠을 때 어린이 탭 | 5분 idle 자동 잠금 + 파괴적 동작 이중 게이트. |
| OS 접근성 도구(스크린리더) 우회 | 스크린리더가 ⚙️를 단순 탭으로 활성화 | ⚙️는 `role="button"` + `aria-label="설정(부모용)"` + `data-gate="hold-to-fill"` 메타. 활성화는 hold 동작만, 단순 클릭은 무반응. 접근성 사용자는 별도 키보드 hold(Space 1.5s) 지원. |
| 키보드 사용자 | 1.5s hold가 키보드에서 어색할 수 있음 | Space 1.5s long-press 동등 처리(`keydown` 시작, `keyup` 시 ring 완료 여부 확인). 도중에 떼면 무반응. |
| 햅틱 부재 디바이스 | 진행률 시각만으로 학습 가능 여부 | 시각 ring 자체가 1차 신호, 햅틱은 보조. |

## 검증 기준

- [ ] 우상단 ⚙️ 아이콘이 어린이 ❓ 도움말 버튼과 16px 이상 간격으로 배치되고, hit area 44×44를 만족한다.
- [ ] ⚙️ 단순 탭은 아무 반응도 일으키지 않는다(시각/햅틱/소리 0).
- [ ] ⚙️ 누름 시작 시 진행률 ring이 단조로 1.5s 동안 채워진다.
- [ ] 1.5s 도달 시 30ms 햅틱이 발생하고(지원 디바이스) 부모 영역이 슬라이드-인된다.
- [ ] 1.5s 도달 전 손을 떼면 ring이 즉시 0%로 리셋되며 다른 어떤 표시도 남지 않는다.
- [ ] `prefers-reduced-motion` 활성 시 ring은 단조 fade-fill이고 슬라이드-인은 0.2s fade로 대체된다.
- [ ] Space 1.5s long-press(키보드)도 동일하게 동작한다. 브라우저 OS 자동 반복(`keydown` 반복 이벤트)은 무시된다.
- [ ] ⚙️ 버튼이 `role="button"` + `aria-label="설정(부모용)"`를 가지며, hold 중에는 `aria-pressed="true"`.
- [ ] ring 요소가 `role="progressbar"` + `aria-valuemin="0"` + `aria-valuemax="1500"`를 가지며 진행에 따라 `aria-valuenow`가 갱신된다(200ms 디바운스).
- [ ] hold 시작 시 스크린리더에 “1.5초 동안 누르세요”, 완료 시 “부모 영역 열림”이 1회 announce된다.
- [ ] pointermove 취소 임계가 touch에서 16px, mouse에서 8px로 차등 적용된다.
- [ ] 부모 영역이 열려 있는 동안 어린이 영역 인터랙션은 차단된다(어항/물고기 탭 무반응).
- [ ] 부모 영역에서 5분 동안 입력이 없으면 자동 잠금되어 부모 영역이 닫힌다.
- [ ] 새로고침 후 항상 잠금 상태로 시작한다(`appState.parentMode.unlocked === false`).
- [ ] 좌상단 ✕ 또는 배경 탭으로 부모 영역을 닫을 수 있다.
- [ ] 파괴적 동작(계정 삭제, OAuth 언링크) 버튼은 2초 hold-to-fill을 만족해야만 실행된다.
- [ ] 이중 게이트 hold-to-fill 도중 손을 떼면 아무 동작도 실행되지 않는다.
- [ ] 어린이 영역에서는 부모 영역 슬롯(sync indicator, 충돌 카드 등)이 절대 표시되지 않는다(S-025a 정책 일관).
- [ ] 모든 시각 변화의 깜빡임 빈도가 3Hz 미만이다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm test`(이중 게이트/idle 타이머/진입 상태 머신 단위 테스트 포함)가 통과한다.
- [ ] `npm run lint`, `npm run build`, `npm run cleanup`이 모두 통과한다.

## 구현 메모

- 관련 파일(예상):
  - 신규: `src/features/parent-area/index.js`, `state.js`, `view.js`, `events.js`, `gate.js`(hold-to-fill 상태 머신), `idle.js`(5분 타이머).
  - 신규 테스트: `state.test.js`(idle 타이머/잠금 상태), `gate.test.js`(1.5s/2s 임계, 중도 취소).
  - 신규 스타일: `src/styles/components/parent-area.css`(슬롯 패널, ⚙️ ring, 이중 게이트 위험 톤). `src/styles/index.css`에 cascade 순서 반영.
  - 수정: `src/main.js`(우상단 ⚙️ 마운트), `src/features/aquarium/storage/`(부모 영역 슬롯 콜백 등록), `ARCHITECTURE.md`(parent-area feature 항목 추가).
- 외부 의존성: 추가 npm 패키지 없음. Vibration API/`prefers-reduced-motion`은 표준 브라우저 기능.
- 상태 머신 골격(`gate.js`):
  ```
  idle → holding(at: ms) → completed | cancelled
    holding 중 pointerup/keyup before 1500ms → cancelled
    holding 중 pointermove > 16px(touch) / 8px(mouse) → cancelled(스크롤 의도와 분리)
    holding 1500ms 경과 → completed (haptic + slide-in)
  ```
  - **pointermove 임계 트레이드오프**: 부모가 떨림(가벼운 손떨림/한 손으로 디바이스 잡은 상태)으로 5~10px 미세 이동이 발생하는 케이스가 보고된다. 터치는 16px, 마우스는 8px로 차등 적용해 부모 의도 vs 스크롤 의도를 분리. 본 임계는 첫 베타 텔레메트리(중도 취소율)로 조정.
- 접근성 보강:
  - ⚙️ 버튼은 `role="button"` + `aria-label="설정(부모용)"` + `aria-describedby="parent-gate-hint"` + `aria-pressed`(holding 중 `true`).
  - hold 진행률을 스크린리더가 인지할 수 있도록 `aria-valuemin="0"` `aria-valuemax="1500"` `aria-valuenow="<ms>"` `role="progressbar"`를 ring 요소에 추가. 단, 200ms 디바운스(매 ms마다 announce 폭주 방지).
  - hold 시작 시 스크린리더에 “1.5초 동안 누르세요” 1회 announcement(`aria-live="polite"`).
  - hold 완료 시 “부모 영역 열림” 1회 announcement.
  - 키보드 hold(Space)는 `keydown` 시작/`keyup` 종료. `keydown` 자동 반복(브라우저 OS key repeat)은 무시(첫 `keydown`만 카운트).
- ⚙️ 아이콘 디자인 정책: 단색, 점멸 없음, hover 효과 없음(어린이 시각 신호 최소화).

## SP

**5 SP** — hold-to-fill 상태 머신 + 이중 게이트 + 5분 idle + 슬라이드-인 + 어린이 인터랙션 잠금 + 접근성(키보드, prefers-reduced-motion). 호스트 슬롯은 본 스펙이 채우지 않으므로 구현 폭은 한정.

## Files To Add or Change

| Path | Action | Purpose |
| --- | --- | --- |
| `src/features/parent-area/index.js` | add | 외부 진입점, ⚙️ 마운트, 슬롯 콜백 등록. |
| `src/features/parent-area/state.js` | add | `appState.parentMode` 정규화/타이머. |
| `src/features/parent-area/gate.js` | add | hold-to-fill 1.5s + 이중 게이트 2s 상태 머신. |
| `src/features/parent-area/idle.js` | add | 5분 idle 자동 잠금 타이머. |
| `src/features/parent-area/view.js` | add | 슬라이드-인 패널 + 슬롯 자리. |
| `src/features/parent-area/events.js` | add | pointer/keyboard 이벤트 바인딩. |
| `src/features/parent-area/state.test.js` | add | idle/잠금 상태 단위 테스트. |
| `src/features/parent-area/gate.test.js` | add | 1.5s/2s 임계, 중도 취소, 키보드 동등 처리. |
| `src/styles/components/parent-area.css` | add | 슬롯 패널 + ring + 이중 게이트 위험 톤. |
| `src/styles/index.css` | change | parent-area.css cascade 순서 반영. |
| `src/main.js` | change | 우상단 ⚙️ 마운트와 어린이 영역 잠금 wiring. |
| `ARCHITECTURE.md` | change | `src/features/parent-area/` 항목 추가. |
| `SPEC.md` | change | S-026 row 추가(draft). |
| `docs/spec/S-025-backend-foundation.md` | change | Open Question을 본 스펙으로 연결. |
| `docs/spec/S-025a-device-id-and-storage-adapter.md` | change | Open Question을 본 스펙으로 연결. |
| `docs/spec/S-026-parent-area-gate.md` | add | 본 문서. |

## Open Questions

- ⚙️ 아이콘을 항상 노출할지, 어린이 영역에서 일정 조건(예: 부모 영역 미사용 7일 이상) 시 살짝 강조할지. → 본 스펙은 **항상 노출 + muted**로 단순화. 강조는 도입하지 않는다(어린이 시선 끌기 방지가 더 큰 가치).
- 5분 idle 시간을 더 짧게(예: 2분) 할지. → 부모가 백업/복원 작업 중 다이얼로그를 읽고 결정할 시간을 보장하기 위해 5분 권장. 첫 베타에서 텔레메트리 측정 후 조정.
- 파괴적 동작 hold 시간 2초가 충분한지. → 본 스펙은 2초로 시작. 실측에서 부모 우발 트리거 사례가 보고되면 3초로 상향.
- 키보드 사용자에 대한 alternative gate(예: Space hold 대신 키 시퀀스)를 도입할지. → 본 스펙은 Space 1.5s long-press로 통일. 별도 시퀀스는 도입하지 않는다.
- 형(8세+) 시나리오는 본 스펙 범위 밖. 멀티 프로필은 S-025f(미정) 후보.

## Next Step

1. 본 스펙을 사람이 검토해 `ready`로 전환한다.
2. `ready` 후 다음 순서로 PR을 쪼개는 것을 권장한다.
   1. `parent-area/state.js` + `gate.js` + `idle.js` + 단위 테스트(상태 머신 검증).
   2. `view.js` + `events.js` + ⚙️ 마운트(어린이 영역 잠금 wiring 포함).
   3. 이중 게이트 컨트롤 유틸(파괴적 동작 호스트 스펙들이 import해서 사용).
   4. 부모 영역 슬롯 자리만 렌더(S-025a/S-025c/S-025d 위젯은 각 호스트 스펙에서 채움).
3. 본 스펙이 done이 되면 S-025/S-025a Open Questions의 “부모 영역 게이트 위치”가 해소된다.
