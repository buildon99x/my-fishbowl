export function renderSoundModal() {
  return `
    <div class="sound-modal-backdrop" data-sound-modal>
      <div class="sound-modal" role="dialog" aria-labelledby="sound-modal-title">
        <div class="sound-modal__icon" aria-hidden="true">🔊</div>
        <h2 id="sound-modal-title" class="sound-modal__title">소리를 켤까요?</h2>
        <p class="sound-modal__desc">물고기가 더 즐거워해요</p>
        <div class="sound-modal__actions">
          <button type="button" class="sound-modal__primary" data-sound-action="enable">
            🔊 소리 켜기
          </button>
          <button type="button" class="sound-modal__secondary" data-sound-action="later">
            🤫 나중에
          </button>
        </div>
        <button type="button" class="sound-modal__preview" data-sound-action="preview" aria-label="미리듣기">
          미리듣기
        </button>
      </div>
    </div>
  `;
}

export function renderMuteToggle(masterEnabled) {
  const icon = masterEnabled ? '🔊' : '🔇';
  const label = masterEnabled ? '소리 끄기' : '소리 켜기';
  return `
    <button
      type="button"
      class="sound-mute-toggle"
      data-sound-mute-toggle
      aria-label="${label}"
      aria-pressed="${masterEnabled}"
    >${icon}</button>
  `;
}
