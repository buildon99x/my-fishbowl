# S-009 amendment — 구현 기획

## 요약

S-009 draft에 다음 6개 보강을 구체 구현 수준으로 정의한다.
1. 어린이 친화 성격 라벨
2. 터치 디바이스 회피 정책
3. 마법 모먼트 합류 타이밍
4. 사운드 옵션 (기본 OFF)
5. prop-panel 노출 (badge + 다시 뽑기 버튼, 일일 한도 5회)
6. 데이터 모델 + 마이그레이션

## 영향받는 모듈

| 모듈 | 변경 종류 |
|---|---|
| `src/features/fish-movement/` | 행동 머신에 personality 입력 + 터치 정책 |
| `src/features/fish-movement/personality.js` | 신규 — 라벨 도출, reroll, 마이그레이션 |
| `src/features/prop-panel/` | badge + 다시 뽑기 버튼 추가 |
| `src/state/aquarium.js` | normalizeAquarium에 personality 보정 |
| `src/state/aquarium.test.js` | personality 마이그레이션 테스트 추가 |

## 데이터 모델

```ts
// src/features/fish-movement/personality.js
export type PersonalityLabel = 'lively' | 'gentle' | 'lazy' | 'swift';

export type FishPersonality = {
  speedMultiplier: number;     // 0.7 – 1.4
  idleBias: number;            // 0.0 – 0.4
  preferredDepth: 'top' | 'middle' | 'bottom';
  wavingFrequency: number;     // Hz
  wavingAmplitude: number;     // px
  label: PersonalityLabel;     // 도출값, 자동 갱신
  rerollLog?: { date: string; count: number };  // YYYY-MM-DD
};

export const PERSONALITY_RANGES = {
  speedMultiplier: { min: 0.7, max: 1.4 },
  idleBias:        { min: 0.0, max: 0.4 },
  wavingFrequency: { min: 0.8, max: 1.6 },
  wavingAmplitude: { min: 4,   max: 12 },
};

export const REROLL_DAILY_LIMIT = 5;
```

## 라벨 도출

```js
// src/features/fish-movement/personality.js
export function deriveLabel({ speedMultiplier, idleBias }) {
  if (speedMultiplier >= 1.25) return 'swift';
  if (speedMultiplier >= 1.15 && idleBias <= 0.1) return 'lively';
  if (idleBias > 0.2) return 'lazy';
  return 'gentle';
}

export const LABEL_DISPLAY = {
  lively: { text: '활발한 친구', emoji: '🎉', color: '#FF8E3C' },
  gentle: { text: '온순한 친구', emoji: '🌱', color: '#7DD356' },
  lazy:   { text: '느긋한 친구', emoji: '😌', color: '#A4C8E1' },
  swift:  { text: '재빠른 친구', emoji: '⚡', color: '#FFD93D' },
};
```

## 랜덤 personality 생성

```js
export function createRandomPersonality() {
  const speedMultiplier = randIn(PERSONALITY_RANGES.speedMultiplier);
  const idleBias = randIn(PERSONALITY_RANGES.idleBias);
  const personality = {
    speedMultiplier,
    idleBias,
    preferredDepth: pickWeighted(['top', 'middle', 'bottom'], [0.3, 0.5, 0.2]),
    wavingFrequency: randIn(PERSONALITY_RANGES.wavingFrequency),
    wavingAmplitude: randIn(PERSONALITY_RANGES.wavingAmplitude),
    label: 'gentle',  // 임시
  };
  personality.label = deriveLabel(personality);
  return personality;
}

function randIn({ min, max }) { return min + Math.random() * (max - min); }
function pickWeighted(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
```

## Reroll (일일 한도 5회)

```js
export function rerollPersonality(fish) {
  const today = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
  const log = fish.personality.rerollLog;
  const currentCount = log?.date === today ? log.count : 0;

  if (currentCount >= REROLL_DAILY_LIMIT) {
    return { success: false, reason: 'daily-limit', remaining: 0 };
  }

  const newPersonality = createRandomPersonality();
  newPersonality.rerollLog = { date: today, count: currentCount + 1 };
  fish.personality = newPersonality;
  return { success: true, remaining: REROLL_DAILY_LIMIT - newPersonality.rerollLog.count };
}
```

## 마이그레이션 (normalizeAquarium 보강)

```js
// src/state/aquarium.js (수정)
import { createRandomPersonality, deriveLabel } from '../features/fish-movement/personality.js';

export function normalizeAquarium(raw) {
  const aquarium = {
    fishes: (raw?.fishes ?? []).map(normalizeFish),
    /* ... 기존 필드들 ... */
  };
  return aquarium;
}

function normalizeFish(fish) {
  // 기존 로직 ...

  // personality 마이그레이션
  if (!fish.personality) {
    fish.personality = createRandomPersonality();
  } else {
    // 누락 필드 보정
    const defaults = createRandomPersonality();
    fish.personality = { ...defaults, ...fish.personality };
    // label 재도출 (수치만 있고 label 없는 경우)
    fish.personality.label = deriveLabel(fish.personality);
  }
  return fish;
}
```

