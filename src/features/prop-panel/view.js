import { renderFishProps } from './fish-props.js';
import { FOOD_CONFIGS, FOOD_TYPES } from '../feeding/foodConfig.js';
import { escapeHtml } from '../../lib/utils.js';
import { getFishThumbTransform } from '../../lib/fishSpriteStyle.js';

const PROP_RENDERERS = {
  fish: renderFishProps,
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

function renderPanelShell(entity, target, typeBadge, contentHtml, pos) {
  const isGodMode = import.meta.env.DEV && target.type === 'godmode';
  const thumbHtml = isGodMode
    ? '<span class="prop-panel-thumb-icon" aria-hidden="true">🛠️</span>'
    : `<img class="prop-panel-thumb" src="${escapeHtml(entity.imageUrl)}" alt="" width="48" height="36" style="transform: ${getFishThumbTransform(entity)};">`;
  const name = isGodMode ? 'God Mode' : escapeHtml(entity.name);
  const badgeClass = isGodMode ? 'prop-panel-badge is-dev' : 'prop-panel-badge';

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
        >❌</button>
      </div>
      <div class="prop-panel-body">
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
        >❌</button>
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

  const typeBadge = import.meta.env.DEV && target.type === 'godmode' ? 'dev' : target.type;
  const contentHtml = import.meta.env.DEV && target.type === 'godmode'
    ? renderer(aquarium, entity)
    : renderer(entity);

  return renderPanelShell(entity, target, typeBadge, contentHtml, pos);
}

export function renderActionCluster({ feedingState, fishInputState, propPanelState, cleaningState }) {
  const feedActive = feedingState.feedingMode;
  const addFishActive = fishInputState.isExpanded;
  const cleanActive = cleaningState?.cleaningMode ?? false;

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
    <div class="prop-action-panel" aria-label="액션 버튼">
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

        <div class="prop-btn-wrap" data-tooltip="물고기 추가">
          <button
            class="prop-btn ${addFishActive ? 'is-active' : ''}"
            type="button"
            data-prop-add-fish
            aria-pressed="${addFishActive}"
            aria-label="물고기 추가"
          >🐠</button>
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
