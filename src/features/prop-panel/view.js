export function renderPropPanel({ feedingState, fishInputState, propPanelState, aquarium, isDev }) {
  const feedActive = feedingState.feedingMode;
  const addFishActive = fishInputState.isExpanded;
  const cleanActive = propPanelState.cleaningMode;
  const godOpen = propPanelState.godModeOpen;

  const godModeButton = isDev
    ? `
      <div class="prop-btn-wrap" data-tooltip="GodMode">
        <button
          class="prop-btn ${godOpen ? 'is-active' : ''}"
          type="button"
          data-prop-godmode
          aria-pressed="${godOpen}"
          aria-label="GodMode"
        >⚙️</button>
      </div>
    `
    : '';

  const godModePanel = isDev && godOpen
    ? `
      <div class="prop-godmode-panel" role="region" aria-label="GodMode">
        <p class="prop-godmode-title">GodMode</p>
        <dl class="prop-godmode-list">
          <div>
            <dt>물고기</dt>
            <dd>${aquarium.fishes.length}마리</dd>
          </div>
          <div>
            <dt>청결도</dt>
            <dd>${aquarium.cleanliness}%</dd>
          </div>
          <div>
            <dt>이끼</dt>
            <dd>Lv.${aquarium.algaeLevel}</dd>
          </div>
          <div>
            <dt>청소 모드</dt>
            <dd>${cleanActive ? 'ON' : 'OFF'}</dd>
          </div>
        </dl>
      </div>
    `
    : '';

  return `
    <div class="prop-panel" aria-label="액션 버튼">
      ${godModePanel}
      <div class="prop-btn-cluster">
        <div class="prop-btn-wrap" data-tooltip="먹이 주기">
          <div class="prop-feed-submenu ${feedActive ? 'is-visible' : ''}">
            <label class="prop-food-type-label" for="prop-food-type">Food</label>
            <select id="prop-food-type" class="prop-food-type-select" data-prop-food-type>
              <option value="basic" ${feedingState.selectedType === 'basic' ? 'selected' : ''}>Basic</option>
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
          >🧹</button>
        </div>

        ${godModeButton}
      </div>
    </div>
  `;
}