## 행동 머신 통합

### 마법 모먼트 grace period (3초 천천히)

```js
// src/features/fish-movement/index.js (수정)
import { getMagicMomentState } from '../magic-moment/index.js';

const GRACE_PERIOD_MS = 3_000;
const GRACE_SPEED_FACTOR = 0.7;

export function tickFish(fish, dt) {
  const now = performance.now();
  const inGrace = fish.spawnedAt && (now - fish.spawnedAt) < GRACE_PERIOD_MS;
  const effectiveSpeed = fish.personality.speedMultiplier * (inGrace ? GRACE_SPEED_FACTOR : 1);

  // 강제 cruising
  if (inGrace && fish.behaviorState !== 'cruising') {
    fish.behaviorState = 'cruising';
  }

  // 기존 행동 머신 로직에 effectiveSpeed 사용
  /* ... */
}
```

`spawnedAt`은 fish 생성 시 (S-021 onComplete 직후) `performance.now()`로 세팅.

### 터치 환경 회피 정책

```js
// src/features/fish-movement/avoidance.js
const DRAG_THRESHOLD_MS = 150;   // 이 시간 이상 down+move = 드래그
const DART_RADIUS_PX = 80;
const STARTLE_DURATION_MS = 300;

let pointerDownAt = 0;
let isDragging = false;

window.addEventListener('pointerdown', (e) => {
  pointerDownAt = performance.now();
  isDragging = false;
});

window.addEventListener('pointermove', (e) => {
  if (pointerDownAt && (performance.now() - pointerDownAt) > DRAG_THRESHOLD_MS) {
    isDragging = true;
    triggerAvoidance(e.clientX, e.clientY);  // 기존 dart 로직
  }
});

window.addEventListener('pointerup', (e) => {
  if (!isDragging && pointerDownAt) {
    triggerStartle(e.clientX, e.clientY);   // 단순 탭 = 놀람 반응
  }
  pointerDownAt = 0;
  isDragging = false;
});

function triggerStartle(x, y) {
  const nearbyFishes = findFishesNear(x, y, DART_RADIUS_PX);
  for (const fish of nearbyFishes) {
    fish.startleUntil = performance.now() + STARTLE_DURATION_MS;
    // tickFish는 startleUntil 동안 정지 후 부드러운 방향 전환
  }
}
```

### 행동 상태 전환 사운드 (옵션)

```js
// src/features/fish-movement/index.js
import { playSound, getSettings as getSoundSettings } from '../sound/index.js';
import { getSettings as getMovementSettings } from './settings.js';

function transitionBehavior(fish, nextState) {
  fish.behaviorState = nextState;
  // 행동 사운드 옵션
  if (getMovementSettings().behaviorSoundEnabled) {
    playSound('ambient.water-loop', { volume: 0.15 });  // 옅은 효과음
  }
}
```

```js
// src/features/fish-movement/settings.js (신규)
const KEY = 'fishbowl.movement.v1';
export function getSettings() {
  try {
    return { behaviorSoundEnabled: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch { return { behaviorSoundEnabled: false }; }
}
export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
}
```

## prop-panel 통합

### Badge 컴포넌트

```js
// src/features/prop-panel/personalityBadge.js
import { LABEL_DISPLAY } from '../fish-movement/personality.js';

export function renderPersonalityBadge(fish) {
  const label = fish.personality?.label;
  if (!label) return '';
  const display = LABEL_DISPLAY[label];
  return `
    <div class="personality-badge" style="background: ${display.color}20; color: ${display.color}">
      <span class="badge-emoji">${display.emoji}</span>
      <span class="badge-text">${display.text}</span>
    </div>
  `;
}
```

### Reroll 버튼

```js
// src/features/prop-panel/view.js (수정 일부)
import { rerollPersonality, REROLL_DAILY_LIMIT } from '../fish-movement/personality.js';
import { saveAquarium } from '../../state/aquarium.js';
import { playSound, playHaptic } from '../sound/index.js';

function renderRerollButton(fish) {
  const today = new Date().toISOString().slice(0, 10);
  const used = fish.personality.rerollLog?.date === today
    ? fish.personality.rerollLog.count : 0;
  const remaining = REROLL_DAILY_LIMIT - used;
  const disabled = remaining <= 0;

  return `
    <button class="btn-reroll" data-action="reroll-personality"
            ${disabled ? 'disabled' : ''} title="오늘 ${remaining}번 더 가능">
      🎲 성격 다시 뽑기 ${disabled ? '(내일 다시!)' : `(${remaining})`}
    </button>
  `;
}

function onRerollClick(fish) {
  const result = rerollPersonality(fish);
  if (result.success) {
    saveAquarium(aquarium);
    playSound('interaction.food-drop');  // 깔깔한 사운드
    playHaptic('medium');
    renderApp();
  }
}
```

