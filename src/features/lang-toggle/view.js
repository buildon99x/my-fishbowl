import { t } from '../../lib/i18n.js';

export function renderLangToggle() {
  return `
    <button
      type="button"
      class="lang-toggle chrome"
      data-lang-toggle
      aria-label="${t('lang.toggle.label')}"
      title="한국어 / English"
    >🌐</button>
  `;
}
