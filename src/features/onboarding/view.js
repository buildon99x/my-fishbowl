function ghostFinger(extraClass = '') {
  return `
    <svg class="onboarding-ghost-finger ${extraClass}" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="56" rx="14" ry="4" fill="rgba(0,0,0,0.18)" />
      <path d="M22 40 L22 18 a4 4 0 0 1 8 0 L30 30 L30 8 a4 4 0 0 1 8 0 L38 32 L38 14 a4 4 0 0 1 8 0 L46 36 L46 22 a4 4 0 0 1 8 0 L54 44 a14 14 0 0 1 -28 0 Z"
        fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.25)" stroke-width="1.5" />
    </svg>
  `;
}

export function renderOnboardingOverlay(state) {
  if (state.completed || state.sequence === 'done') return '';
  const seq = state.sequence;
  let inner = '';
  if (seq === 1) {
    inner = `
      <button type="button" class="onboarding-cta-plus" data-onboarding-cta aria-label="물고기 만들기">+</button>
      ${ghostFinger('is-tap')}
      <p class="onboarding-caption">물고기를 만들어 보세요</p>
    `;
  } else if (seq === 3) {
    inner = `
      <div class="onboarding-pulse-target" data-onboarding-pulse-target></div>
      ${ghostFinger('is-point-register')}
    `;
  } else if (seq === 4) {
    inner = `
      ${ghostFinger('is-point-prop')}
    `;
  }
  return `
    <div class="onboarding-overlay" data-onboarding-overlay data-sequence="${seq}">
      ${inner}
    </div>
  `;
}

export function renderHelpButton() {
  return `
    <button
      type="button"
      class="onboarding-help-btn"
      data-onboarding-help
      aria-label="도움말 다시 보기"
    >❓</button>
  `;
}

export function renderCanvasOutlineGuide(visible) {
  if (!visible) return '';
  return `
    <svg class="onboarding-canvas-outline" data-onboarding-canvas-outline aria-hidden="true" viewBox="0 0 240 160">
      <ellipse cx="110" cy="90" rx="70" ry="38" fill="none" stroke="rgba(60,80,100,0.35)" stroke-width="3" stroke-dasharray="6 5" />
      <polygon points="180,90 210,72 210,108" fill="none" stroke="rgba(60,80,100,0.35)" stroke-width="3" stroke-linejoin="round" />
      <circle cx="92" cy="84" r="2.5" fill="rgba(60,80,100,0.45)" />
    </svg>
  `;
}
