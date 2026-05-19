import { renderFishProps } from './fish-props.js';
import { renderDecoProps } from './deco-props.js';
import { FOOD_CONFIGS, FOOD_TYPES } from '../feeding/foodConfig.js';
import { escapeHtml } from '../../lib/utils.js';
import { getFishThumbTransform } from '../../lib/fishSpriteStyle.js';

const PROP_RENDERERS = {
  fish: renderFishProps,
  deco: renderDecoProps,
};

if (import.meta.env.DEV) {
  import('./godmode-props.dev.js').then(({ renderGodModeProps }) => {
    PROP_RENDERERS.godmode = renderGodModeProps;
  });
}

function findEntityByTarget(aquarium, target, propPanelState) {
  if (import.meta.env.DEV) {
    if (target.type === 'godmode') return propPanelState?.godModeState ?? null;
  }
  return aquarium.fishes.find((f) => f.id === target.id) ?? null;
}

function positionStyle(pos) {
  if (!pos) return '';
  return ` style="left:${pos.x}px;top:${pos.y}px;right:auto;"`;
}

function renderTypeSegmented(currentType) {
  const isFish = currentType === 'fish';
  const isDeco = currentType === 'deco';
  const hint = isFish
    ? '헤엄치고 먹이를 먹어요'
    : isDeco
      ? '가만히 있어요. 배경을 꾸며요'
      : '';
  return `
    <div class="prop-panel-type-control" data-prop-type-control>
      <div class="prop-type-segmented" role="radiogroup" aria-label="종류를 골라요">
        <button
          class="prop-type-option ${isFish ? 'is-active' : ''}"
          type="button"
          role="radio"
          aria-checked="${isFish}"
          data-edit-prop-type="fish"
        >
          <span aria-hidden="true">🐟</span>
          <span>물고기</span>
        </button>
        <button
          class="prop-type-option ${isDeco ? 'is-active' : ''}"
          type="button"
          role="radio"
          aria-checked="${isDeco}"
          data-edit-prop-type="deco"
        >
          <span aria-hidden="true">🪨</span>
          <span>장식</span>
        </button>
      </div>
      <p class="prop-type-hint">${escapeHtml(hint)}</p>
    </div>
  `;
}

function renderStatusFeedback(message) {
  if (!message) return '';
  return `
    <div class="prop-panel-status" role="status" aria-live="polite" data-prop-panel-status>
      ${escapeHtml(message)}
    </div>
  `;
}

function renderPanelShell(entity, target, typeBadge, contentHtml, pos, propPanelState) {
  const isGodMode = import.meta.env.DEV && target.type === 'godmode';
  const thumbHtml = isGodMode
    ? '<span class="prop-panel-thumb-icon" aria-hidden="true">🛠️</span>'
    : `<img class="prop-panel-thumb" src="${escapeHtml(entity.imageUrl)}" alt="" width="48" height="36" style="transform: ${getFishThumbTransform(entity)};">`;
  const name = isGodMode ? 'God Mode' : escapeHtml(entity.name);
  const badgeClass = isGodMode ? 'prop-panel-badge is-dev' : 'prop-panel-badge';

  const typeControl = !isGodMode && (target.type === 'fish' || target.type === 'deco')
    ? renderTypeSegmented(target.type)
    : '';
  const statusHtml = !isGodMode ? renderStatusFeedback(propPanelState?.statusMessage) : '';

  return `
    <div class="prop-panel" role="complementary" aria-label="속성 패널"${positionStyle(pos)}>
      <div class="prop-panel-header">
        <div class="prop-panel-identity">
          ${thumbHtml}
          <div class="prop-panel-title-group">
            <span class="prop-panel-name">${name}</span>
            <span class="${badgeClass}">${typeBadge}</span>
          </div>
        </div>
        <button
          class="prop-panel-close prop-action-btn"
          type="button"
          data-close-prop-panel
          title="닫기"
          aria-label="닫기"
        >×</button>
      </div>
      <div class="prop-panel-body">
        ${typeControl}
        ${statusHtml}
        ${contentHtml}
      </div>
    </div>
  `;
}

