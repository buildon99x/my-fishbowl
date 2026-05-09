# S-020 Prop Type Classification (v2 — UX 개선안)

## 변경 개요

이 문서는 `S-020-prop-type-classification.md`의 후속 개선안이다.
원본 스펙의 데이터 모델/처리 요구사항은 그대로 유지하고, **사용자 경험(특히 어린이 사용자)** 관점에서 발견성/회복성/접근성/감성 피드백을 보강한다.

원본에서 그대로 유지하는 항목은 본 문서에서 반복하지 않는다. 본 문서는 **차이점과 추가 요구사항만** 기술한다.

## UX 리뷰 요약 (원본 v1의 한계)

| # | 영역 | v1의 한계 | 개선 방향 |
|---|------|-----------|-----------|
| 1 | 타입 라벨 | "장식"이라는 추상 단어. 어린이가 의미를 직관적으로 파악하기 어려움 | 아이콘 + 텍스트 조합, 행동 기반 보조 설명 |
| 2 | 타입 변경 진입점 | prop-panel 내부 segmented control 1곳뿐 | 목록 항목에서도 빠른 토글 제공 (선택사항) |
| 3 | 카운트 표시 | `전체 5 · 물고기 3 · 장식 2` 텍스트 위주 | 아이콘 칩(chip)으로 시각화, 색상으로 구분 |
| 4 | 상태 피드백 | 텍스트만, 표시/소멸 정책 미정의 | aria-live, 자동 dismiss(3.5s), 부드러운 fade |
| 5 | 빈 상태 | 명세 없음 | 첫 사용자/장식 0개일 때 가이드 메시지 |
| 6 | 삭제 회복 | 즉시 삭제, 어린이 실수 시 복구 불가 | Undo 스낵바(5s) |
| 7 | 시각 신호 | "드래그 가능하다는 시각 신호" 추상적 | hover/active cursor, glow ring, 등록 직후 pulse |
| 8 | 컨트롤 전환 | 타입 변경 시 Movement 컨트롤이 갑자기 사라짐 | height transition, 사라진 컨트롤 자리에 안내 문구 |
| 9 | 색맹 접근성 | badge 색상만으로 타입 구분 위험 | 아이콘 + 색상 + 텍스트 3중 채널 |
| 10 | 터치/모바일 | drag 인터랙션 명세 부족 | long-press 시작, 햅틱 트리거 권장 |
| 11 | 등록 후 위치 충돌 | deco 기본값 `x:50, y:78` 고정 → 여러 개 겹침 | jitter ±8% 또는 빈자리 탐색 |
| 12 | 동적 라벨 변경 | "물고기 이름" ↔ "장식 이름" placeholder 미정의 | 예시 텍스트도 함께 전환 |

## UX 원칙 (개선안)

1. **어린이 우선 어휘**: 한자어/외래어 대신 행동·감정 기반 표현. 단, 이미 합의된 `오브젝트`, `물고기`, `장식`은 일관성을 위해 유지하되 보조 설명을 더한다.
2. **즉시 회복 가능성**: 모든 파괴적/혼동 가능 액션은 5초 이내 되돌릴 수 있어야 한다.
3. **3중 시각 채널**: 타입 구분은 아이콘 + 색상 + 텍스트 셋 중 최소 둘로 표현한다.
4. **부드러운 전환**: 컨트롤이 나타나거나 사라질 때 200~250ms transition을 사용한다.
5. **알림은 비파괴적**: 모달/얼럿 대신 inline status, snackbar, aria-live region을 사용한다.

## UI 요구사항 (보강)

### 타입 선택 segmented control

원본: `물고기 | 장식` 두 옵션, 기본값 `물고기`.

추가 요구사항:

- 각 옵션에 **아이콘 + 텍스트** 조합으로 표시.
  - `물고기`: 🐟 아이콘 또는 SVG fish glyph
  - `장식`: 🪨 또는 🌿 아이콘 또는 SVG deco glyph
- 선택된 옵션은 색상 배경 + 테두리로 강조하고, 미선택 옵션은 70% 명도로 낮춘다.
- 옵션 아래(또는 옆)에 1줄 보조 설명을 표시한다.
  - 물고기 선택: `헤엄치고 먹이를 먹어요`
  - 장식 선택: `가만히 있어요. 배경을 꾸며요`
