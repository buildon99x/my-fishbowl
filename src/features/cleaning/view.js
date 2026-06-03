import { t } from '../../lib/i18n.js';

export function renderCleaningProgressBar(cleaningState) {
  const pct = Math.round(cleaningState.cleaningProgress * 100);
  return `
    <div
      class="cleaning-progress-bar"
      data-cleaning-progress-bar
      role="progressbar"
      aria-label="청소 진행률"
      aria-valuenow="${pct}"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="cleaning-progress-fill" data-cleaning-progress-fill style="width:${pct}%"></div>
      <span class="cleaning-progress-label" data-cleaning-progress-label>${pct}%</span>
    </div>
  `;
}

export function renderCleaningOverlay(cleaningState) {
  // Scrub guidance: shown until the first brush stroke so a pre-literate child
  // knows what to do (icon-first, text secondary). pointer-events:none keeps it
  // purely decorative — it never intercepts the cleaning gesture.
  const hint = cleaningState.cleaned
    ? ''
    : `<div class="cleaning-hint" data-cleaning-hint aria-hidden="true">${t('cleaning.hint')}</div>`;
  return `
    <div class="cleaning-overlay" data-cleaning-overlay aria-hidden="true">
      <div class="cleaning-cursor" data-cleaning-cursor></div>
      ${hint}
      ${cleaningState.cleaned ? `<div class="cleaning-complete-message" data-cleaning-complete>${t('cleaning.done')}</div>` : ''}
    </div>
  `;
}

export function renderCleaningExitButton() {
  return `
    <button
      type="button"
      class="cleaning-exit-btn"
      data-cleaning-exit
      aria-label="청소 모드 끝내기"
    >🧽 끝내기</button>
  `;
}