function renderUnsupportedProp(target, pos) {
  return `
    <div class="prop-panel" role="complementary" aria-label="속성 패널"${positionStyle(pos)}>
      <div class="prop-panel-header">
        <span class="prop-panel-name">알 수 없는 타입</span>
        <button
          class="prop-panel-close prop-action-btn"
          type="button"
          data-close-prop-panel
          title="닫기"
          aria-label="닫기"
        >×</button>
      </div>
      <div class="prop-panel-body">
        <p class="prop-unsupported">지원되지 않는 타입입니다: ${escapeHtml(target.type)}</p>
      </div>
    </div>
  `;
}

export function renderPropPanel(target, aquarium, propPanelState) {
  if (!target) return '';

  const pos = propPanelState?.position ?? null;
  const renderer = PROP_RENDERERS[target.type];
  if (!renderer) return renderUnsupportedProp(target, pos);

  const entity = findEntityByTarget(aquarium, target, propPanelState);
  if (!entity) return '';

  let typeBadge;
  if (import.meta.env.DEV && target.type === 'godmode') {
    typeBadge = 'dev';
  } else if (target.type === 'deco') {
    typeBadge = '🪨 장식';
  } else if (target.type === 'fish') {
    typeBadge = '🐟 물고기';
  } else {
    typeBadge = target.type;
  }
  const contentHtml = import.meta.env.DEV && target.type === 'godmode'
    ? renderer(aquarium, entity)
    : renderer(entity);

  return renderPanelShell(entity, target, typeBadge, contentHtml, pos, propPanelState);
}

export function renderActionCluster({ feedingState, fishInputState, propPanelState, cleaningState, defaultObjectsCtaPulse }) {
  const feedActive = feedingState.feedingMode;
  const addFishActive = fishInputState.isExpanded;
  const cleanActive = cleaningState?.cleaningMode ?? false;
  const ctaPulseClass = defaultObjectsCtaPulse ? ' is-cta-pulse' : '';
  const ctaArrow = defaultObjectsCtaPulse
    ? '<span class="default-objects-cta-arrow" aria-hidden="true">↓</span>'
    : '';
  // CTA pulse now decorates the ➕ button (catalog tab opens by default).
  const addBtnClass = `prop-btn${addFishActive ? ' is-active' : ''}${ctaPulseClass}`;

  const godModeButton = import.meta.env.DEV
    ? (() => {
        const godModeActive = propPanelState.editingTarget?.type === 'godmode';
        return `
          <div class="prop-btn-wrap" data-tooltip="GodMode">
            <button
              class="prop-btn ${godModeActive ? 'is-active' : ''}"
              type="button"
              data-prop-godmode
              aria-pressed="${godModeActive}"
              aria-label="GodMode"
            >🛠️</button>
          </div>
        `;
      })()
    : '';

  return `
    <div class="prop-action-panel chrome" aria-label="액션 버튼">
      <div class="prop-btn-cluster">
        <div class="prop-btn-wrap" data-tooltip="먹이 주기">
          <div class="prop-feed-submenu ${feedActive ? 'is-visible' : ''}">
            <label class="prop-food-type-label" for="prop-food-type">Food</label>
            <select id="prop-food-type" class="prop-food-type-select" data-prop-food-type>
              ${FOOD_TYPES.map((type) => {
                const config = FOOD_CONFIGS[type];
                const selected = feedingState.selectedType === type ? 'selected' : '';
                return `<option value="${escapeHtml(type)}" ${selected}>${escapeHtml(config.label)}</option>`;
              }).join('')}
            </select>
          </div>
          <button
            class="prop-btn ${feedActive ? 'is-active' : ''}"
            type="button"
            data-prop-feed
            aria-pressed="${feedActive}"
            aria-label="먹이 주기"
          >🍖</button>
        </div>

        <div class="prop-btn-wrap" data-tooltip="오브젝트 추가">
          <button
            class="${addBtnClass}"
            type="button"
            data-prop-add-fish
            aria-pressed="${addFishActive}"
            aria-label="오브젝트 추가"
          >➕</button>
          ${ctaArrow}
        </div>

        <div class="prop-btn-wrap" data-tooltip="청소 모드">
          <button
            class="prop-btn ${cleanActive ? 'is-active' : ''}"
            type="button"
            data-prop-cleaning
            aria-pressed="${cleanActive}"
            aria-label="청소 모드"
          >🧽</button>
        </div>

        ${godModeButton}
      </div>
    </div>
  `;
}