### CSS

```css
.personality-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  font-size: 14px; font-weight: 600;
}
.badge-emoji { font-size: 16px; }

.btn-reroll {
  min-height: 48px; min-width: 48px;
  padding: 8px 16px;
  border-radius: 12px;
  background: var(--color-surface-2);
  font-size: 16px;
}
.btn-reroll:disabled { opacity: 0.5; cursor: not-allowed; }
```

## 테스트 시나리오

### personality.test.js
```js
describe('Personality', () => {
  it('createRandomPersonality returns valid ranges', () => {
    const p = createRandomPersonality();
    expect(p.speedMultiplier).toBeGreaterThanOrEqual(0.7);
    expect(p.speedMultiplier).toBeLessThanOrEqual(1.4);
  });

  it('deriveLabel: swift wins over lively when speed >= 1.25', () => {
    expect(deriveLabel({ speedMultiplier: 1.3, idleBias: 0.05 })).toBe('swift');
  });

  it('rerollPersonality respects daily limit', () => {
    const fish = { personality: createRandomPersonality() };
    for (let i = 0; i < 5; i++) {
      expect(rerollPersonality(fish).success).toBe(true);
    }
    expect(rerollPersonality(fish).success).toBe(false);
  });

  it('reroll log resets next day', () => {
    const fish = { personality: { ...createRandomPersonality(),
      rerollLog: { date: '2025-01-01', count: 5 } } };
    // 오늘 reroll → success (date 다름)
    expect(rerollPersonality(fish).success).toBe(true);
  });
});
```

### aquarium.test.js (마이그레이션)
```js
describe('normalizeAquarium personality migration', () => {
  it('adds personality to legacy fish', () => {
    const raw = { fishes: [{ id: 'f1', name: 'Old', x: 50, y: 50 }] };
    const normalized = normalizeAquarium(raw);
    expect(normalized.fishes[0].personality).toBeDefined();
    expect(normalized.fishes[0].personality.label).toMatch(/lively|gentle|lazy|swift/);
  });

  it('preserves existing personality', () => {
    const existing = createRandomPersonality();
    const normalized = normalizeAquarium({ fishes: [{ id: 'f1', personality: existing }] });
    expect(normalized.fishes[0].personality.speedMultiplier).toBe(existing.speedMultiplier);
  });

  it('re-derives label when missing', () => {
    const raw = { fishes: [{ id: 'f1', personality: { speedMultiplier: 1.3, idleBias: 0.05 } }] };
    const normalized = normalizeAquarium(raw);
    expect(normalized.fishes[0].personality.label).toBe('swift');
  });
});
```

### 통합 테스트
```js
test('reroll updates badge', async ({ page }) => {
  await page.goto('/');
  await registerFish(page, 'Test');
  await page.click('[data-fish-id="..."]');  // prop-panel 열기
  const initialLabel = await page.locator('.badge-text').textContent();

  await page.click('[data-action="reroll-personality"]');
  // 1/30 확률로 같은 라벨이 나올 수 있음 — 5회 시도해서 변화 검증
  let changed = false;
  for (let i = 0; i < 5 && !changed; i++) {
    await page.click('[data-action="reroll-personality"]');
    const newLabel = await page.locator('.badge-text').textContent();
    if (newLabel !== initialLabel) changed = true;
  }
  expect(changed).toBe(true);
});
```

## 성능·안전 가드

- personality는 fish 생성 시 1회 계산, 변경 시에만 재할당.
- `tickFish` 핫패스에서 personality 객체 직접 참조 (allocation 없음).
- reroll 버튼 클릭 시 saveAquarium 1회 호출.
- 사운드 옵션 기본 OFF로 10마리 환경 청각 부담 회피.

## 마이그레이션 절차

1. 코드 배포: `normalizeAquarium`이 personality 누락 시 자동 보정.
2. 사용자가 앱을 열면 첫 `loadAquarium` 시점에 마이그레이션 자동 적용.
3. 변경 후 `saveAquarium` 1회 호출되어 영속화.
4. 마이그레이션 실패 시 로그 → 빈 personality (createRandom)로 복구 가능.

## 의존성 추가

- 없음.

## 신규 개발자 사용 예시

```js
import { createRandomPersonality, deriveLabel, rerollPersonality } from '@/features/fish-movement/personality';

const p = createRandomPersonality();
console.log(p.label);  // 'lively'

const result = rerollPersonality(fish);
if (!result.success) showToast(`내일 다시 시도해 보세요!`);
```