- 키보드: ←/→로 옵션 이동, Space/Enter로 선택. Tab은 다음 컨트롤로 이동.
- aria role: `radiogroup`, 각 옵션은 `radio`. group label은 `종류를 골라요`.

### 오브젝트 추가 패널

추가 요구사항:

- **이름 입력 placeholder**도 타입에 따라 전환한다.
  - fish: `예: 노랑이`
  - deco: `예: 동그란 돌`
- **타입 변경 시 미리보기 영역**에 짧은 미세 인터랙션을 적용해 차이를 보여준다.
  - fish: preview sprite가 0.6s 동안 좌우로 8px 흔들리는 애니메이션 1회 재생.
  - deco: preview sprite가 정지 상태로 표시되고, 모서리에 작은 잎/돌 아이콘 오버레이 표시.
- 등록 직후 status 메시지는 **3.5초 후 자동 dismiss**, aria-live="polite".
- 패널을 닫는 ESC, 외부 클릭 동작은 기존과 동일하되, 입력 도중에는 `정말 닫을까요?` 대신 **draft를 자동 보존**해 다시 열면 복원되도록 한다(이미 v1에 부분적으로 함의된 동작을 명시화).

### 오브젝트 목록

추가 요구사항:

- 카운트 표시는 **칩(chip) 형태**로 변경.
  - `전체 5` (중립색)
  - `🐟 3` (fish 액센트 색)
  - `🪨 2` (deco 액센트 색)
  - 카운트가 0인 타입 칩은 회색으로 비활성화 표시(숨기지 않음 → 사용자가 "장식도 추가할 수 있구나"를 학습).
- 항목 badge는 **아이콘 + 짧은 텍스트** (`🐟 물고기`, `🪨 장식`).
- **항목 hover/focus 시** 행 우측에 quick action으로 `타입 바꾸기` 토글 버튼을 노출한다(선택 구현, prop-panel 진입 없이 즉시 전환).
  - 키보드 접근 가능: 항목 focus → Tab으로 quick action 이동.
  - aria-label: `이 오브젝트를 장식으로 바꾸기` / `이 오브젝트를 물고기로 바꾸기`.
- **삭제는 Undo 패턴**으로 변경.
  - 삭제 클릭 즉시 항목을 목록에서 제거하고, 화면 하단에 5초간 스낵바 표시.
  - 스낵바 문구: `<name>을(를) 지웠어요.` + `되돌리기` 버튼.
  - 5초 내 되돌리기 미클릭 시 영구 삭제 commit. 그 전까지는 메모리 상에서 soft-deleted 상태로 보관.
  - 어린이의 실수 삭제 보호가 본 스펙의 핵심 UX 가치다.
- **빈 상태 가이드**:
  - 오브젝트 0개: 일러스트 + `위쪽 + 버튼을 눌러 첫 친구를 만들어 보세요!`
  - 물고기는 있고 장식 0개: 카운트 칩 옆에 작은 hint `장식도 추가할 수 있어요`(첫 fish 등록 후 1회만 노출, dismiss 가능).

### 속성 편집 패널

추가 요구사항:

- 종류 segmented control은 **panel 최상단**, header 바로 아래에 sticky로 둔다. 스크롤해도 항상 보이게 한다(어린이가 잘못 등록 후 회복 경로를 항상 인지하도록).
- 종류 변경 시 컨트롤 추가/제거는 **height transition 220ms ease-out**으로 부드럽게 처리한다.
- fish → deco로 바뀌어 사라진 컨트롤(머리 방향, 움직임) 자리에 짧은 안내 문구를 1회 fade-in 후 fade-out 한다(2초): `움직임 설정은 물고기일 때만 보여요.`
- panel header badge는 아이콘 + 텍스트(`🐟 물고기`, `🪨 장식`).
- 타입 변경 status 영역은 **aria-live="polite"**, 3.5초 후 자동 dismiss, fade transition.
- 종류 컨트롤에 보조 설명 1줄(타입 선택 segmented control과 동일 문구) 표시.

