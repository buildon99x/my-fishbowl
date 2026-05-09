# S-024 어린이 터치 타겟 상향 — 구현 기획

## 변경 범위 요약

본 패치는 **디자인 토큰 추가 + 컴포넌트 CSS 갱신 + 자동 검증 테스트** 3개 묶음.
JS 로직 변경은 거의 없고, CSS 토큰화가 핵심.

## 모듈 구조

```
src/styles/
├── tokens.css         # 신규 — 디자인 토큰 (touch target, spacing, color)
├── base.css           # 토큰 import (수정)
└── components.css     # 토큰 변수 참조로 갱신 (수정)

tests/
└── touch-target.test.js  # 신규 — Playwright 자동 검증
```

## 디자인 토큰

```css
/* src/styles/tokens.css */
:root {
  /* Touch targets */
  --touch-target-child: 48px;
  --touch-target-child-lg: 56px;     /* 권장 */
  --touch-target-child-xl: 64px;     /* 핵심 액션 */
  --touch-target-adult: 44px;

  /* Spacing */
  --touch-spacing-child: 12px;
  --touch-spacing-adult: 8px;

  /* Slider handles */
  --slider-handle-child: 36px;
  --slider-handle-adult: 24px;
}
```

`base.css`에 import:
```css
/* src/styles/base.css */
@import './tokens.css';
```

## 컴포넌트별 CSS 갱신

### prop-panel (S-013)

```css
/* src/styles/components.css (수정 부분) */
.prop-panel {
  width: 340px;            /* 320 → 340 */
  padding: 16px;
}
@media (max-width: 760px) {
  .prop-panel { width: calc(100vw - 32px); }
}

.prop-panel__close,
.prop-panel__action-btn {
  min-width: var(--touch-target-child);
  min-height: var(--touch-target-child);
}

.prop-panel__row {
  min-height: var(--touch-target-child);
  display: flex; align-items: center;
  gap: var(--touch-spacing-child);
}

.prop-panel input[type="range"] {
  height: var(--touch-target-child);   /* 트랙 영역 클릭 가능 */
}
.prop-panel input[type="range"]::-webkit-slider-thumb {
  width: var(--slider-handle-child);
  height: var(--slider-handle-child);
}
.prop-panel input[type="range"]::-moz-range-thumb {
  width: var(--slider-handle-child);
  height: var(--slider-handle-child);
}
```

### segmented control (S-020)

```css
.segmented-control {
  display: flex; gap: 4px;
  background: var(--color-surface-2);
  border-radius: 12px; padding: 4px;
}
.segmented-control__cell {
  flex: 1;
  min-height: var(--touch-target-child-lg);  /* 56px */
  display: flex; align-items: center; justify-content: center;
  gap: 6px;
  font-size: 16px;
  border-radius: 10px;
}
.segmented-control__cell .icon { font-size: 20px; }
.segmented-control__cell[aria-pressed="true"] {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### 액션 클러스터 (이슈 #14)

```css
.action-cluster {
  display: flex; gap: var(--touch-spacing-child);
  position: absolute; bottom: 24px; right: 24px;
}
.action-cluster__btn {
  width: var(--touch-target-child-lg);   /* 56 */
  height: var(--touch-target-child-lg);
  border-radius: 50%;
  font-size: 28px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
```

### Hit area > Visual area 패턴 (그리기 색상 팔레트, S-003)

```css
.color-palette__btn {
  min-width: var(--touch-target-child-lg);   /* hit 56 */
  min-height: var(--touch-target-child-lg);
  display: grid; place-items: center;
  background: transparent; border: none;
}
.color-palette__swatch {
  width: 32px; height: 32px;                  /* visual 32 */
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.2);
  transition: transform 150ms ease, border-width 150ms ease;
}
.color-palette__btn[aria-pressed="true"] .color-palette__swatch {
  border-width: 4px;
  transform: scale(1.1);
}
```

### 오브젝트 목록 (fish-list)

```css
.fish-list__item {
  min-height: 64px;
  display: flex; align-items: center;
  gap: var(--touch-spacing-child);
  padding: 8px 12px;
}
.fish-list__thumb { width: 48px; height: 48px; border-radius: 8px; }
.fish-list__name  { flex: 1; font-size: 16px; }
.fish-list__action-btn {
  min-width: var(--touch-target-child);
  min-height: var(--touch-target-child);
}
```

### 부모 영역 (그대로 유지)

```css
.parent-area {
  /* 부모 영역은 토큰을 변경하지 않고 직접 값 사용 */
}
.parent-area button,
.parent-area input[type="checkbox"] {
  min-width: var(--touch-target-adult);     /* 44 */
  min-height: var(--touch-target-adult);
}
.parent-area .form-row { gap: var(--touch-spacing-adult); }
```

## JS 변경 (최소)

대부분 CSS만으로 해결되지만, 일부 인라인 스타일이 있는 곳은 클래스로 이전.

```js
// src/features/prop-panel/view.js (예시)
// Before:
//   <button style="width: 44px; height: 44px;">×</button>
// After:
//   <button class="prop-panel__close">×</button>
```

## 자동 검증 테스트

```js
// tests/touch-target.test.js
import { test, expect } from '@playwright/test';

