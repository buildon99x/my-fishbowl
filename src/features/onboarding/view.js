function ghostFinger(extraClass = '') {
  // Single rounded index finger silhouette — easier for 4–6 year olds to
  // parse than the multi-finger hand the original SVG attempted.
  return `
    <svg class="onboarding-ghost-finger ${extraClass}" viewBox="0 0 48 64" aria-hidden="true">
      <ellipse cx="24" cy="58" rx="12" ry="3" fill="rgba(0,0,0,0.18)" />
      <path d="M16 50 L16 18 a8 8 0 0 1 16 0 L32 50 a8 8 0 0 1 -16 0 Z"
        fill="rgba(255,255,255,0.94)" stroke="rgba(0,0,0,0.28)" stroke-width="1.6" />
      <circle cx="24" cy="18" r="7.5" fill="rgba(255,255,255,0.94)"
        stroke="rgba(0,0,0,0.28)" stroke-width="1.6" />
    </svg>
  `;
}

function fishCaptionIcon() {
  // Replaces the text "물고기를 만들어 보세요" with a small fish icon that
  // bounces in sync with the ghost finger so meaning is carried by motion +
  // shape rather than reading ability.
  return `
    <svg class="onboarding-caption-fish" viewBox="0 0 48 28" aria-hidden="true">
      <path d="M2 14 Q12 2 26 14 Q12 26 2 14 Z"
        fill="rgba(255,200,80,0.95)" stroke="rgba(0,0,0,0.25)" stroke-width="1.4" />
      <polygon points="26,14 44,4 44,24" fill="rgba(255,200,80,0.95)"
        stroke="rgba(0,0,0,0.25)" stroke-width="1.4" />
      <circle cx="9" cy="12" r="1.6" fill="#222" />
    </svg>
  `;
}

export function renderOnboardingOverlay(state) {
  if (state.completed || state.sequence === 'done') return '';
  const seq = state.sequence;
  let inner = '';
  if (seq === 1) {
    inner = `
      <div class="onboarding-seq1-inner" data-onboarding-seq1-inner>
        <button type="button" class="onboarding-cta-plus" data-onboarding-cta aria-label="물고기 만들기">+</button>
        ${ghostFinger('is-tap')}
        ${fishCaptionIcon()}
      </div>
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