### 등록 직후 강조

추가 요구사항:

- 새로 등록된 오브젝트는 **2초간 glow ring** 애니메이션(scale 1→1.05→1, opacity 0.6→0).
- 동시에 prop-panel이 열리고, "이제 끌어서 위치를 정해 보세요" hint를 panel status에 1회 표시(첫 등록 후 1회만, localStorage flag).
- 키보드 사용자: 등록 직후 prop-panel의 첫 컨트롤(종류 segmented control)에 focus.

### 드래그 시각 신호

추가 요구사항:

- editing 상태의 sprite는 hover 시 cursor `grab`, active 시 `grabbing`.
- editing 상태의 sprite는 1.5px 점선 외곽선 또는 약한 glow를 상시 표시.
- 터치 디바이스: 200ms long-press로 드래그 시작. 시작 시점에 가능하면 navigator.vibrate(10)로 가벼운 햅틱(폴리필 없는 환경에서는 무시).

## 데이터 모델 보강

원본의 타입 정의를 유지하되, **다음 필드를 추가**한다.

```ts
type UserPropBase = {
  // ... 기존 필드 유지
  pendingDelete?: boolean;     // Undo 패턴용 soft-delete flag
  pendingDeleteAt?: string;    // soft-delete 시각 (5s 후 commit 판정에 사용)
};
```

- `normalizeAquarium`은 로드 시 `pendingDelete === true`인 항목을 hard delete 한다(앱 종료 후 재로드 시점에는 되돌리기 의도가 만료된 것으로 간주).
- 렌더링/movement/feeding/list는 모두 `pendingDelete !== true` 조건으로 필터링한다.

## 처리 요구사항 보강

### 등록 — 위치 충돌 회피

원본의 deco 기본값 `x: 50, y: 78`을 유지하되, **이미 같은 좌표 ±5% 내에 다른 prop이 있으면**:

- x를 ±8% 범위에서 무작위 jitter.
- 5회 시도 후에도 충돌이면 `y`를 70~85% 범위에서도 jitter.
- 동일 로직을 fish 기본 위치에도 적용한다(여러 fish 연속 등록 시 겹침 완화).

### 삭제 (Undo)

- 사용자 삭제 클릭 → 즉시 `pendingDelete=true`, `pendingDeleteAt=now()` 설정.
- 5초 setTimeout 후 `pendingDelete`이면 배열에서 제거.
- 되돌리기 클릭 → `pendingDelete=false`, `pendingDeleteAt` 제거.
- 같은 항목에 다시 삭제 클릭 시(드물지만) 기존 timer 취소 후 재시작.
- 삭제 중인 항목이 prop-panel에서 편집 중이었다면 패널은 닫고, 되돌리기 시 재선택은 하지 않는다(혼동 방지).

### 타입 전환 피드백

- panel status 표시는 **aria-live="polite" + role="status"**.
- 표시 시간: 3500ms, fade-out 250ms.
- 짧은 시간 내 연속 토글 시 이전 status를 즉시 교체(큐 쌓지 않음).

## 접근성 요구사항 (신규 섹션)

- 모든 segmented control: radiogroup/radio 패턴, 키보드 ←→ 이동.
- 모든 status feedback: `aria-live="polite"`.
- 삭제 Undo 스낵바: `role="status"`, 되돌리기 버튼 포커스 가능, ESC로 dismiss(되돌리기 없이 즉시 commit).
- 색상 대비: 타입 badge/칩의 텍스트 대비 4.5:1 이상.
- 색맹: 타입 구분에 색상만 사용 금지(아이콘+텍스트 동반).
- 모션 감수성: `prefers-reduced-motion: reduce` 시 등록 직후 glow, height transition, preview wiggle을 모두 비활성화하고 즉시 상태 적용.

## 마이크로카피 (신규 섹션)

