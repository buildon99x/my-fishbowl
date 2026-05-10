import {
  getManifestEntry,
  loadEntryDataUrl,
  getNextNameWithSuffix,
  prefetchAll,
} from './catalog.js';
import { checkDebounce, markCtaSeen } from './state.js';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function pulseCard(card, className, durationMs) {
  if (!card) return;
  card.classList.add(className);
  setTimeout(() => card.classList.remove(className), durationMs);
}

function peekModal(modal) {
  if (!modal || prefersReducedMotion()) return;
  modal.classList.add('default-objects-modal--peek');
  setTimeout(() => modal.classList.remove('default-objects-modal--peek'), 700);
}

function highlightFishListItem(root, propId) {
  if (!root) return;
  // Defer to next frame so the new fish-list DOM exists.
  requestAnimationFrame(() => {
    const item = root.querySelector(`[data-fish-id="${propId}"]`);
    if (!item) return;
    item.classList.add('fish-list-item--just-added');
    setTimeout(() => item.classList.remove('fish-list-item--just-added'), 1200);
  });
}

export function bindDefaultObjectsEvents(root, ctx) {
  const {
    state,
    appState,
    aquarium,
    render,
    onRegisterEntry,
  } = ctx;

  const entryButton = root.querySelector('[data-prop-default-objects]');
  if (entryButton) {
    entryButton.addEventListener('click', () => {
      state.open = true;
      markCtaSeen();
      prefetchAll();
      render();
    });
  }

  if (!state.open) return;

  const modal = root.querySelector('[data-default-objects-modal]');
  if (!modal) return;

  const close = () => {
    state.open = false;
    render();
  };

  root.querySelector('[data-default-objects-close]')?.addEventListener('click', close);

  // Background click is intentionally disabled (child mistap protection).
  // Esc to close.
  const onKey = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);

  // Focus first card for keyboard users.
  const firstCard = modal.querySelector('[data-default-object-id]');
  firstCard?.focus?.();

  modal.querySelectorAll('[data-default-object-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      const id = card.getAttribute('data-default-object-id');
      const entry = getManifestEntry(id);
      if (!entry) return;
      const now = performance.now();
      if (!checkDebounce(state, id, now)) {
        pulseCard(card, 'default-objects-card--debounce-pulse', 200);
        return;
      }

      // Immediate (<100ms) "받음" visual feedback.
      pulseCard(card, 'default-objects-card--ready', 220);

      // Load (cache hit returns immediately).
      let spriteDataUrl;
      try {
        spriteDataUrl = await loadEntryDataUrl(entry);
      } catch (err) {
        console.warn('default-objects load failed', entry.id, err);
        pulseCard(card, 'default-objects-card--error', 700);
        return;
      }
      if (!spriteDataUrl) return;

      // Resolve name collision: ②/③ suffix (display) + internal (2)/(3).
      const existingNames = aquarium.fishes
        .filter((f) => !f.pendingDelete)
        .map((f) => f.name);
      const resolvedName = getNextNameWithSuffix(existingNames, entry.name);

      // Registration pulse on the card.
      pulseCard(card, 'default-objects-card--registered', 220);

      // Modal peek motion to reveal the aquarium.
      peekModal(modal);

      // Hand off to caller — performs addUserPropToAquarium + magic-moment + sound.
      const prop = onRegisterEntry?.({
        entry,
        spriteDataUrl,
        name: resolvedName,
        cardElement: card,
      });

      if (prop) {
        // Re-bind on next render; meanwhile, queue fish-list highlight.
        highlightFishListItem(appState?.appRoot ?? root, prop.id);
      }
    });
  });
}
