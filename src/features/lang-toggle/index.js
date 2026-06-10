import { setLang, getCurrentLang } from '../../lib/i18n.js';

export { renderLangToggle } from './view.js';

export function bindLangToggle(root, { render } = {}) {
  const btn = root.querySelector('[data-lang-toggle]');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const next = getCurrentLang() === 'ko' ? 'en' : 'ko';
    try {
      await setLang(next);
    } catch { /* keep current language on failure */ }
    render?.();
  });
}
