import { escapeHtml } from '../../lib/utils.js';
import { renderDefaultObjectsCatalog } from '../default-objects/view.js';

const STATUS_TEXT = {
  idle: '이미지를 고르거나 직접 그려 보세요.',
  preview: '미리보기가 준비됐어요.',
  invalid: '이 파일은 등록할 수 없어요.',
};

function renderCreateTab(state) {
  const hasSprite = Boolean(state.spriteDataUrl);
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
            <button class="button button-secondary" type="button" data-clear-drawing>지우기</button>
          </div>
        </div>
        <canvas
          class="fish-drawing-canvas"
          width="720"
          height="480"
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
  `;
}

export function renderFishInputPanel(state) {
  if (!state.isExpanded) {
    return '';
  }

  const stage = state.sheetStage === 'full' ? 'full' : 'peek';
  const hasSprite = Boolean(state.spriteDataUrl);
  const canRegister = hasSprite && state.status !== 'invalid';
  const activeTab = state.activeTab === 'create' ? 'create' : 'catalog';
  const isCreate = activeTab === 'create';

  return `
    <div class="fish-input-backdrop" data-fish-input-backdrop aria-hidden="true"></div>
    <section
      class="fish-input-widget bottom-sheet"
      data-sheet-stage="${stage}"
      data-active-tab="${activeTab}"
      aria-labelledby="fish-input-title"
      role="dialog"
      aria-modal="false"
    >
      <button
        type="button"
        class="bottom-sheet-grabber"
        data-fish-input-grabber
        aria-label="시트 펼치기/접기"
      >
        <span class="bottom-sheet-grabber-bar" aria-hidden="true"></span>
      </button>

      <header class="bottom-sheet-header">
        <div class="prop-panel-identity">
          <span class="prop-panel-thumb-icon" aria-hidden="true">➕</span>
          <div class="prop-panel-title-group">
            <span id="fish-input-title" class="prop-panel-name">오브젝트 추가</span>
          </div>
        </div>
        <button class="prop-action-btn" type="button" data-toggle-fish-input aria-label="닫기" title="닫기">×</button>
      </header>

      <div class="fish-input-tabs" role="tablist" aria-label="추가 방식">
        <button
          type="button"
          class="fish-input-tab ${!isCreate ? 'is-active' : ''}"
          role="tab"
          aria-selected="${!isCreate}"
          data-fish-input-tab="catalog"
        >🎁 카탈로그</button>
        <button
          type="button"
          class="fish-input-tab ${isCreate ? 'is-active' : ''}"
          role="tab"
          aria-selected="${isCreate}"
          data-fish-input-tab="create"
        >✏️ 직접 만들기</button>
      </div>

      <div class="bottom-sheet-body fish-input-panel">
        ${isCreate ? renderCreateTab(state) : renderDefaultObjectsCatalog()}
      </div>

      <footer class="bottom-sheet-footer">
        ${
          isCreate
            ? `<button
                class="button button-primary fish-input-register-btn"
                type="button"
                data-register-fish-image
                ${canRegister ? '' : 'disabled'}
              >등록</button>`
            : '<p class="fish-input-footer-hint">원하는 카드를 탭하면 어항에 들어가요.</p>'
        }
      </footer>
    </section>
  `;
}