const CHILD_AREA_SELECTORS = [
  '[data-prop-add-fish]',
  '[data-prop-feed]',
  '[data-prop-cleaning]',
  '.prop-panel button',
  '.prop-panel input[type="range"]',
  '.color-palette__btn',
  '.btn-tool',
  '.fish-list__item button',
  '.segmented-control__cell',
];

const PARENT_AREA_SELECTORS = [
  '.parent-area button',
];

test.describe('Touch target sizes', () => {
  test('child area >= 48x48', async ({ page }) => {
    await page.goto('/');
    for (const sel of CHILD_AREA_SELECTORS) {
      const els = await page.locator(sel).all();
      for (const el of els) {
        if (!(await el.isVisible())) continue;
        const box = await el.boundingBox();
        if (!box) continue;
        expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(48);
        expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(48);
      }
    }
  });

  test('parent area >= 44x44', async ({ page }) => {
    await page.goto('/?godmode=1');
    for (const sel of PARENT_AREA_SELECTORS) {
      const els = await page.locator(sel).all();
      for (const el of els) {
        const box = await el.boundingBox();
        if (!box) continue;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('adjacent interactive elements have >= 8px gap', async ({ page }) => {
    await page.goto('/');
    // 액션 클러스터 내부 인접 버튼 검증
    const btns = await page.locator('.action-cluster__btn').all();
    for (let i = 0; i < btns.length - 1; i++) {
      const a = await btns[i].boundingBox();
      const b = await btns[i+1].boundingBox();
      const gap = Math.abs(b.x - (a.x + a.width));
      expect(gap, 'action-cluster gap').toBeGreaterThanOrEqual(8);
    }
  });

  test('mobile 360px width: prop-panel does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await page.goto('/');
    await page.click('[data-prop-add-fish]');
    const panel = page.locator('.prop-panel');
    const box = await panel.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(360);
  });
});
```

## 마이그레이션 절차

1. `src/styles/tokens.css` 추가, `base.css`에 import.
2. `components.css`에서 hardcoded 픽셀값을 토큰 변수로 치환:
   - sed 또는 IDE 일괄 치환:
     - `width: 44px;` → `width: var(--touch-target-child);` (어린이 영역)
     - `width: 44px;` → `width: var(--touch-target-adult);` (부모 영역)
   - 수동 검토 필수 (영역 분류 자동화 불가).
3. 인라인 스타일 사용처를 클래스로 치환.
4. `tests/touch-target.test.js` 작성.
5. `npm run test:e2e` 또는 `npx playwright test tests/touch-target.test.js` 실행.
6. 시각 회귀 검증:
   - 모바일 360px / 768px / 데스크톱 1280px 3개 viewport에서 스크린샷 비교.
7. 부모 영역(설정, GodMode)에 회귀 없는지 별도 확인.

## 영향받는 파일 체크리스트

| 파일 | 변경 |
|---|---|
| `src/styles/tokens.css` | 신규 |
| `src/styles/base.css` | import 추가 |
| `src/styles/components.css` | 픽셀 → 토큰 변수 치환 |
| `src/features/prop-panel/view.js` | 인라인 → 클래스 (부분) |
| `src/features/prop-panel-segmented/view.js` | 셀 높이 / 라벨 갱신 |
| `src/features/fish-list/view.js` | 항목 행 클래스 추가 |
| `tests/touch-target.test.js` | 신규 |
| `playwright.config.js` | 모바일 viewport 추가 |

## 회귀 위험

- **기존 디자인이 약간 더 커짐**: 모바일 360px에서 prop-panel 수직 길이 증가 → 한 화면에 안 들어올 수 있음. 자동 테스트 외 시각 검증 필요.
- **일부 컴포넌트 인라인 스타일 잔존 가능**: grep `style=` 으로 점검 권장.
- **GodMode 진입 후 부모 영역 확인 필요**: 다른 영역으로 분류 누락 위험.

## 테스트 시나리오 추가

### 단위 테스트 (Vitest)
별도로 토큰 값을 테스트할 필요는 없음 (CSS 변수 = 정적 값). E2E 테스트가 본질적으로 충분.

### 시각 회귀 (Playwright snapshot)
```js
test('prop-panel screenshot 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await page.goto('/');
  await page.click('[data-prop-add-fish]');
  await expect(page.locator('.prop-panel')).toHaveScreenshot('prop-panel-360.png');
});
```

## 성능·안전 가드

- 토큰 변경은 정적 CSS, 런타임 영향 없음.
- 자동 테스트가 회귀 잡아냄.
- 부모 영역 영향 없음 (별도 변수).

## 신규 개발자 사용 가이드

```css
/* 새 어린이 영역 컴포넌트 */
.my-child-component button {
  min-width: var(--touch-target-child);
  min-height: var(--touch-target-child);
}

/* Hit area > Visual area 필요 시 */
.my-icon-btn {
  min-width: var(--touch-target-child-lg);
  min-height: var(--touch-target-child-lg);
  padding: 12px;        /* 시각 영역 = 56 - 24 = 32px */
}
```

## 의존성 추가

- 없음.
- (옵션) Playwright snapshot 테스트 활성화: `npx playwright install`
