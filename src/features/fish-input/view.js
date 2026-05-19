import { escapeHtml } from '../../lib/utils.js';

const STATUS_TEXT = {
  idle: '이미지를 고르거나 직접 그려 보세요.',
  preview: '미리보기가 준비됐어요.',
  invalid: '이 파일은 등록할 수 없어요.',
};

function positionStyle(pos) {
  if (!pos) return '';
  return ` style="left:${pos.x}px;top:${pos.y}px;right:auto;bottom:auto;"`;
}

export function renderFishInputPanel(state) {
  if (!state.isExpanded) {
    return '';
  }

  const hasSprite = Boolean(state.spriteDataUrl);
  const canRegister = hasSprite && state.status !== 'invalid';
  const statusMessage = state.message || STATUS_TEXT[state.status] || STATUS_TEXT.idle;
  const type = state.type === 'deco' ? 'deco' : 'fish';
  const isFish = type === 'fish';
  const nameLabel = isFish ? '물고기 이름' : '장식 이름';
  const namePlaceholder = isFish ? '예: 노랑이' : '예: 동그란 돌';
  const typeBadgeIcon = isFish ? '🐟' : '🪨';
  const typeBadgeText = isFish ? '물고기' : '장식';
  const typeHint = isFish
    ? '헤엄치고 먹이를 먹어요'
    : '가만히 있어요. 배경을 꾸며요';

  return `
    <section class="fish-input-widget" aria-labelledby="fish-input-title"${positionStyle(state.position)}>
      <div class="prop-panel-header" data-fish-input-drag-handle>
        <div class="prop-panel-identity">
          <span class="prop-panel-thumb-icon" aria-hidden="true">➕</span>
          <div class="prop-panel-title-group">
            <span id="fish-input-title" class="prop-panel-name">오브젝트 추가</span>
          </div>
        </div>
        <button class="prop-action-btn" type="button" data-toggle-fish-input aria-label="닫기" title="닫기">×</button>
      </div>

      <div class="fish-input-panel">
        <div class="fish-input-status" aria-live="polite">
          <p>${escapeHtml(statusMessage)}</p>
        </div>

        <div class="prop-type-segmented" role="radiogroup" aria-label="종류를 골라요" data-fish-prop-type-group>
          <button
            class="prop-type-option ${isFish ? 'is-active' : ''}"
            type="button"
            role="radio"
            aria-checked="${isFish}"
            data-fish-prop-type="fish"
          >
            <span aria-hidden="true">🐟</span>
            <span>물고기</span>
          </button>
          <button
            class="prop-type-option ${!isFish ? 'is-active' : ''}"
            type="button"
            role="radio"
            aria-checked="${!isFish}"
            data-fish-prop-type="deco"
          >
            <span aria-hidden="true">🪨</span>
            <span>장식</span>
          </button>
        </div>
        <p class="prop-type-hint" data-fish-prop-type-hint>${escapeHtml(typeHint)}</p>

        <div class="fish-input-grid">
          <div class="input-group">
            <label class="input-label" for="fish-file">이미지 파일</label>
            <input id="fish-file" class="file-input" type="file" accept="image/png,image/jpeg,image/webp" data-fish-file>
          </div>

          <div class="input-group">
            <label class="input-label" for="fish-name" data-fish-name-label>${escapeHtml(nameLabel)}</label>
            <input
              id="fish-name"
              class="text-input"
              type="text"
              value="${escapeHtml(state.name)}"
              maxlength="32"
              placeholder="${escapeHtml(namePlaceholder)}"
              data-fish-name
            >
          </div>

          ${
            isFish
              ? `
          <div class="input-group" data-fish-movement-group>
            <label class="input-label" for="fish-movement">움직임</label>
            <select id="fish-movement" class="select-input" data-fish-movement>
              <option value="on" ${state.movementEnabled === false ? '' : 'selected'}>켜기</option>
              <option value="off" ${state.movementEnabled === false ? 'selected' : ''}>끄기</option>
            </select>
          </div>
          `
              : ''
          }

          <div class="draw-area">
            <div class="draw-toolbar">
              <span>그리기</span>
              <div class="draw-toolbar-actions">
                <button class="button button-primary fish-input-register-btn" type="button" data-register-fish-image ${canRegister ? '' : 'disabled'}>
                  등록
                </button>
                <button class="button button-secondary" type="button" data-clear-drawing>지우기</button>
              </div>
            </div>
            <canvas
              class="fish-drawing-canvas"
              width="480"
              height="320"
              data-fish-canvas
              aria-label="오브젝트 그리기"
            ></canvas>
          </div>

          <div class="preview-area" data-status="${state.status}" data-prop-type="${type}">
            <span class="preview-label">미리보기</span>
            <span class="preview-type-badge" data-prop-type-badge>${typeBadgeIcon} ${typeBadgeText}</span>
            ${
              hasSprite
                ? `<img class="fish-preview-image" src="${state.spriteDataUrl}" alt="오브젝트 미리보기">`
                : '<span class="preview-empty">아직 이미지가 없어요</span>'
            }
          </div>
        </div>
      </div>
    </section>
  `;
}
