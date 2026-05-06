export function renderGodModeProps(aquarium, godModeState) {
  const { thresholds } = godModeState;

  return `
    <div class="prop-panel-controls">
      <div class="prop-control-group">
        <label class="prop-control-label-row" for="prop-threshold-light">
          <span class="prop-control-label">🌱 light (시간)</span>
        </label>
        <input
          class="prop-control-number"
          id="prop-threshold-light"
          type="number"
          min="0"
          step="1"
          value="${thresholds.light}"
          data-edit-prop-threshold-light
        >
      </div>
      <div class="prop-control-group">
        <label class="prop-control-label-row" for="prop-threshold-medium">
          <span class="prop-control-label">🌿 medium (시간)</span>
        </label>
        <input
          class="prop-control-number"
          id="prop-threshold-medium"
          type="number"
          min="0"
          step="1"
          value="${thresholds.medium}"
          data-edit-prop-threshold-medium
        >
      </div>
      <div class="prop-control-group">
        <label class="prop-control-label-row" for="prop-threshold-heavy">
          <span class="prop-control-label">🌳 heavy (시간)</span>
        </label>
        <input
          class="prop-control-number"
          id="prop-threshold-heavy"
          type="number"
          min="0"
          step="1"
          value="${thresholds.heavy}"
          data-edit-prop-threshold-heavy
        >
      </div>
      <div class="prop-control-group prop-action-row">
        <button class="prop-action-btn" type="button" data-reset-prop-thresholds title="기본값 복원">🔄</button>
      </div>
    </div>
  `;
}
