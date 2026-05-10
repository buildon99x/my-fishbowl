import { escapeHtml } from '../../lib/utils.js';

export function renderDecoProps(deco) {
  return `
    <div class="prop-panel-controls">
      <div class="prop-control-group">
        <label class="prop-control-label" for="prop-fish-name">이름</label>
        <input
          class="prop-control-input"
          id="prop-fish-name"
          type="text"
          maxlength="40"
          value="${escapeHtml(deco.name)}"
          data-edit-prop-name
        >
      </div>

      <div class="prop-control-group">
        <div class="prop-control-label-row">
          <span class="prop-control-label">크기</span>
          <span class="prop-control-value" data-prop-size-value>${deco.size}px</span>
        </div>
        <div class="prop-size-row">
          <span class="prop-size-icon" aria-hidden="true">🪨</span>
          <input
            class="prop-control-range"
            type="range"
            min="60"
            max="260"
            step="5"
            value="${deco.size}"
            data-edit-prop-size
          >
          <span class="prop-size-icon" aria-hidden="true">🌿</span>
        </div>
      </div>

      <p class="prop-deco-note">장식은 가만히 있어요. 끌어서 자리를 옮길 수 있어요.</p>

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
              <span class="prop-control-value" data-prop-rotation-value>${deco.rotation}°</span>
            </div>
            <input
              class="prop-control-range"
              type="range"
              min="-180"
              max="180"
              step="5"
              value="${deco.rotation}"
              data-edit-prop-rotation
            >
          </div>
          <div class="prop-control-group">
            <div class="prop-control-label-row">
              <span class="prop-control-label">스케일 X</span>
              <span class="prop-control-value" data-prop-scale-x-value>${deco.scaleX.toFixed(2)}</span>
            </div>
            <input
              class="prop-control-range"
              type="range"
              min="0.65"
              max="1.45"
              step="0.05"
              value="${deco.scaleX}"
              data-edit-prop-scale-x
            >
          </div>
          <div class="prop-control-group">
            <div class="prop-control-label-row">
              <span class="prop-control-label">스케일 Y</span>
              <span class="prop-control-value" data-prop-scale-y-value>${deco.scaleY.toFixed(2)}</span>
            </div>
            <input
              class="prop-control-range"
              type="range"
              min="0.65"
              max="1.45"
              step="0.05"
              value="${deco.scaleY}"
              data-edit-prop-scale-y
            >
          </div>
        </div>
      </details>
    </div>
  `;
}
