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
  return `
    <div class="cleaning-overlay" data-cleaning-overlay aria-hidden="true">
      <div class="cleaning-cursor" data-cleaning-cursor></div>
      ${cleaningState.cleaned ? '<div class="cleaning-complete-message" data-cleaning-complete>✨ 청소 완료!</div>' : ''}
    </div>
  `;
}
