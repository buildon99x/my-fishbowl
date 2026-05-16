import {
  getManifestEntry,
  loadEntryDataUrl,
  getNextNameWithSuffix,
  prefetchAll,
} from './catalog.js';
import { checkDebounce, markCtaSeen } from './state.js';
import { prefersReducedMotion } from '../../lib/utils.js';

function pulseCard(card, className, durationMs) {
  if (!card) return;
  card.classList.add(className);
  setTimeout(() => card.classList.remove(className), durationMs);
}

function setLoadingState(card, on) {
  if (!card) return;
  card.classList.toggle('default-objects-card--ready', on);
}

function peekModal(modal) {
  if (!modal || prefersReducedMotion()) return;
  modal.classList.add('default-objects-modal--peek');
  setTimeout(() => modal.classList.remove('default-objects-modal--peek'), 700);
}

// Module-scoped to dedupe across re-renders (state.open stays true across
// successive renderApp calls and bindDefaultObjectsEvents would otherwise
// stack a new keydown listener each time).
let activeKeyHandler = null;

function clearActiveKeyHandler() {
  if (activeKeyHandler) {
    document.removeEventListener('keydown', activeKeyHandler);
    activeKeyHandler = null;
  }
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

  if (!state.open) {
    clearActiveKeyHandler();
    return;
  }

  const modal = root.querySelector('[data-default-objects-modal]');
  if (!modal) return;

  const close = () => {
    state.open = false;
    clearActiveKeyHandler();
    render();
  };

  root.querySelector('[data-default-objects-close]')?.addEventListener('click', close);

  // Background click is intentionally disabled (child mistap protection).
  // Esc to close. Single-instance handler — replace any stale one from
  // previous render before binding so listeners don't accumulate.
  clearActiveKeyHandler();
  activeKeyHandler = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', activeKeyHandler);

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

      // Immediate (<100ms) "받음" visual feedback. Held until load resolves
      // so that cache misses don't leave the user thinking the tap was lost.
      setLoadingState(card, true);

      let spriteDataUrl;
      try {
        spriteDataUrl = await loadEntryDataUrl(entry);
      } catch (err) {
        console.warn('default-objects load failed', entry.id, err);
        setLoadingState(card, false);
        pulseCard(card, 'default-objects-card--error', 700);
        return;
      }
      setLoadingState(card, false);
      if (!spriteDataUrl) return;

      // Resolve name collision: ②/③ suffix (display) + internal (2)/(3).
      const existingNames = aquarium.fishes
        .filter((f) => !f.pendingDelete)
        .map((f) => f.name);
      const resolvedName = getNextNameWithSuffix(existingNames, entry.name);

      // Registration pulse on the card.
      pulseCard(card, 'default-objects-card--registered', 220);

      // Hand off to caller — performs addUserPropToAquarium + magic-moment +
      // sound + a synchronous renderApp so the new prop and fish-list row
      // appear immediately. After that re-render the modal DOM is fresh,
      // so peek/highlight must be applied to the post-render nodes.
      const prop = onRegisterEntry?.({
        entry,
        spriteDataUrl,
        name: resolvedName,
        cardElement: card,
      });

      const freshModal = root.querySelector('[data-default-objects-modal]') ?? modal;
      peekModal(freshModal);

      if (prop) {
        highlightFishListItem(root, prop.id);
      }
    });
  });
}
