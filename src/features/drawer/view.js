import { escapeHtml } from '../../lib/utils.js';

export function renderMenuButton() {
  return `
    <button
      type="button"
      class="drawer-menu-btn chrome"
      data-drawer-open
      data-self-sound
      aria-label="메뉴 열기"
      aria-controls="app-drawer"
    >☰</button>
  `;
}

export function renderDrawer({ open, aquariumName, statusHtml }) {
  return `
    <div class="drawer-root ${open ? 'is-open' : ''}" data-drawer-root>
      <div class="drawer-backdrop" data-drawer-backdrop aria-hidden="${open ? 'false' : 'true'}"></div>
      <aside
        id="app-drawer"
        class="drawer-panel"
        role="dialog"
        aria-modal="${open ? 'true' : 'false'}"
        aria-label="어항 메뉴"
        ${open ? '' : 'inert'}
      >
        <header class="drawer-header">
          <div class="drawer-title-group">
            <p class="eyebrow">My Fishbowl</p>
            <h1 class="drawer-title">${escapeHtml(aquariumName)}</h1>
          </div>
          <button
            type="button"
            class="drawer-close-btn"
            data-drawer-close
            data-self-sound
            aria-label="메뉴 닫기"
          >×</button>
        </header>
        <div class="drawer-body">
          ${statusHtml}
          <div class="drawer-section drawer-section-help">
            <button
              type="button"
              class="drawer-help-link"
              data-onboarding-help
              aria-label="도움말 다시 보기"
            >❓ 도움말 다시 보기</button>
          </div>
        </div>
      </aside>
    </div>
  `;
}
