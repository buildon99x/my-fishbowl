import { escapeHtml } from '../../lib/utils.js';

export function renderFishProps(fish) {
  return `
    <div class="prop-panel-controls">
      <div class="prop-control-group">
        <label class="prop-control-label" for="prop-fish-name">이름</label>
        <input
          class="prop-control-input"
          id="prop-fish-name"
          type="text"
          maxlength="40"
          value="${escapeHtml(fish.name)}"
          data-edit-prop-name
        >
      </div>

      <div class="prop-control-group">
        <div class="prop-control-label-row">
          <span class="prop-control-label">크기</span>
          <span class="prop-control-value" data-prop-size-value>${fish.size}px</span>
        </div>
        <div class="prop-size-row">
          <span class="prop-size-icon" aria-hidden="true">🐠</span>
          <input
            class="prop-control-range"
            type="range"
            min="60"
            max="220"
            step="5"
            value="${fish.size}"
            data-edit-prop-size
          >
          <span class="prop-size-icon" aria-hidden="true">🐳</span>
        </div>
      </div>

      <div class="prop-control-group">
        <span class="prop-control-label">방향</span>
        <div class="prop-toggle-row" role="group" aria-label="머리 방향">
          <button
            class="prop-toggle-btn ${fish.headDirection === 'left' ? 'is-active' : ''}"
            type="button"
            data-edit-prop-head-direction="left"
            title="왼쪽으로 설정"
          >◀ 왼쪽</button>
          <button
            class="prop-toggle-btn ${fish.headDirection !== 'left' ? 'is-active' : ''}"
            type="button"
            data-edit-prop-head-direction="right"
            title="오른쪽으로 설정"
          >오른쪽 ▶</button>
        </div>
      </div>

      <div class="prop-control-group">
        <label class="prop-movement-toggle">
          <input
            class="prop-movement-checkbox"
            type="checkbox"
            ${fish.movementEnabled !== false ? 'checked' : ''}
            data-edit-prop-movement
          >
          <span class="prop-control-label">움직임 ${fish.movementEnabled !== false ? '✅' : '⬜'}</span>
        </label>
      </div>

      <div class="prop-control-group prop-action-row">
        <button class="prop-action-btn" type="button" data-flip-prop title="좌우 반전">↔️</button>
        <button class="prop-action-btn" type="button" data-flip-prop-y title="상하 반전">↕️</button>
        <button class="prop-action-btn" type="button" data-reset-prop-transform title="초기화">🔄</button>
      </div>

      <details class="prop-advanced">
        <summary class="prop-advanced-summary">▼ 고급 설정</summary>
        <div class="prop-advanced-body">
          <div class="prop-control-group">
            <div class="prop-control-label-row">
              <span class="prop-control-label">회전</span>
              <span class="prop-control-value" data-prop-rotation-value>${fish.rotation}°</span>
            </div>
            <input
              class="prop-control-range"
              type="range"
              min="-180"
              max="180"
              step="5"
              value="${fish.rotation}"
              data-edit-prop-rotation
            >
          </div>
          <div class="prop-control-group">
            <div class="prop-control-label-row">
              <span class="prop-control-label">스케일 X</span>
              <span class="prop-control-value" data-prop-scale-x-value>${fish.scaleX.toFixed(2)}</span>
            </div>
            <input
              class="prop-control-range"
              type="range"
              min="0.65"
              max="1.45"
              step="0.05"
              value="${fish.scaleX}"
              data-edit-prop-scale-x
            >
          </div>
          <div class="prop-control-group">
            <div class="prop-control-label-row">
              <span class="prop-control-label">스케일 Y</span>
              <span class="prop-control-value" data-prop-scale-y-value>${fish.scaleY.toFixed(2)}</span>
            </div>
            <input
              class="prop-control-range"
              type="range"
              min="0.65"
              max="1.45"
              step="0.05"
              value="${fish.scaleY}"
              data-edit-prop-scale-y
            >
          </div>
        </div>
      </details>
    </div>
  `;
}