| 위치 | v1 문구 | v2 문구 |
|------|---------|---------|
| 타입 선택 group label | (없음) | `종류를 골라요` |
| fish 옵션 보조 | (없음) | `헤엄치고 먹이를 먹어요` |
| deco 옵션 보조 | (없음) | `가만히 있어요. 배경을 꾸며요` |
| fish 등록 후 status | `<name> is ready as a fish sprite.` | `<name>이(가) 헤엄칠 준비를 마쳤어요!` |
| deco 등록 후 status | `<name> is ready as a decoration object.` | `<name>이(가) 자리를 잡았어요!` |
| fish→deco status | `장식으로 바뀌었어요. 이제 움직이지 않아요.` | (유지) |
| deco→fish status | `물고기로 바뀌었어요. 다시 헤엄칠 수 있어요.` | (유지) |
| deco panel 안내 | `장식은 움직이지 않아요.` | `장식은 가만히 있어요. 끌어서 자리를 옮길 수 있어요.` |
| 빈 상태 | (없음) | `위쪽 + 버튼을 눌러 첫 친구를 만들어 보세요!` |
| 삭제 Undo | (없음) | `<name>을(를) 지웠어요.` + 되돌리기 |
| Movement 안내 | (없음) | `움직임 설정은 물고기일 때만 보여요.` |

상태 문구는 한국어 표시명에 한정한다. 영어 혼용(`is ready as ...`)은 어린이 친화 톤에 맞지 않아 한국어로 통일한다.

## 검증 기준 (v1에 추가)

원본의 검증 기준을 모두 유지하고 다음을 추가한다.

- [ ] 타입 선택 segmented control의 각 옵션에 아이콘과 보조 설명이 표시된다.
- [ ] 타입 선택을 바꾸면 미리보기 영역의 인터랙션(흔들림/정지)이 즉시 반영된다.
- [ ] 등록/타입 전환 status 메시지는 약 3.5초 후 자동으로 사라진다.
- [ ] 등록 직후 새 오브젝트는 약 2초간 glow ring 애니메이션이 재생된다.
- [ ] 오브젝트 삭제 직후 5초 동안 되돌리기 스낵바가 표시되고, 클릭 시 항목이 복원된다.
- [ ] 5초 내 되돌리기 미클릭 시 항목이 영구 삭제된다.
- [ ] 앱 새로고침 시 `pendingDelete=true` 항목은 영구 삭제된 상태로 로드된다.
- [ ] 빈 상태(오브젝트 0개)에서 가이드 메시지가 표시된다.
- [ ] 카운트 표시는 칩 형태이고, 카운트 0인 타입도 비활성화 칩으로 함께 보인다.
- [ ] 종류 segmented control은 prop-panel 최상단에 sticky로 고정된다.
- [ ] fish→deco 전환 시 사라지는 컨트롤은 height transition으로 부드럽게 닫힌다.
- [ ] `prefers-reduced-motion: reduce` 환경에서 모든 비필수 애니메이션이 비활성화된다.
- [ ] 모든 segmented control이 키보드 ←→ 화살표로 조작된다.
- [ ] 타입 badge가 색상만이 아니라 아이콘+텍스트로도 구분된다.
- [ ] 같은 좌표에 여러 prop을 연속 등록해도 ±8% jitter로 겹침이 완화된다.
- [ ] 이름 입력 placeholder가 선택된 타입에 따라 전환된다.
- [ ] 터치 디바이스에서 long-press(약 200ms)로 드래그가 시작된다.

## 구현 영향 (참고)

원본의 "관련 파일"에 더해 다음을 고려한다.

- `src/features/fish-list/view.js`: Undo 스낵바 컴포넌트, 빈 상태, 카운트 칩.
- `src/features/fish-list/state.js` (신규 또는 기존 확장): `pendingDelete` timer 관리.
- `src/features/aquarium/model.js`: 로드 시 `pendingDelete` 정리, 등록 시 위치 jitter helper.
- `src/features/prop-panel/view.js`: sticky segmented control, height transition.
- `src/lib/a11y.js` (신규 권장): aria-live announcer 헬퍼.
- 전역 CSS: `prefers-reduced-motion` media query 분기.

## 비포함 (v2도 제외)

- 일러스트 자산 제작(빈 상태용 그림): 디자인 트랙에서 별도 진행.
- 다국어: 본 스펙의 마이크로카피는 한국어 1개 로케일을 가정한다.
- 분석/이벤트 트래킹: 별도 스펙.
